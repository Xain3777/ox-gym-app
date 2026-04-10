"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface SubWithMember {
  id: string;
  member_id: string;
  plan_type: string;
  start_date: string;
  end_date: string;
  status: string;
  price: number | null;
  member: { full_name: string; email: string } | null;
}

export default function ReceptionSubscriptionsPage() {
  const { t } = useTranslation();
  const [subs, setSubs] = useState<SubWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data } = await supabase
          .from("subscriptions")
          .select("*, member:members(full_name, email)")
          .order("end_date", { ascending: true });

        if (data) setSubs(data as SubWithMember[]);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = subs.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const filters = ["all", "active", "expired"] as const;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-[28px] tracking-wider text-white">{t("subscriptions.title")}</h1>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium uppercase tracking-wider transition-colors",
              filter === f ? "bg-[#4ECDC4]/20 text-[#4ECDC4] border border-[#4ECDC4]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06]",
            )}
          >
            {f === "all" ? t("members.all") : t(`subscription.${f}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-[14px]">{t("subscriptions.noData")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <div key={sub.id} className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] p-4">
              <div className="w-10 h-10 bg-[#4ECDC4]/10 flex items-center justify-center">
                <CreditCard size={18} className="text-[#4ECDC4]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-medium truncate">{sub.member?.full_name ?? "—"}</p>
                <p className="text-white/40 text-[12px]">{sub.plan_type} · {sub.start_date} → {sub.end_date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={cn(
                  "text-[11px] font-bold uppercase px-2 py-1",
                  sub.status === "active" ? "bg-green-500/10 text-green-400" : "bg-danger/10 text-danger"
                )}>
                  {t(`subscription.${sub.status}`)}
                </span>
                {sub.price && (
                  <p className="text-white/30 text-[11px] mt-1">{sub.price} SAR</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
