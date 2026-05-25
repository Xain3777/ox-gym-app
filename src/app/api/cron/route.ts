import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { daysUntilExpiry, EXPIRING_WINDOW_DAYS } from "@/lib/subscription";
import {
  buildNotificationsForToday,
  type CandidatePlayer,
} from "@/lib/subscription-notifier";
import { logInfo, logError } from "@/lib/log";
import type { MemberWithSub } from "@/types";

// ── CRON: Daily Subscription Maintenance ─────────────────────
// Runs at 08:00 UTC every day via Vercel Cron.
// Protected by CRON_SECRET bearer token.
//
// Responsibilities (DB maintenance only):
//   1. Mark subscriptions/members expired when end_date is in the past
//   2. Mark members "expiring" when within EXPIRING_WINDOW_DAYS
//   3. Log a "skipped" reminder row at 7-day and 3-day marks so we have
//      an audit trail for when a real comms channel (SMS/email) is wired
//      up later.
//
// Outbound reminders are NOT sent yet — members are identified by phone,
// not email, and there's no SMS provider configured. The previous
// implementation tried to email a phone string to Resend and silently
// failed every run.

const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase  = createServiceClient();
  const results   = {
    skipped_7day: 0,
    skipped_3day: 0,
    expired: 0,
    marked_expiring: 0,
    pages: 0,
    sub_notifications_sent: 0,
    sub_notifications_skipped: 0,
  };
  const startedAt = Date.now();

  try {
    let offset = 0;

    while (true) {
      const { data: page, error } = await supabase
        .from("members")
        .select("*, subscription:member_subscriptions(*)")
        .neq("status", "expired")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!page?.length) break;

      results.pages++;

      const withSubs = page.map((m: any) => ({
        ...m,
        subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
      })) as MemberWithSub[];

      for (const member of withSubs) {
        if (!member.subscription?.end_date) continue;

        const days = daysUntilExpiry(member.subscription.end_date);

        // ── Auto-expire ──
        if (days < 0) {
          await supabase.from("members").update({ status: "expired" }).eq("id", member.id);
          await supabase.from("subscriptions").update({ status: "expired" }).eq("id", member.subscription.id);
          await logReminder(supabase, member.id, "expired", member.phone ?? "", "sent");
          results.expired++;
          continue;
        }

        // ── 7-day mark (no outbound until comms channel wired up) ──
        if (days === 7) {
          await logReminder(supabase, member.id, "7-day", member.phone ?? "", "skipped");
          results.skipped_7day++;
        }

        // ── 3-day mark (no outbound until comms channel wired up) ──
        if (days === 3) {
          await logReminder(supabase, member.id, "3-day", member.phone ?? "", "skipped");
          results.skipped_3day++;
        }

        // ── Mark expiring ──
        if (days >= 0 && days <= EXPIRING_WINDOW_DAYS && member.status !== "expiring") {
          await supabase.from("members").update({ status: "expiring" }).eq("id", member.id);
          results.marked_expiring++;
        }
      }

      offset += PAGE_SIZE;
    }

    // ── Subscription milestone notifications ───────────────────────
    // Insert one notification per (player, milestone) for T-2/T-1/T-0/T+1/T+2.
    // The notifier is idempotent at the unique (member_id, milestone_key)
    // index from migration 042 — re-running the cron the same day cannot
    // duplicate. Cancelled subs are skipped.
    try {
      const { data: subs } = await supabase
        .from("gym_subscriptions")
        .select("activated_user_id, end_date, cancelled_at")
        .not("activated_user_id", "is", null)
        .is("cancelled_at", null);

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
      for (const r of rows) {
        const { error: insertErr } = await supabase
          .from("notifications")
          .upsert(r, { onConflict: "member_id,milestone_key", ignoreDuplicates: true });
        if (insertErr) {
          results.sub_notifications_skipped++;
        } else {
          results.sub_notifications_sent++;
        }
      }
    } catch (err) {
      // Migration 042 not applied yet, or transient DB error — log and
      // continue. The rest of the cron still finished.
      logError("cron:sub-notifier", err);
    }

    const duration = Date.now() - startedAt;
    logInfo("cron", "Daily maintenance complete", { results, durationMs: duration });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      results,
    });
  } catch (err) {
    logError("cron", err, { durationMs: Date.now() - startedAt });
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

async function logReminder(
  supabase: ReturnType<typeof createServiceClient>,
  memberId: string,
  type: string,
  phoneTo: string,
  status: string,
) {
  // `email_to` column predates the email→phone migration. Reuse it as the
  // contact identifier (currently a phone string) until the comms channel
  // is settled and the column can be renamed.
  await supabase.from("reminder_logs").insert({
    member_id: memberId,
    type,
    email_to:  phoneTo,
    status,
    sent_at:   new Date().toISOString(),
  });
}
