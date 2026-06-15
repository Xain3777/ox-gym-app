import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/move-sub
// Body: { sub_id, target_member_id }
//
// Re-binds a gym_subscriptions row to a different member's auth account.
// Handles the case where reception entered the wrong phone or where two
// family members share a phone — you want the code to follow the right
// person. Works regardless of phone matching.
//
// Side-effects:
//   - sets gym_subscriptions.activated_user_id to target's auth_id
//   - syncs member_app_profiles.active=true + activation_code on the target
//   - leaves the previous owner's profile alone (don't deactivate them
//     just because we moved one sub; they might have other live subs)

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  sub_id:           z.string().uuid(),
  target_member_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth([...RECEPTION_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supa = createServiceClient();
  const { sub_id, target_member_id } = parsed.data;

  const [{ data: sub }, { data: member }] = await Promise.all([
    supa.from("gym_subscriptions").select("id, activation_code, activated_user_id, cancelled_at").eq("id", sub_id).maybeSingle(),
    supa.from("members").select("id, auth_id, full_name, phone, phone_normalized").eq("id", target_member_id).maybeSingle(),
  ]);

  if (!sub)             return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
  if (sub.cancelled_at) return NextResponse.json({ success: false, error: "Subscription is cancelled" }, { status: 400 });
  if (!member?.auth_id) return NextResponse.json({ success: false, error: "Target member has no app account" }, { status: 404 });

  const previousAuth = sub.activated_user_id as string | null;

  const { error: updErr } = await supa
    .from("gym_subscriptions")
    .update({ activated_user_id: member.auth_id, activated_at: new Date().toISOString() })
    .eq("id", sub_id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  // Sync the target's profile so the coach sees them as active immediately
  const { data: existingProfile } = await supa
    .from("member_app_profiles")
    .select("id")
    .eq("app_user_id", member.auth_id)
    .maybeSingle();
  if (existingProfile) {
    await supa.from("member_app_profiles")
      .update({ active: true, activation_code: sub.activation_code })
      .eq("app_user_id", member.auth_id);
  } else {
    await supa.from("member_app_profiles").insert({
      app_user_id: member.auth_id,
      linked_member_id: member.id,
      full_name: member.full_name,
      phone: member.phone,
      phone_normalized: member.phone_normalized,
      active: true,
      activation_code: sub.activation_code,
      app_registered_at: new Date().toISOString(),
      onboarding_complete: false,
    });
  }

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.move_sub",
    target_id: target_member_id,
    target_type: "member",
    meta: { sub_id, activation_code: sub.activation_code, previous_auth: previousAuth, new_auth: member.auth_id },
  }).then(() => {});

  return NextResponse.json({ success: true, previous_auth: previousAuth, new_auth: member.auth_id });
}
