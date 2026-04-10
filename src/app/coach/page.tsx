"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { Users, Dumbbell, UtensilsCrossed, MessageSquare } from "lucide-react";

interface Stats {
  activePlayers: number;
  plansSent: number;
  pendingMessages: number;
}

export default function CoachDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({ activePlayers: 0, plansSent: 0, pendingMessages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get players count (members with role=player)
        const { count: playerCount } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("role", "player")
          .eq("status", "active");

        // Get plans sent today
        const today = new Date().toISOString().split("T")[0];
        const { count: sentCount } = await supabase
          .from("plan_sends")
          .select("*", { count: "exact", head: true })
          .gte("sent_at", today);

        setStats({
          activePlayers: playerCount ?? 0,
          plansSent: sentCount ?? 0,
          pendingMessages: 0,
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
    { labelKey: "coach.activePlayers", value: stats.activePlayers, icon: Users, href: "/coach/players", color: "text-[#FF6B35]", bg: "bg-[#FF6B35]/10" },
    { labelKey: "coach.workoutPlans",  value: stats.plansSent,     icon: Dumbbell, href: "/coach/plans", color: "text-gold", bg: "bg-gold/10" },
    { labelKey: "coach.mealPlans",     value: "→",                 icon: UtensilsCrossed, href: "/coach/meals", color: "text-green-400", bg: "bg-green-400/10" },
    { labelKey: "coach.messages",      value: stats.pendingMessages, icon: MessageSquare, href: "/coach/messages", color: "text-blue-400", bg: "bg-blue-400/10" },
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
              key={card.labelKey}
              href={card.href}
              className="relative bg-white/[0.04] border border-white/[0.06] p-5 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
            >
              <div className={`w-10 h-10 ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.color} />
              </div>
              <p className="text-white/40 text-[11px] font-mono uppercase tracking-wider">
                {t(card.labelKey)}
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
