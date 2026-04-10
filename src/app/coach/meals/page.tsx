"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { UtensilsCrossed, Plus } from "lucide-react";
import type { MealPlan } from "@/types";

export default function CoachMealsPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { data } = await supabase
          .from("meal_plans")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setPlans(data as MealPlan[]);
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] tracking-wider text-white">{t("coach.mealPlans")}</h1>
        <Link
          href="/meal-plans/new"
          className="flex items-center gap-2 bg-[#FF6B35] text-void px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors"
        >
          <Plus size={16} />
          {t("mealPlans.newPlan")}
        </Link>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <UtensilsCrossed size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white text-[16px] font-semibold mb-2">{t("mealPlans.noPlans")}</p>
          <p className="text-white/40 text-[13px]">{t("mealPlans.noPlansDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] p-4"
            >
              <div className="w-10 h-10 bg-green-400/10 flex items-center justify-center">
                <UtensilsCrossed size={18} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-medium truncate">{plan.name}</p>
                <p className="text-white/40 text-[12px]">
                  {plan.goal} · {plan.calories_daily} kcal
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
