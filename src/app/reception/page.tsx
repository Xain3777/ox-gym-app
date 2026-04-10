"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { UserPlus, Users, CreditCard, ShoppingBag, Search } from "lucide-react";

interface Stats {
  todayCheckIns: number;
  activeSubscriptions: number;
  expiringSoon: number;
}

export default function ReceptionDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({ todayCheckIns: 0, activeSubscriptions: 0, expiringSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; full_name: string; email: string; status: string }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();

        const { count: activeCount } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const { count: expiringCount } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("status", "expiring");

        setStats({
          todayCheckIns: 0,
          activeSubscriptions: activeCount ?? 0,
          expiringSoon: expiringCount ?? 0,
        });
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase
        .from("members")
        .select("id, full_name, email, status")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(5);
      setSearchResults((data ?? []) as Array<{ id: string; full_name: string; email: string; status: string }>);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const cards = [
    { labelKey: "reception.todayCheckIns",      value: stats.todayCheckIns,      icon: Users, color: "text-[#4ECDC4]", bg: "bg-[#4ECDC4]/10" },
    { labelKey: "reception.activeSubscriptions", value: stats.activeSubscriptions, icon: CreditCard, color: "text-green-400", bg: "bg-green-400/10" },
    { labelKey: "reception.expiringSoon",        value: stats.expiringSoon,        icon: CreditCard, color: "text-gold", bg: "bg-gold/10" },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-[28px] tracking-wider text-white">{t("reception.title")}</h1>
        <p className="text-white/40 text-[13px] mt-1">{t("reception.dashboard")}</p>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("reception.searchMember")}
          className="w-full h-12 pl-10 rtl:pl-4 rtl:pr-10 bg-white/[0.04] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none transition-colors"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-charcoal border border-white/[0.08] z-20 shadow-dark-xl">
            {searchResults.map((m) => (
              <Link
                key={m.id}
                href={`/reception/members?id=${m.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                onClick={() => { setSearch(""); setSearchResults([]); }}
              >
                <div className="w-8 h-8 bg-[#4ECDC4]/10 flex items-center justify-center text-[#4ECDC4] font-bold text-[12px]">
                  {m.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium">{m.full_name}</p>
                  <p className="text-white/40 text-[11px]">{m.email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.labelKey} className="bg-white/[0.04] border border-white/[0.06] p-4 text-center">
              <div className={`w-10 h-10 ${card.bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={18} className={card.color} />
              </div>
              <p className="text-white text-[20px] font-display">{loading ? "..." : card.value}</p>
              <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider mt-1">{t(card.labelKey)}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/reception/create"
          className="flex items-center gap-3 bg-[#4ECDC4]/10 border border-[#4ECDC4]/20 p-5 hover:bg-[#4ECDC4]/15 transition-colors"
        >
          <UserPlus size={20} className="text-[#4ECDC4]" />
          <div>
            <p className="text-white text-[14px] font-medium">{t("reception.createAccount")}</p>
            <p className="text-white/40 text-[12px]">{t("reception.createAccountDesc")}</p>
          </div>
        </Link>
        <Link
          href="/reception/store"
          className="flex items-center gap-3 bg-gold/10 border border-gold/20 p-5 hover:bg-gold/15 transition-colors"
        >
          <ShoppingBag size={20} className="text-gold" />
          <div>
            <p className="text-white text-[14px] font-medium">{t("reception.manageStore")}</p>
            <p className="text-white/40 text-[12px]">{t("store.subtitle")}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
