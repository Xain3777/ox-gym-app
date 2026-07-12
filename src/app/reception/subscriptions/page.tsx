"use client";

// ═══════════════════════════════════════════════════════════════
// Reception → Subscriptions (activation-code panel)
//
// Perf: this page used to make TWO sequential full-table paged reads
// (member_subscriptions view + join, then ALL of gym_subscriptions
// again just for the codes) and then render 1100+ rows into the DOM.
// Now it makes ONE lean paged read of gym_subscriptions (which already
// carries member_name/phone/code) and caps rendering — search narrows.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetch-all";
import { cn } from "@/lib/utils";
import { CreditCard, Search, AlertCircle, RefreshCw } from "lucide-react";

const RENDER_CAP = 150;

interface SubRow {
  id: string;
  member_name: string | null;
  phone: string | null;
  plan_type: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  activation_code: string | null;
  activated_user_id: string | null;
  cancelled_at: string | null;
}

type DerivedStatus = "active" | "expired" | "cancelled";

function deriveStatus(sub: SubRow, today: string): DerivedStatus {
  if (sub.cancelled_at) return "cancelled";
  if (sub.end_date && sub.end_date >= today) return "active";
  return "expired";
}

function planLabel(raw: string | null, t: (key: string) => string): string {
  if (raw === "1_month") return t("members.monthly");
  if (raw === "3_months" || raw === "3_month") return t("members.quarterly");
  if (raw === "12_months" || raw === "12_month") return t("members.annual");
  return raw ?? "—";
}

export default function ReceptionSubscriptionsPage() {
  const { t } = useTranslation();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const supabase = createBrowserSupabase();
      // ONE paged read, only the columns this panel shows.
      // gym_subscriptions is the canonical table and already carries
      // member_name / phone / activation_code — no join needed.
      const { data, error } = await fetchAllRows<SubRow>(() => supabase
        .from("gym_subscriptions")
        .select("id, member_name, phone, plan_type, start_date, end_date, amount, activation_code, activated_user_id, cancelled_at")
        .order("end_date", { ascending: false }));
      if (error) throw error;
      setSubs(data ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.filter((s) => {
      const status = deriveStatus(s, today);
      if (filter !== "all" && status !== filter) return false;
      if (q) {
        return (s.member_name?.toLowerCase().includes(q) ?? false)
          || (s.phone?.toLowerCase().includes(q) ?? false)
          || (s.activation_code?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [subs, filter, search, today]);

  const visible = filtered.slice(0, RENDER_CAP);
  const filters = ["all", "active", "expired"] as const;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-[28px] tracking-wider text-white">{t("subscriptions.title")}</h1>

      {/* Search — by name, phone, or activation code */}
      <div className="relative">
        <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("reception.searchSubs")}
          className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 bg-white/[0.04] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none transition-colors"
        />
      </div>

      <div className="flex gap-2 items-center flex-wrap">
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
        {!loading && (
          <span className="text-white/30 text-[11px] font-mono ml-auto rtl:ml-0 rtl:mr-auto">{filtered.length}</span>
        )}
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : loadError ? (
        <div className="text-center py-16 border border-danger/20 bg-danger/[0.04]">
          <AlertCircle size={36} className="mx-auto text-danger/60 mb-3" />
          <p className="text-danger text-[14px] mb-4">{t("reception.loadFailed")}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 h-10 border border-white/[0.12] text-white/70 hover:text-white hover:border-white/30 text-[13px] transition-colors"
          >
            <RefreshCw size={14} /> {t("reception.retry")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-[14px]">{t("subscriptions.noData")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((sub) => {
            const status = deriveStatus(sub, today);
            return (
              <div key={sub.id} className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] p-4">
                <div className="w-10 h-10 bg-[#4ECDC4]/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-[#4ECDC4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[14px] font-medium truncate">{sub.member_name ?? "—"}</p>
                  <p className="text-white/40 text-[12px]" dir="ltr">
                    {planLabel(sub.plan_type, t)} · {sub.start_date ?? "—"} → {sub.end_date ?? "—"}
                    {sub.phone ? ` · ${sub.phone}` : ""}
                  </p>
                  <p className="text-white/60 text-[11px] font-mono tracking-wider mt-1" dir="ltr">
                    <span className="text-white/30">CODE</span> {sub.activation_code ?? "—"}
                    {sub.activated_user_id && <span className="text-green-400/70"> · ✓ {t("reception.codeLinked")}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn(
                    "text-[11px] font-bold uppercase px-2 py-1",
                    status === "active" ? "bg-green-500/10 text-green-400" :
                    status === "cancelled" ? "bg-white/[0.06] text-white/40" :
                    "bg-danger/10 text-danger"
                  )}>
                    {t(`subscription.${status}`)}
                  </span>
                  {sub.amount != null && (
                    <p className="text-white/30 text-[11px] mt-1">${sub.amount}</p>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length > RENDER_CAP && (
            <p className="text-white/30 text-[12px] text-center py-3">
              {t("reception.showingFirst")} {RENDER_CAP} — {t("reception.searchToNarrow")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
