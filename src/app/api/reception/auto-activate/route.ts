import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { fetchAllRows } from "@/lib/fetch-all";

// POST /api/reception/auto-activate
// Body: { mode: "single", member_id, sub_id } | { mode: "bulk" }
//
// - "single": bind a specific gym_subscriptions row to a specific member's auth.
// - "bulk":   for every player whose phone matches an unbound live sub
//             that nobody owns, bind it to them. Same logic the previous
//             one-off scripts ran, now as a single endpoint anyone with
//             reception+ access can trigger.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("single"),
    member_id: z.string().uuid(),
    sub_id: z.string().uuid(),
  }),
  z.object({ mode: z.literal("bulk") }),
]);

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const w = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const digits = w.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0"))   return "963" + digits.slice(1);
  return digits;
}

async function bindOne(
  supa: ReturnType<typeof createServiceClient>,
  authId: string,
  subId: string,
  activationCode: string,
) {
  const { error: subErr } = await supa
    .from("gym_subscriptions")
    .update({ activated_user_id: authId, activated_at: new Date().toISOString() })
    .eq("id", subId);
  if (subErr) return { ok: false, error: subErr.message };

  // Sync the app profile so the coach UI sees them as active.
  await supa
    .from("member_app_profiles")
    .update({ active: true, activation_code: activationCode })
    .eq("app_user_id", authId);

  return { ok: true };
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
    const { member_id, sub_id } = parsed.data;
    const [{ data: member }, { data: sub }] = await Promise.all([
      supa.from("members").select("id, auth_id").eq("id", member_id).maybeSingle(),
      supa.from("gym_subscriptions").select("id, activated_user_id, activation_code, cancelled_at, end_date").eq("id", sub_id).maybeSingle(),
    ]);

    if (!member?.auth_id) return NextResponse.json({ success: false, error: "Member has no app account" }, { status: 404 });
    if (!sub)             return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    if (sub.cancelled_at) return NextResponse.json({ success: false, error: "Subscription is cancelled" }, { status: 400 });

    const result = await bindOne(supa, member.auth_id as string, sub.id as string, sub.activation_code as string);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 500 });

    await supa.from("audit_logs").insert({
      actor_id: ctx.memberId,
      action: "reception.auto_activate",
      target_id: member_id,
      target_type: "member",
      meta: { sub_id, activation_code: sub.activation_code },
    }).then(() => {});

    return NextResponse.json({ success: true, bound: 1 });
  }

  // ── bulk ──
  const today = new Date().toISOString().slice(0, 10);
  // fetchAllRows — page past the 1000-row cap so the bulk bind sees every
  // player and every unbound sub, not just the first 1000.
  const [{ data: members }, { data: subs }] = await Promise.all([
    fetchAllRows<{ id: string; auth_id: string | null; phone: string | null; phone_normalized: string | null }>(() =>
      supa.from("members")
        .select("id, auth_id, phone, phone_normalized")
        .eq("role", "player")
        .not("auth_id", "is", null)),
    fetchAllRows<{ id: string; phone: string | null; activation_code: string | null; activated_user_id: string | null; cancelled_at: string | null; end_date: string | null }>(() =>
      supa.from("gym_subscriptions")
        .select("id, phone, activation_code, activated_user_id, cancelled_at, end_date")
        .is("cancelled_at", null)
        .is("activated_user_id", null)
        .gte("end_date", today)),
  ]);

  const subByPhone = new Map<string, NonNullable<typeof subs>[number]>();
  for (const s of subs ?? []) {
    const pn = normalizePhone(s.phone as string | null);
    if (!pn) continue;
    const existing = subByPhone.get(pn);
    if (!existing || (existing.end_date as string) < (s.end_date as string)) {
      subByPhone.set(pn, s);
    }
  }

  const results: Array<{ member_id: string; ok: boolean; sub_id?: string; error?: string }> = [];

  for (const m of members ?? []) {
    const pn = (m.phone_normalized as string | null) || normalizePhone(m.phone as string | null);
    if (!pn) continue;
    const sub = subByPhone.get(pn);
    if (!sub) continue;
    const r = await bindOne(supa, m.auth_id as string, sub.id as string, sub.activation_code as string);
    results.push({ member_id: m.id as string, ok: r.ok, sub_id: sub.id as string, error: r.error });
  }

  const bound = results.filter((r) => r.ok).length;
  const failed = results.length - bound;

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.auto_activate_bulk",
    target_id: null,
    target_type: "members",
    meta: { bound, failed },
  }).then(() => {});

  return NextResponse.json({ success: true, bound, failed, results });
}
