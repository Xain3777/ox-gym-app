import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { isActivationCodeShape } from "@/lib/activation-code";
import { upsertMemberAppProfile } from "@/lib/member-app-profile";

const ActivateSchema = z.object({
  code: z.string().trim().toUpperCase(),
});

// GET — check whether the current user is already activated, and return
// the full subscription card payload so the portal home doesn't need a
// second query.
//
// Auth: any signed-in user. Role gating used to require "player" but
// signup may bind the new auth account to a pre-existing dashboard
// members row whose role isn't player, producing false 403s — and the
// activation code is the actual security boundary anyway.
export async function GET() {
  const { ctx, error } = await requireAuth();
  if (error) return error;

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("gym_subscriptions")
    .select(
      "id, activation_code, plan_type, status, start_date, end_date, price, member_name, phone, activated_at",
    )
    .eq("activated_user_id", ctx.userId)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    data: {
      activated: Boolean(row),
      subscription: row
        ? {
            id: row.id,
            activation_code: row.activation_code,
            plan_type: row.plan_type,
            status: row.status,
            start_date: row.start_date,
            end_date: row.end_date,
            price: row.price,
            member_name: row.member_name,
            phone: row.phone,
            activated_at: row.activated_at,
          }
        : null,
    },
  });
}

// POST — claim an activation code for the current signed-in user.
//
// Auth: any signed-in user. CSRF check intentionally skipped — the
// activation code is a single-use 26-bit secret printed on a paper at
// reception, and any user with that code (and a valid session cookie)
// should be able to claim it once.
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Activation code is required" },
      { status: 400 },
    );
  }

  const code = parsed.data.code;
  if (!isActivationCodeShape(code)) {
    return NextResponse.json(
      { success: false, error: "Activation code format is invalid", code: "INVALID_FORMAT" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Look up the row by code FIRST. The previous "do you have any prior
  // activation" shortcut returned success without inspecting the
  // submitted code, so any user with a stale prior claim got fake
  // success on every subsequent submit and gym_subscriptions never
  // updated. Code-first lookup keeps idempotency for the SAME code
  // while letting users claim a different one.
  const { data: sub, error: lookupError } = await supabase
    .from("gym_subscriptions")
    .select(
      "id, member_id, member_name, phone, status, end_date, start_date, plan_type, activated_user_id, activated_at",
    )
    .eq("activation_code", code)
    .maybeSingle();

  if (lookupError) {
    console.error("[activate] code lookup failed:", lookupError);
    return NextResponse.json(
      { success: false, error: "Failed to verify activation code", debug: lookupError.message },
      { status: 500 },
    );
  }

  if (!sub) {
    return NextResponse.json(
      { success: false, error: "Activation code not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Already claimed by THIS user → idempotent success.
  if (sub.activated_user_id === ctx.userId) {
    return NextResponse.json({
      success: true,
      data: { already_activated: true, subscription_id: sub.id, activated: true },
    });
  }

  // Claimed by SOMEONE ELSE → reject.
  if (sub.activated_user_id) {
    return NextResponse.json(
      { success: false, error: "Activation code is already used by another account", code: "ALREADY_USED" },
      { status: 409 },
    );
  }

  if (sub.status === "cancelled") {
    return NextResponse.json(
      { success: false, error: "This subscription has been cancelled", code: "CANCELLED" },
      { status: 409 },
    );
  }

  // "Has workout days remaining" — derived from end_date >= today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = sub.end_date ? new Date(sub.end_date) : null;
  if (!endDate || endDate < today) {
    return NextResponse.json(
      { success: false, error: "Subscription has no workout days remaining", code: "NO_DAYS_LEFT" },
      { status: 409 },
    );
  }

  // Claim the code. Conditional update so two concurrent claims can't
  // both succeed.
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("gym_subscriptions")
    .update({ activated_user_id: ctx.userId, activated_at: nowIso })
    .eq("id", sub.id)
    .is("activated_user_id", null)
    .select("id, member_id, activated_user_id, activated_at")
    .maybeSingle();

  if (claimError) {
    console.error("[activate] update failed:", claimError);
    return NextResponse.json(
      { success: false, error: "Failed to claim activation code", debug: claimError.message },
      { status: 500 },
    );
  }

  if (!claimed) {
    // Lost the race — someone else just claimed it.
    return NextResponse.json(
      { success: false, error: "Activation code is already used by another account", code: "ALREADY_USED" },
      { status: 409 },
    );
  }

  // Best-effort profile mirror so coach eligibility recognises them
  // immediately. Failure here MUST NOT roll back the successful claim.
  const linkedMemberId = sub.member_id ?? ctx.memberId;
  if (linkedMemberId) {
    try {
      await upsertMemberAppProfile(supabase, ctx.userId, linkedMemberId, {
        full_name: sub.member_name ?? undefined,
        phone: sub.phone ?? undefined,
        app_registered_at: nowIso,
      });
    } catch (e) {
      console.error("[activate] upsertMemberAppProfile failed:", e);
    }
  }

  try {
    await supabase.from("audit_logs").insert({
      actor_id:    ctx.memberId,
      action:      "subscription.activate",
      target_id:   claimed.id,
      target_type: "gym_subscription",
      meta: { activation_code: code },
    });
  } catch (e) {
    console.error("[activate] audit log insert failed:", e);
  }

  return NextResponse.json({
    success: true,
    data: {
      subscription_id: claimed.id,
      activated: true,
      activated_at: claimed.activated_at,
    },
  });
}
