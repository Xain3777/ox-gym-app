import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/link-orphan-sub
// Body: { sub_id, member_id }
// Binds a gym_subscriptions row to a member's auth account + flips
// the app profile to active.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  sub_id:    z.string().uuid(),
  member_id: z.string().uuid(),
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
  const { sub_id, member_id } = parsed.data;

  const [{ data: member }, { data: sub }] = await Promise.all([
    supa.from("members").select("id, auth_id, full_name").eq("id", member_id).maybeSingle(),
    supa.from("gym_subscriptions").select("id, activation_code, activated_user_id, cancelled_at, end_date").eq("id", sub_id).maybeSingle(),
  ]);

  if (!member?.auth_id) return NextResponse.json({ success: false, error: "Member has no app account" }, { status: 404 });
  if (!sub)             return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
  if (sub.cancelled_at) return NextResponse.json({ success: false, error: "Subscription is cancelled" }, { status: 400 });

  const { error: subErr } = await supa
    .from("gym_subscriptions")
    .update({ activated_user_id: member.auth_id, activated_at: new Date().toISOString() })
    .eq("id", sub_id);
  if (subErr) return NextResponse.json({ success: false, error: subErr.message }, { status: 500 });

  await supa
    .from("member_app_profiles")
    .update({ active: true, activation_code: sub.activation_code as string })
    .eq("app_user_id", member.auth_id);

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.link_orphan_sub",
    target_id: member_id,
    target_type: "member",
    meta: { sub_id, activation_code: sub.activation_code },
  }).then(() => {});

  return NextResponse.json({ success: true });
}
