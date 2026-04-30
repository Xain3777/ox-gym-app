import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { TopBar, SectionHeader } from "@/components/layout/TopBar";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { getMemberStatus, daysUntil, formatDate, formatCurrency, cn } from "@/lib/utils";
import type { MemberWithSub } from "@/types";

export const metadata: Metadata = { title: "Subscriptions" };

async function getData() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("members")
      .select("*, subscription:subscriptions(*)")
      .order("created_at", { ascending: false });

    return (data ?? []).map((m: any) => ({
      ...m,
      subscription: Array.isArray(m.subscription) ? m.subscription[0] ?? null : m.subscription,
    })) as MemberWithSub[];
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [] as MemberWithSub[];
  }
}

export default async function SubscriptionsPage() {
  const members = await getData();

  const stats = members.reduce(
    (acc, m) => {
      const s = getMemberStatus(m.subscription?.end_date ?? null);
      if (s === "active")   acc.active++;
      if (s === "expiring") acc.expiring++;
      if (s === "expired")  acc.expired++;
      return acc;
    },
    { active: 0, expiring: 0, expired: 0 },
  );

  // Sort: expiring first, then active, then expired
  const sorted = [...members].sort((a, b) => {
    const sa = getMemberStatus(a.subscription?.end_date ?? null);
    const sb = getMemberStatus(b.subscription?.end_date ?? null);
    const order = { expiring: 0, active: 1, expired: 2 };
    return order[sa] - order[sb];
  });

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="SUBSCRIPTIONS" eyebrow={`${members.length} total`} />

      <div className="p-6 pb-20 md:pb-6 space-y-6 flex-1">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Active"   value={stats.active}   deltaDir="up" />
          <StatCard label="Expiring" value={stats.expiring} deltaDir={stats.expiring > 0 ? "down" : "neutral"} />
          <StatCard label="Expired"  value={stats.expired}  deltaDir={stats.expired > 0 ? "down" : "neutral"} />
        </div>

        {/* Table */}
        <div>
          <SectionHeader label="All Subscriptions" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-charcoal border-b border-steel">
                  {["Member", "Plan", "Start", "Expires", "Days Left", "Price", "Status"].map((h) => (
                    <th key={h} className="text-left font-mono text-[10px] tracking-[0.13em] uppercase text-muted px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => {
                  const sub    = m.subscription;
                  const status = getMemberStatus(sub?.end_date ?? null);
                  const days   = sub?.end_date ? daysUntil(sub.end_date) : null;

                  return (
                    <tr
                      key={m.id}
                      className="border-b border-gunmetal hover:bg-iron transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-white">{m.full_name}</p>
                        <p className="text-[11px] text-muted">{m.phone ?? m.username ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-offwhite capitalize">
                        {sub?.plan_type ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {sub?.start_date ? formatDate(sub.start_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {sub?.end_date ? formatDate(sub.end_date) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-[13px] font-semibold",
                          days === null      ? "text-muted"   :
                          days < 0           ? "text-danger"  :
                          days <= 7          ? "text-gold"    :
                          "text-offwhite",
                        )}>
                          {days === null ? "—" : days < 0 ? "Expired" : `${days}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {sub?.price ? formatCurrency(sub.price) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
