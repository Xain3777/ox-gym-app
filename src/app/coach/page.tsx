"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { Users, Dumbbell, UserCheck, UserX, Crown } from "lucide-react";

interface Stats {
  totalNonCancelled: number;
  activated: number;
  appProfileNoCode: number;
  dashboardOnlyNoProfile: number;
  privatePlayers: number;
  privateCoaches: number;
}

export default function CoachDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalNonCancelled: 0,
    activated: 0,
    appProfileNoCode: 0,
    dashboardOnlyNoProfile: 0,
    privatePlayers: 0,
    privateCoaches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const playersRes = await fetch("/api/coach/players");
        const playersJson = await playersRes.json().catch(() => ({}));
        const d = playersJson.diagnostics ?? {};

        setStats({
          totalNonCancelled:     Number(d.total_dashboard_non_cancelled ?? 0),
          activated:             Number(d.activated ?? 0),
          appProfileNoCode:      Number(d.app_profile_no_code ?? 0),
          dashboardOnlyNoProfile: Number(d.dashboard_only_no_profile ?? 0),
          privatePlayers:        Number(d.private_training_players ?? 0),
          privateCoaches:        Number(d.private_training_coaches ?? 0),
        });
      } catch {
        // Stats stay at 0
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: "مشتركون من الاستقبال (غير ملغى)", value: stats.totalNonCancelled, icon: Users, href: "/coach/players", color: "text-[#FF6B35]", bg: "bg-[#FF6B35]/10" },
    { label: "يمكن إرسال خطة (مفعّل)",          value: stats.activated,         icon: UserCheck, href: "/coach/players", color: "text-green-400", bg: "bg-green-400/10" },
    { label: "عمل حساب ولم يفعّل بعد",          value: stats.appProfileNoCode,  icon: Dumbbell, href: "/coach/players", color: "text-gold",       bg: "bg-gold/10" },
    { label: "بالاستقبال بدون حساب تطبيق",      value: stats.dashboardOnlyNoProfile, icon: UserX, href: "/coach/players", color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "تدريب خاص — لاعبون",              value: stats.privatePlayers,    icon: Crown, href: "/coach/players", color: "text-gold",       bg: "bg-gold/15" },
    { label: "تدريب خاص — كوتشات",              value: stats.privateCoaches,    icon: Crown, href: "/coach/players", color: "text-purple-300",  bg: "bg-purple-400/10" },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-[28px] tracking-wider text-white">
          {t("coach.title")}
        </h1>
        <p className="text-white/40 text-[13px] mt-1">{t("coach.dashboard")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="relative bg-white/[0.04] border border-white/[0.06] p-5 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
            >
              <div className={`w-10 h-10 ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.color} />
              </div>
              <p className="text-white/40 text-[11px] font-mono uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-white text-[24px] font-display tracking-wider mt-1">
                {loading ? "..." : card.value}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-white/40 text-[11px] font-mono uppercase tracking-wider">
          {t("dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/coach/plans"
            className="flex items-center gap-3 bg-[#FF6B35]/10 border border-[#FF6B35]/20 p-4 hover:bg-[#FF6B35]/15 transition-colors"
          >
            <Dumbbell size={18} className="text-[#FF6B35]" />
            <span className="text-white text-[14px] font-medium">{t("coach.createPlan")}</span>
          </Link>
          <Link
            href="/coach/players"
            className="flex items-center gap-3 bg-gold/10 border border-gold/20 p-4 hover:bg-gold/15 transition-colors"
          >
            <Users size={18} className="text-gold" />
            <span className="text-white text-[14px] font-medium">{t("coach.assignPlan")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
