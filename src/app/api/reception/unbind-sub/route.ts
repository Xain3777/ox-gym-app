import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/unbind-sub
// Body: { sub_id }
// Clears activated_user_id + activated_at on the sub, so the code can
// be re-claimed by the correct account. Used when a code was claimed
// by the wrong person.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({ sub_id: z.string().uuid() });

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
    .select("id, activation_code, activated_user_id, cancelled_at")
    .eq("id", parsed.data.sub_id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });

  const previousAuth = sub.activated_user_id as string | null;
  const { error: updErr } = await supa
    .from("gym_subscriptions")
    .update({ activated_user_id: null, activated_at: null })
    .eq("id", sub.id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.unbind_sub",
    target_id: sub.id,
    target_type: "subscription",
    meta: { activation_code: sub.activation_code, previous_auth: previousAuth },
  }).then(() => {});

  return NextResponse.json({ success: true, previous_auth: previousAuth, activation_code: sub.activation_code });
}
