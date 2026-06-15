import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/extend-sub
// Body: { sub_id, days?: number, new_end_date?: YYYY-MM-DD }
//
// Push a subscription's end_date forward — either by N days or to an
// explicit date. Used to grant grace, compensate for a service outage,
// or correct a wrong end_date.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  sub_id:       z.string().uuid(),
  days:         z.number().int().min(1).max(365).optional(),
  new_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((d) => d.days !== undefined || d.new_end_date !== undefined, {
  message: "Provide either days or new_end_date",
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
    .select("id, end_date, activation_code, cancelled_at")
    .eq("id", parsed.data.sub_id)
    .maybeSingle();
  if (!sub)             return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
  if (sub.cancelled_at) return NextResponse.json({ success: false, error: "Subscription is cancelled" }, { status: 400 });

  let newEnd: string;
  if (parsed.data.new_end_date) {
    newEnd = parsed.data.new_end_date;
  } else {
    const start = new Date(sub.end_date as string);
    start.setUTCDate(start.getUTCDate() + (parsed.data.days as number));
    newEnd = start.toISOString().slice(0, 10);
  }

  const { error: updErr } = await supa
    .from("gym_subscriptions")
    .update({ end_date: newEnd })
    .eq("id", sub.id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.extend_sub",
    target_id: sub.id,
    target_type: "subscription",
    meta: { activation_code: sub.activation_code, previous_end: sub.end_date, new_end: newEnd, days: parsed.data.days ?? null },
  }).then(() => {});

  return NextResponse.json({ success: true, previous_end: sub.end_date, new_end: newEnd });
}
