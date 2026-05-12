import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, phoneToEmail } from "@/lib/phone";
import { upsertMemberAppProfile } from "@/lib/member-app-profile";

// Self-signup linked-by-phone flow.
//
// Reception/dashboard creates a member first (full_name, phone,
// subscription). Later the same person signs up in the app with the
// same phone. Phone is the only identity key; full_name is display
// context and must never block or drive linking. The dashboard
// member/subscription remains the source of truth.
//
// If no matching dashboard member exists, we create a fresh `player`
// row with status='active' but NO subscription — the portal will
// render "Not subscribed" until reception attaches one.

const SignupSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(50, "الاسم طويل جداً"),
  phone:     z.string().trim().min(7, "رقم الهاتف غير صالح").max(20, "رقم الهاتف طويل جداً"),
  password:  z.string().min(1, "كلمة المرور مطلوبة").max(128, "كلمة المرور طويلة جداً"),
});

export async function POST(request: Request) {
  // ── Rate limit ─────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // ── Validate ───────────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }); }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { full_name, phone, password } = parsed.data;
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) {
    return NextResponse.json({ success: false, error: "رقم الهاتف غير صالح" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // The name doubles as the login identifier — must be globally unique
  // (case-insensitive via idx_members_username_ci). Friendly Arabic
  // error instead of letting Postgres throw.
  const { data: usernameMatch } = await supabase
    .from("members")
    .select("id")
    .ilike("username", full_name)
    .limit(1)
    .maybeSingle();
  if (usernameMatch) {
    return NextResponse.json(
      { success: false, error: "هذا الاسم مستخدم. اختر اسماً مختلفاً." },
      { status: 409 },
    );
  }
  // We store the same string in both full_name (display) and username
  // (login). Going forward the only difference is what they're indexed
  // for — uniqueness vs free-text display.
  const username = full_name;

  // Phone is the unique identity key. Fetch two rows so legacy duplicate
  // phones block auto-linking without exposing any subscription data.
  const { data: phoneMatches, error: lookupError } = await supabase
    .from("members")
    .select("id, auth_id")
    .eq("role", "player")
    .eq("phone_normalized", phoneNormalized)
    .limit(2);

  if (lookupError) {
    // Surface the underlying Postgres error so production failures are
    // debuggable from the Vercel function log + the response body.
    console.error("[signup] members lookup failed:", lookupError);
    return NextResponse.json(
      { success: false, error: "تعذّر التحقق من بيانات العضوية.", debug: lookupError.message },
      { status: 500 },
    );
  }

  const matchingMembers = phoneMatches ?? [];

  if (matchingMembers.length > 1) {
    return NextResponse.json(
      { success: false, error: "Duplicate phone number found, staff must fix" },
      { status: 409 },
    );
  }

  const existing = matchingMembers[0] ?? null;

  if (existing?.auth_id) {
    return NextResponse.json(
      { success: false, error: "هذا الرقم لديه حساب بالفعل. سجّل الدخول بدلاً من ذلك." },
      { status: 409 },
    );
  }

  // ── Create the auth user ───────────────────────────────────────
  // Phone-derived email keeps logins consistent with the staff flow
  // (same internal email format works across both surfaces).
  const internalEmail = phoneToEmail(phone);

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email:         internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: phoneNormalized },
  });

  if (authError || !authResult?.user) {
    // Most likely cause: an auth.users row with the same email already
    // exists (someone tried to sign up under this phone before but the
    // members insert failed). Surface a clean message.
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الحساب. حاول مرة أخرى." },
      { status: 400 },
    );
  }

  const authId = authResult.user.id;

  // ── Link to existing member, or create a fresh one ─────────────
  let linked = false;
  let memberId: string;

  if (existing) {
    // Dashboard already created this person; just bind auth_id + username.
    const { data: linkedRows, error: linkErr } = await supabase
      .from("members")
      .update({ auth_id: authId, username })
      .eq("id", existing.id)
      .is("auth_id", null)
      .select("id");

    if (linkErr || !linkedRows?.length) {
      // Roll back auth user so retries aren't blocked by an orphan row
      await supabase.auth.admin.deleteUser(authId);
      return NextResponse.json(
        { success: false, error: "تعذّر ربط الحساب بالعضوية الحالية." },
        { status: 500 },
      );
    }

    memberId = existing.id;
    linked   = true;
  } else {
    // No dashboard match → fresh player row. status='active' only marks
    // the member record itself as live; the portal renders "Not
    // subscribed" until a row is attached to the subscriptions table.
    // Insert only the columns guaranteed to exist on every project the
    // app might be deployed against. The plaintext-password mirror in
    // members.temporary_password is a *nice-to-have* for admin support
    // (so they can see what self-signup users chose) — but it isn't
    // load-bearing: real auth uses auth.users.encrypted_password.
    // Skipping it here means the route works whether the project has
    // run migration 014 (temporary_password) or not. Staff seeders set
    // it explicitly via SQL, so admin visibility into staff temps is
    // unaffected.
    const { data: inserted, error: insErr } = await supabase
      .from("members")
      .insert({
        auth_id:            authId,
        role:               "player",
        full_name,
        phone,                          // trigger fills phone_normalized when present
        username,
        status:             "active",
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      await supabase.auth.admin.deleteUser(authId);
      return NextResponse.json(
        { success: false, error: "تعذّر إنشاء الملف الشخصي." },
        { status: 500 },
      );
    }
    memberId = inserted.id;
  }

  const appProfile = await upsertMemberAppProfile(supabase, authId, memberId, {
    full_name,
    phone,
    onboarding_complete: false,
    illnesses: [],
    injuries: [],
  });

  return NextResponse.json({
    success: true,
    data: {
      user_id:   authId,
      member_id: memberId,
      email:     internalEmail,
      linked,
      app_profile_saved: Boolean(appProfile),
      app_profile_migration_required: !appProfile,
    },
  });
}
