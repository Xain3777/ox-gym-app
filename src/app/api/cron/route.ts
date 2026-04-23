import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { daysUntil } from "@/lib/utils";
import { logInfo, logError, logWarn } from "@/lib/log";
import type { MemberWithSub } from "@/types";

// ── CRON: Daily Subscription Reminders ────────────────────────
// Runs at 08:00 UTC every day via Vercel Cron.
// Protected by CRON_SECRET bearer token.

const MAX_RETRIES  = 3;
const RETRY_DELAY  = 1_500; // ms — doubles each attempt
const PAGE_SIZE    = 100;   // members per DB page

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase  = createServiceClient();
  const results   = { sent: 0, failed: 0, expired: 0, pages: 0, errors: [] as string[] };
  const startedAt = Date.now();

  try {
    let offset = 0;

    // Paginate through all non-expired members in batches of PAGE_SIZE
    while (true) {
      const { data: page, error } = await supabase
        .from("members")
        .select("*, subscription:subscriptions(*)")
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

        const days = daysUntil(member.subscription.end_date);

        // ── Auto-expire ──
        if (days < 0) {
          await supabase.from("members").update({ status: "expired" }).eq("id", member.id);
          await supabase.from("subscriptions").update({ status: "expired" }).eq("id", member.subscription.id);
          await logReminder(supabase, member.id, "expired", (member.phone ?? ""), "sent");
          results.expired++;
          continue;
        }

        // ── 7-day reminder ──
        if (days === 7) {
          const ok = await sendWithRetry(member, "7-day");
          await logReminder(supabase, member.id, "7-day", (member.phone ?? ""), ok ? "sent" : "failed");
          if (ok) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`7-day reminder failed for ${(member.phone ?? "")}`);
            await sendAdminAlert((member.phone ?? ""), "7-day");
          }
        }

        // ── 3-day reminder ──
        if (days === 3) {
          const ok = await sendWithRetry(member, "3-day");
          await logReminder(supabase, member.id, "3-day", (member.phone ?? ""), ok ? "sent" : "failed");
          if (ok) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`3-day reminder failed for ${(member.phone ?? "")}`);
            await sendAdminAlert((member.phone ?? ""), "3-day");
          }
        }

        // ── Mark expiring ──
        if (days >= 0 && days <= 7 && member.status !== "expiring") {
          await supabase.from("members").update({ status: "expiring" }).eq("id", member.id);
        }
      }

      offset += PAGE_SIZE;
    }

    const duration = Date.now() - startedAt;
    logInfo("cron", "Daily reminders complete", { results, durationMs: duration });

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

// ── Retry wrapper — exponential back-off ─────────────────────
async function sendWithRetry(
  member: MemberWithSub,
  type: "7-day" | "3-day",
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ok = await sendReminderEmail(member, type);
    if (ok) return true;
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY * attempt); // 1.5s → 3s
    }
  }
  logWarn("cron", `All retries exhausted for ${type} reminder`, { member_id: member.id });
  return false;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Alert admin when all retries exhausted ───────────────────
async function sendAdminAlert(failedEmail: string, type: string) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    `OX Gym System <${process.env.EMAIL_FROM ?? "noreply@oxgym.com"}>`,
      to:      adminEmail,
      subject: `⚠️ Cron alert: ${type} reminder failed after ${MAX_RETRIES} retries`,
      html: `<p>Failed to send <strong>${type}</strong> subscription reminder to <strong>${failedEmail}</strong> after ${MAX_RETRIES} attempts.</p>
             <p>Please check Resend logs and manually follow up with the member.</p>`,
    });
  } catch (err) {
    logError("cron.adminAlert", err);
  }
}

// ── DB logger ────────────────────────────────────────────────
async function logReminder(
  supabase: ReturnType<typeof createServiceClient>,
  memberId: string,
  type: string,
  emailTo: string,
  status: string,
) {
  await supabase.from("reminder_logs").insert({
    member_id: memberId,
    type,
    email_to:  emailTo,
    status,
    sent_at:   new Date().toISOString(),
  });
}

// ── Email sender ─────────────────────────────────────────────
async function sendReminderEmail(
  member: MemberWithSub,
  type: "7-day" | "3-day",
): Promise<boolean> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const days    = type === "7-day" ? 7 : 3;
    const endDate = member.subscription?.end_date
      ? new Date(member.subscription.end_date).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        })
      : "soon";

    const safeName = (member.full_name ?? "").replace(/[<>&"']/g, "");
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://oxgym.com";

    const { error } = await resend.emails.send({
      from:    `OX Gym <${process.env.EMAIL_FROM ?? "noreply@oxgym.com"}>`,
      to:      (member.phone ?? ""),
      subject: `Your OX Gym membership expires in ${days} days`,
      html: `
        <div style="background:#0A0A0A;color:#F0EDE6;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
          <div style="font-size:32px;font-weight:900;color:#F5C100;letter-spacing:4px;margin-bottom:8px;">OX GYM</div>
          <div style="font-size:11px;color:#777;letter-spacing:3px;text-transform:uppercase;margin-bottom:32px;">
            HARDER · BETTER · FASTER · STRONGER
          </div>
          <h1 style="font-size:24px;color:#fff;margin:0 0 16px;font-weight:600;">
            Membership Expiring in ${days} Days
          </h1>
          <p style="color:#AAAAAA;line-height:1.7;margin-bottom:24px;">
            Hi ${safeName}, your OX Gym membership expires on
            <strong style="color:#F5C100;">${endDate}</strong>.
            Renew now to keep your access uninterrupted.
          </p>
          <a href="${appUrl}/renew"
             style="display:inline-block;background:#F5C100;color:#0A0A0A;font-weight:700;
                    padding:14px 28px;text-decoration:none;letter-spacing:2px;font-size:13px;text-transform:uppercase;">
            RENEW MEMBERSHIP
          </a>
          <div style="margin-top:40px;padding-top:24px;border-top:1px solid #333;font-size:11px;color:#555;">
            OX Gym — Where power, discipline, and progress come together.
          </div>
        </div>
      `,
    });

    return !error;
  } catch {
    return false;
  }
}
