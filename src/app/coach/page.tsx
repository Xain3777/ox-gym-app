"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { Users, Dumbbell, UserCheck, UserX } from "lucide-react";

interface Stats {
  activePlayers: number;
  appRegisteredPlayers: number;
  dashboardOnlyPlayers: number;
  assignablePlayers: number;
  plansSent: number;
}

export default function CoachDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    activePlayers: 0,
    appRegisteredPlayers: 0,
    dashboardOnlyPlayers: 0,
    assignablePlayers: 0,
    plansSent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Same source as /coach/players: only subscribed + app-linked players
        // are returned in data. The card itself shows the Dashboard-paid
        // active player count from member_subscriptions.
        const playersRes = await fetch("/api/coach/players");
        const playersJson = await playersRes.json().catch(() => ({ data: [] }));
        const playerCount = typeof playersJson.diagnostics?.active_dashboard_subscribed_count === "number"
          ? playersJson.diagnostics.active_dashboard_subscribed_count
          : Array.isArray(playersJson.data) ? playersJson.data.length : 0;
        const appRegisteredCount = typeof playersJson.diagnostics?.paid_dashboard_with_app_count === "number"
          ? playersJson.diagnostics.paid_dashboard_with_app_count
          : Array.isArray(playersJson.groups?.subscribed_dashboard_and_app) ? playersJson.groups.subscribed_dashboard_and_app.length : 0;
        const dashboardOnlyCount = typeof playersJson.diagnostics?.paid_dashboard_without_app_count === "number"
          ? playersJson.diagnostics.paid_dashboard_without_app_count
          : Array.isArray(playersJson.groups?.subscribed_dashboard_not_app) ? playersJson.groups.subscribed_dashboard_not_app.length : 0;
        const assignableCount = typeof playersJson.diagnostics?.assignable_count === "number"
          ? playersJson.diagnostics.assignable_count
          : appRegisteredCount;

        // Get plans sent today
        const today = new Date().toISOString().split("T")[0];
        const { count: sentCount } = await supabase
          .from("plan_sends")
          .select("*", { count: "exact", head: true })
          .gte("sent_at", today);

        setStats({
          activePlayers: playerCount,
          appRegisteredPlayers: appRegisteredCount,
          dashboardOnlyPlayers: dashboardOnlyCount,
          assignablePlayers: assignableCount,
          plansSent: sentCount ?? 0,
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
    { label: "مشتركون من الاستقبال", value: stats.activePlayers, icon: Users, href: "/coach/players", color: "text-[#FF6B35]", bg: "bg-[#FF6B35]/10" },
    { label: "لديهم حساب تطبيق", value: stats.appRegisteredPlayers, icon: UserCheck, href: "/coach/players", color: "text-green-400", bg: "bg-green-400/10" },
    { label: "بدون حساب تطبيق", value: stats.dashboardOnlyPlayers, icon: UserX, href: "/coach/players", color: "text-gold", bg: "bg-gold/10" },
    { label: "قابلون للتعيين", value: stats.assignablePlayers, icon: Dumbbell, href: "/coach/players", color: "text-blue-400", bg: "bg-blue-400/10" },
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
