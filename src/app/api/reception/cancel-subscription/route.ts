import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/cancel-subscription
// Body: { sub_id, reason?: string }
//
// Cancels a gym_subscriptions row in place (sets cancelled_at + reason).
// Does not refund — that's reception's job at the desk. Used for wrong
// entries, refunded subs, or releasing a code that was issued by mistake.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  sub_id: z.string().uuid(),
  reason: z.string().trim().max(200).optional(),
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
  const { data: sub } = await supa
    .from("gym_subscriptions")
    .select("id, member_name, phone, activation_code, cancelled_at")
    .eq("id", parsed.data.sub_id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
  if (sub.cancelled_at) return NextResponse.json({ success: false, error: "Already cancelled" }, { status: 400 });

  const { error: updErr } = await supa
    .from("gym_subscriptions")
    .update({
      cancelled_at:     new Date().toISOString(),
      cancelled_reason: parsed.data.reason ?? "Cancelled from reception health page",
    })
    .eq("id", parsed.data.sub_id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.cancel_subscription",
    target_id: parsed.data.sub_id,
    target_type: "subscription",
    meta: { member_name: sub.member_name, phone: sub.phone, activation_code: sub.activation_code, reason: parsed.data.reason ?? null },
  }).then(() => {});

  return NextResponse.json({ success: true });
}
