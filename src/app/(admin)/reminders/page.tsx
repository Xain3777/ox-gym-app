import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader } from "@/components/layout/TopBar";
import { Alert } from "@/components/ui/Alert";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { ReminderLog } from "@/types";

export const metadata: Metadata = { title: "Reminders" };

async function getData(): Promise<(ReminderLog & { member_name: string })[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("reminder_logs")
      .select("*, member:members(full_name)")
      .order("sent_at", { ascending: false })
      .limit(100);

    return (data ?? []).map((r: any) => ({
      ...r,
      member_name: r.member?.full_name ?? "Unknown",
    }));
  } catch (error) {
    console.error("Failed to fetch reminders:", error);
    return [];
  }
}

const typeLabels: Record<string, string> = {
  "7-day":  "7-Day Notice",
  "3-day":  "3-Day Notice",
  "expired": "Auto-Expired",
};

const typeBadge: Record<string, string> = {
  "7-day":   "border-gold/20 bg-gold/5 text-gold",
  "3-day":   "border-gold/30 bg-gold/10 text-gold",
  "expired": "border-danger/20 bg-danger/10 text-danger",
};

export default async function RemindersPage() {
  const logs = await getData();

  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="REMINDERS"
        eyebrow={`${logs.length} total logs`}
      />

      <div className="p-6 pb-20 md:pb-6 space-y-5 flex-1">

        {failedCount > 0 && (
          <Alert
            variant="danger"
            title={`${failedCount} reminder${failedCount > 1 ? "s" : ""} failed to send`}
            description="Check member email addresses and Resend API key configuration."
          />
        )}

        <SectionHeader label="Email Log" />

        {logs.length === 0 ? (
          <p className="text-muted text-[13px] py-12 text-center">
            No reminders sent yet. The cron job runs daily at 08:00 UTC.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-charcoal border-b border-steel">
                  {["Member", "Email", "Type", "Sent", "Status"].map((h) => (
                    <th key={h} className="text-left font-mono text-[10px] tracking-[0.13em] uppercase text-muted px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gunmetal hover:bg-iron transition-colors"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-white">
                      {log.member_name}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {log.email_to}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border",
                        typeBadge[log.type] ?? "border-steel text-ghost",
                      )}>
                        {typeLabels[log.type] ?? log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] text-muted">{timeAgo(log.sent_at)}</p>
                      <p className="text-[11px] text-steel">{formatDate(log.sent_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-mono text-[9px] uppercase tracking-[0.1em]",
                        log.status === "sent"    ? "text-success" :
                        log.status === "failed"  ? "text-danger"  :
                        "text-muted",
                      )}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
