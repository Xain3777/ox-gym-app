import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { isActivationCodeShape } from "@/lib/activation-code";
import { upsertMemberAppProfile } from "@/lib/member-app-profile";

const ActivateSchema = z.object({
  code: z.string().trim().toUpperCase(),
});

// GET — check whether the current player is already activated, so the
// portal can hide the activation card without a flash.
export async function GET() {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("gym_subscriptions")
    .select("id, activation_code, status, end_date, activated_at")
    .eq("activated_user_id", ctx.userId)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    data: { activated: Boolean(row), subscription: row ?? null },
  });
}

// POST — claim an activation code for the current player.
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["player"], request);
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

  // Already activated by this user? Idempotent success — don't ask again.
  const { data: existingForUser } = await supabase
    .from("gym_subscriptions")
    .select("id, activation_code")
    .eq("activated_user_id", ctx.userId)
    .limit(1)
    .maybeSingle();

  if (existingForUser) {
    return NextResponse.json({
      success: true,
      data: { already_activated: true, subscription_id: existingForUser.id },
    });
  }

  const { data: sub, error: lookupError } = await supabase
    .from("gym_subscriptions")
    .select("id, member_id, member_name, phone, status, end_date, activated_user_id, plan_type, start_date")
    .eq("activation_code", code)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { success: false, error: "Failed to verify activation code" },
      { status: 500 },
    );
  }

  if (!sub) {
    return NextResponse.json(
      { success: false, error: "Activation code not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (sub.activated_user_id && sub.activated_user_id !== ctx.userId) {
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

  // Claim the code. Use a conditional update so two concurrent claims for
  // the same code can't both succeed.
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("gym_subscriptions")
    .update({ activated_user_id: ctx.userId, activated_at: nowIso })
    .eq("id", sub.id)
    .is("activated_user_id", null)
    .select("id, member_id")
    .maybeSingle();

  if (claimError || !claimed) {
    return NextResponse.json(
      { success: false, error: "Activation code is already used by another account", code: "ALREADY_USED" },
      { status: 409 },
    );
  }

  // Ensure the player has a member_app_profile linked to the same dashboard
  // member so coach eligibility immediately recognises them. We don't
  // override existing profile data, just make sure the row exists with
  // app_registered_at set.
  const linkedMemberId = sub.member_id ?? ctx.memberId;
  if (linkedMemberId) {
    await upsertMemberAppProfile(supabase, ctx.userId, linkedMemberId, {
      full_name: sub.member_name ?? undefined,
      phone: sub.phone ?? undefined,
      app_registered_at: nowIso,
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id:    ctx.memberId,
    action:      "subscription.activate",
    target_id:   claimed.id,
    target_type: "gym_subscription",
    meta: { activation_code: code },
  }).then(() => {});

  return NextResponse.json({
    success: true,
    data: { subscription_id: claimed.id, activated: true },
  });
}
