"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { Dumbbell, Plus, Library, Pencil, Send } from "lucide-react";
import { AssignPlanModal } from "@/components/coach/AssignPlanModal";
import { cn } from "@/lib/utils";
import type { WorkoutPlan } from "@/types";

export default function CoachPlansPage() {
  const { t } = useTranslation();
  const [plans, setPlans]     = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data } = await supabase
          .from("workout_plans")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setPlans(data as WorkoutPlan[]);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-[28px] tracking-wider text-white">
          {t("coach.workoutPlans")}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/coach/library"
            className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white/70 px-3 py-2.5 text-[12px] font-bold uppercase tracking-wider hover:text-white hover:border-white/20 transition-colors"
          >
            <Library size={14} />
            Library
          </Link>
          <Link
            href="/coach/plans/new"
            className="flex items-center gap-2 bg-[#FF6B35] text-void px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus size={16} />
            {t("plans.newPlan")}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white text-[16px] font-semibold mb-2">{t("plans.noPlans")}</p>
          <p className="text-white/40 text-[13px]">{t("plans.noPlansDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] p-4"
            >
              <div className="w-10 h-10 bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={18} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-medium truncate">{plan.name}</p>
                <p className="text-white/40 text-[12px]">
                  {plan.category} · {t(`levels.${plan.level}`)} · {plan.duration_weeks}w
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/coach/plans/${plan.id}/edit`}
                  className={iconBtnClass}
                  title="Edit plan"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setAssigning({ id: plan.id, name: plan.name })}
                  className={cn(iconBtnClass, "text-[#FF6B35] hover:text-[#FF6B35] hover:border-[#FF6B35]/40")}
                  title="Assign to player"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AssignPlanModal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        planId={assigning?.id ?? ""}
        planName={assigning?.name ?? ""}
        planType="workout"
      />
    </div>
  );
}

const iconBtnClass =
  "w-9 h-9 flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 transition-colors";
