import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { daysUntil } from "@/lib/utils";
import type { MemberWithSub } from "@/types";

// ── CRON: Daily Subscription Reminders ────────────────────────
// Runs at 08:00 UTC every day via Vercel Cron.
// Sends reminder emails at 7-day and 3-day thresholds.
// Auto-marks expired members.
//
// Protected by CRON_SECRET — set this in Vercel env vars.

export async function GET(request: Request) {
  // ── SECURITY: verify the cron secret ──
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results  = { sent: 0, failed: 0, expired: 0 };

  try {
    // ── 1. FETCH all members with active subscriptions ──
    const { data: members, error } = await supabase
      .from("members")
      .select("*, subscription:subscriptions(*)")
      .neq("status", "expired");

    if (error) throw error;

    const withSubs = (members ?? []).map((m: any) => ({
      ...m,
      subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
    })) as MemberWithSub[];

    for (const member of withSubs) {
      if (!member.subscription?.end_date) continue;

      const days = daysUntil(member.subscription.end_date);

      // ── 2. AUTO-EXPIRE lapsed members ──
      if (days < 0) {
        await supabase
          .from("members")
          .update({ status: "expired" })
          .eq("id", member.id);

        await supabase.from("subscriptions").update({ status: "expired" }).eq(
          "id",
          member.subscription.id,
        );

        await logReminder(supabase, member.id, "expired", member.email, "sent");
        results.expired++;
        continue;
      }

      // ── 3. SEND 7-day reminder ──
      if (days === 7) {
        const ok = await sendReminderEmail(member, "7-day");
        await logReminder(supabase, member.id, "7-day", member.email, ok ? "sent" : "failed");
        ok ? results.sent++ : results.failed++;
      }

      // ── 4. SEND 3-day reminder ──
      if (days === 3) {
        const ok = await sendReminderEmail(member, "3-day");
        await logReminder(supabase, member.id, "3-day", member.email, ok ? "sent" : "failed");
        ok ? results.sent++ : results.failed++;
      }

      // ── 5. Update member status to "expiring" ──
      if (days >= 0 && days <= 7 && member.status !== "expiring") {
        await supabase
          .from("members")
          .update({ status: "expiring" })
          .eq("id", member.id);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// ── HELPER: log reminder to DB ────────────────────────────────
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
    email_to: emailTo,
    status,
    sent_at: new Date().toISOString(),
  });
}

// ── HELPER: send email via Resend ─────────────────────────────
// Full email template is in components/email/ReminderEmail.tsx
// This is a placeholder — wired up in the email template PR.
async function sendReminderEmail(
  member: MemberWithSub,
  type: "7-day" | "3-day",
): Promise<boolean> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const days = type === "7-day" ? 7 : 3;
    const endDate = member.subscription?.end_date
      ? new Date(member.subscription.end_date).toLocaleDateString("en-US", {
          month: "long",
          day:   "numeric",
          year:  "numeric",
        })
      : "soon";

    const { error } = await resend.emails.send({
      from:    `OX Gym <${process.env.EMAIL_FROM ?? "noreply@oxgym.com"}>`,
      to:      member.email,
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
            Hi ${member.full_name}, your OX Gym membership expires on <strong style="color:#F5C100;">${endDate}</strong>.
            Renew now to keep your access uninterrupted.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://oxgym.com"}/renew"
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
