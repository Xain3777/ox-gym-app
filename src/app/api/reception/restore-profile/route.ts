import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/restore-profile
// Body: { mode: "single", member_id } | { mode: "bulk" }
//
// "single": ensures member_app_profiles row exists for a given member.
// "bulk":   scans every member with auth_id + a live bound sub and
//           creates the missing profile if needed. Idempotent.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("single"), member_id: z.string().uuid() }),
  z.object({ mode: z.literal("bulk") }),
]);

async function ensureOne(
  supa: ReturnType<typeof createServiceClient>,
  memberId: string,
): Promise<{ ok: boolean; created: boolean; error?: string }> {
  const { data: mem } = await supa
    .from("members")
    .select("id, auth_id, full_name, phone, phone_normalized")
    .eq("id", memberId)
    .maybeSingle();
  if (!mem)              return { ok: false, created: false, error: "Member not found" };
  if (!mem.auth_id)      return { ok: false, created: false, error: "Member has no app account" };

  const { data: existing } = await supa
    .from("member_app_profiles")
    .select("id")
    .eq("app_user_id", mem.auth_id)
    .maybeSingle();
  if (existing) return { ok: true, created: false };

  const today = new Date().toISOString().slice(0, 10);
  const { data: liveSub } = await supa
    .from("gym_subscriptions")
    .select("activation_code, end_date")
    .eq("activated_user_id", mem.auth_id)
    .is("cancelled_at", null)
    .gte("end_date", today)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supa.from("member_app_profiles").insert({
    app_user_id: mem.auth_id,
    linked_member_id: mem.id,
    full_name: mem.full_name,
    phone: mem.phone,
    phone_normalized: mem.phone_normalized,
    active: Boolean(liveSub),
    activation_code: liveSub?.activation_code ?? null,
    app_registered_at: new Date().toISOString(),
    onboarding_complete: false,
  });
  if (error) return { ok: false, created: false, error: error.message };
  return { ok: true, created: true };
}

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

  if (parsed.data.mode === "single") {
    const r = await ensureOne(supa, parsed.data.member_id);
    await supa.from("audit_logs").insert({
      actor_id: ctx.memberId,
      action: "reception.restore_profile",
      target_id: parsed.data.member_id,
      target_type: "member",
      meta: { created: r.created },
    }).then(() => {});
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    return NextResponse.json({ success: true, created: r.created });
  }

  // bulk
  const today = new Date().toISOString().slice(0, 10);
  const { data: liveSubs } = await supa
    .from("gym_subscriptions")
    .select("activated_user_id")
    .not("activated_user_id", "is", null)
    .is("cancelled_at", null)
    .gte("end_date", today);
  const authIds = Array.from(new Set((liveSubs ?? []).map((s) => s.activated_user_id as string)));

  const { data: members } = authIds.length
    ? await supa.from("members").select("id, auth_id").in("auth_id", authIds)
    : { data: [] };

  let restored = 0, alreadyHad = 0, failed = 0;
  for (const m of members ?? []) {
    const r = await ensureOne(supa, m.id as string);
    if (!r.ok) failed++;
    else if (r.created) restored++;
    else alreadyHad++;
  }

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.restore_profile_bulk",
    target_id: null,
    target_type: "members",
    meta: { restored, already_had: alreadyHad, failed },
  }).then(() => {});

  return NextResponse.json({ success: true, restored, already_had: alreadyHad, failed });
}
