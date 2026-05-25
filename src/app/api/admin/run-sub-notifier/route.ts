import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import {
  buildNotificationsForToday,
  type CandidatePlayer,
} from "@/lib/subscription-notifier";

// Manual trigger for the subscription milestone notifier.
// Manager/admin-only — for testing the daily cron logic without
// waiting 24h. Same idempotency rules apply (unique milestone_key),
// so running this back-to-back is safe.
export async function POST(request: Request) {
  const { error } = await requireAuth(["manager", "admin"], request);
  if (error) return error;

  const supabase = createServiceClient();

  const { data: subs, error: subErr } = await supabase
    .from("gym_subscriptions")
    .select("activated_user_id, end_date, cancelled_at")
    .not("activated_user_id", "is", null)
    .is("cancelled_at", null);

  if (subErr) {
    return NextResponse.json({ success: false, error: subErr.message }, { status: 500 });
  }

  const authIds = Array.from(new Set((subs ?? []).map((s) => s.activated_user_id as string)));
  const { data: mems } = authIds.length
    ? await supabase.from("members").select("id, auth_id").in("auth_id", authIds)
    : { data: [] };
  const memberByAuth = new Map((mems ?? []).map((m) => [m.auth_id as string, m.id as string]));

  const players: CandidatePlayer[] = [];
  for (const s of subs ?? []) {
    const mid = memberByAuth.get(s.activated_user_id as string);
    if (!mid || !s.end_date) continue;
    players.push({
      member_id:    mid,
      end_date:     s.end_date as string,
      cancelled_at: (s.cancelled_at as string | null) ?? null,
    });
  }

  const rows = buildNotificationsForToday(players);
  let sent = 0;
  let skipped = 0;
  const errs: string[] = [];

  for (const r of rows) {
    const { error: insertErr } = await supabase
      .from("notifications")
      .upsert(r, { onConflict: "member_id,milestone_key", ignoreDuplicates: true });
    if (insertErr) {
      skipped++;
      if (errs.length < 5) errs.push(insertErr.message);
    } else {
      sent++;
    }
  }

  return NextResponse.json({
    success: true,
    candidates: players.length,
    eligibleToday: rows.length,
    inserted: sent,
    skipped,
    errors: errs,
  });
}
