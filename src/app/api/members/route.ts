import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { generateUniqueActivationCode } from "@/lib/activation-code";
import type { ApiResponse } from "@/types";

const GYM_SUBSCRIPTION_PLAN_TYPE: Record<"monthly" | "quarterly" | "annual", string> = {
  monthly:   "1_month",
  quarterly: "3_month",
  annual:    "12_month",
};

const MIN_PRICE = 1;

const AddMemberSchema = z.object({
  full_name:  z.string().min(2, "Name must be at least 2 characters").max(100),
  phone:      z.string().min(7, "Phone number too short").max(20).regex(/^\+?[\d\s\-()\u0660-\u0669\u06F0-\u06F9]+$/, "Invalid phone number"),
  password:   z.string().min(1, "Password required").max(128, "Password too long"),
  goals:      z.string().max(500).optional(),
  plan_type:  z.enum(["monthly", "quarterly", "annual"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  price:      z.number().min(MIN_PRICE, `Price must be at least ${MIN_PRICE}`).max(100_000),
}).refine(
  (d) => new Date(d.end_date) > new Date(d.start_date),
  { message: "End date must be after start date", path: ["end_date"] },
);

// ── POST /api/members — manager + reception only ──────────────
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "reception"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = AddMemberSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { full_name, phone, password, goals, plan_type, start_date, end_date, price } = result.data;
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Invalid phone number" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Deduplicate by normalized phone — catches different formats of the
  // same number (0912…, +96391…, 96391…) and matches the partial unique
  // index on members.phone_normalized for role='player'.
  const { data: phoneMatches, error: phoneLookupError } = await supabase
    .from("members")
    .select("id")
    .eq("phone_normalized", phoneNormalized)
    .limit(2);

  if (phoneLookupError) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to verify phone number" },
      { status: 500 },
    );
  }

  if ((phoneMatches?.length ?? 0) > 0) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "A member with this phone number already exists" },
      { status: 409 },
    );
  }

  // Create the auth.users row first so the member can log in immediately
  // with the password reception just typed. Same internal-email shape
  // as /api/auth/signup so phone-derived logins are consistent.
  const internalEmail = phoneToEmail(phone);
  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email:         internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: phoneNormalized },
  });

  if (authError || !authResult?.user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create login account" },
      { status: 500 },
    );
  }

  const authId = authResult.user.id;

  // Skip temporary_password (see note in /api/auth/signup) so the
  // route works even when deployed against a project that hasn't had
  // migration 014 applied yet.
  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      auth_id:            authId,
      full_name,
      phone,                          // trigger fills phone_normalized when present
      goals:              goals ?? null,
      role:               "player",
      status:             "active",
    })
    .select()
    .single();

  if (memberError || !member) {
    // Roll back auth user so retries aren't blocked by an orphan login
    await supabase.auth.admin.deleteUser(authId);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create member" }, { status: 500 });
  }

  const { error: subError } = await supabase.from("subscriptions").insert({
    member_id: member.id,
    plan_type,
    start_date,
    end_date,
    status: "active",
    price,
  });

  if (subError) {
    await supabase.from("members").delete().eq("id", member.id);
    await supabase.auth.admin.deleteUser(authId);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create subscription" }, { status: 500 });
  }

  // Mirror the subscription into gym_subscriptions, which is the canonical
  // table the reception dashboard, coach eligibility, and activation flow
  // all read from. Borrow created_by from an existing row to satisfy the
  // FK to public.profiles(id) — the dashboard's staff table that this app
  // does not write to. If gym_subscriptions is empty we leave created_by
  // null and rely on the column being nullable in that environment.
  const { data: refRow } = await supabase
    .from("gym_subscriptions")
    .select("created_by")
    .not("created_by", "is", null)
    .limit(1)
    .maybeSingle();

  let activationCode: string | null = null;
  try {
    activationCode = await generateUniqueActivationCode(supabase);
  } catch {
    // Falling back to null here is safe because the partial unique index
    // skips NULL rows. The reception list will simply show "—" until the
    // next backfill/manual fix.
  }

  const { error: gymError } = await supabase.from("gym_subscriptions").insert({
    member_id:      member.id,
    member_name:    full_name,
    phone,
    plan_type:      GYM_SUBSCRIPTION_PLAN_TYPE[plan_type],
    start_date,
    end_date,
    status:         "active",
    amount:         price,
    paid_amount:    price,
    payment_status: "paid",
    payment_method: "cash",
    currency:       "usd",
    activation_code: activationCode,
    created_by:      refRow?.created_by ?? null,
  });

  if (gymError) {
    // The legacy `subscriptions` row was created successfully — we leave it
    // in place rather than rolling back the auth/member creation, because
    // the cron job and legacy admin pages still rely on it. Surface the
    // gym_subscriptions failure to the caller so reception sees it.
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Member created but gym subscription failed: ${gymError.message}` },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id:    ctx.memberId,
    action:      "member.create",
    target_id:   member.id,
    target_type: "member",
    meta: { full_name, phone, plan_type, activation_code: activationCode },
  }).then(() => {});

  return NextResponse.json<ApiResponse<{ id: string; email: string; activation_code: string | null }>>(
    { success: true, data: { id: member.id, email: internalEmail, activation_code: activationCode } },
    { status: 201 },
  );
}

// ── GET /api/members — manager + reception + coach ────────────
export async function GET() {
  const { ctx, error } = await requireAuth(["manager", "reception", "coach", "admin", "head_coach"]);
  if (error) return error;

  const supabase = createServiceClient();
  const selectFields = ctx.role === "reception"
    ? "id, full_name, phone, goals, status, role, created_at, subscription:member_subscriptions(*)"
    : "*, subscription:member_subscriptions(*)";
  const { data, error: dbError } = await supabase
    .from("members")
    .select(selectFields)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
