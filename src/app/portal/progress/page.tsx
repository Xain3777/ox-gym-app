"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxScale, OxTrendDown, OxDumbbell, OxTrophy, OxFlame, OxCalendar, OxTarget, OxAward } from "@/components/icons/OxIcons";

const stats = [
  { label: "الوزن الابتدائي", value: "92 kg", icon: OxScale, change: null },
  { label: "الوزن الحالي", value: "85 kg", icon: OxScale, change: null },
  { label: "تغير الوزن", value: "-7 kg", icon: OxTrendDown, change: "down" },
  { label: "التمارين المنجزة", value: "48", icon: OxDumbbell, change: null },
];

const timeline = [
  { date: "25 مارس 2026", event: "رقم قياسي ديدليفت: 140kg × 3 تكرارات", type: "achievement", icon: OxTrophy },
  { date: "20 مارس 2026", event: "أكملت 4 تمارين هذا الأسبوع", type: "workout", icon: OxFlame },
  { date: "15 مارس 2026", event: "فحص InBody: نسبة الدهون 18.2%", type: "measurement", icon: OxTarget },
  { date: "8 مارس 2026", event: "تفعيل خطة وجبات جديدة", type: "plan", icon: OxCalendar },
  { date: "1 مارس 2026", event: "رقم قياسي ضغط المقعدة: 100kg × 1 تكرار", type: "achievement", icon: OxAward },
  { date: "22 فبراير 2026", event: "تحقيق هدف الوزن: أقل من 86kg", type: "milestone", icon: OxTrophy },
];

const typeColor: Record<string, string> = {
  achievement: "bg-gold/10 text-gold",
  workout: "bg-success/[0.12] text-success",
  measurement: "bg-sky-400/10 text-sky-400",
  plan: "bg-purple-400/10 text-purple-400",
  milestone: "bg-danger/[0.08] text-danger",
};

const weeklyWorkouts = [
  { week: "أ1", count: 3, label: "10 فبر" }, { week: "أ2", count: 5, label: "17 فبر" },
  { week: "أ3", count: 4, label: "24 فبر" }, { week: "أ4", count: 4, label: "3 مارس" },
  { week: "أ5", count: 6, label: "10 مارس" }, { week: "أ6", count: 4, label: "17 مارس" },
];
const maxCount = Math.max(...weeklyWorkouts.map((w) => w.count));

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<"timeline" | "chart">("timeline");

  return (
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" label="رجوع" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">التقدم</h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-gold" />
                  <p className="text-white/30 text-[11px] font-medium tracking-wider">{stat.label}</p>
                </div>
                <p className={cn("text-[22px] font-bold", stat.change === "down" ? "text-gold" : "text-white")} dir="ltr">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-white/[0.04] rounded-lg p-1 flex mb-6">
          <button
            onClick={() => setActiveTab("timeline")}
            className={cn("flex-1 py-2.5 rounded-md text-[14px] font-semibold transition-all duration-200", activeTab === "timeline" ? "bg-gold text-void shadow-lg shadow-gold/20" : "text-white/40")}
          >
            الجدول الزمني
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={cn("flex-1 py-2.5 rounded-md text-[14px] font-semibold transition-all duration-200", activeTab === "chart" ? "bg-gold text-void shadow-lg shadow-gold/20" : "text-white/40")}
          >
            الرسم البياني
          </button>
        </div>

        {activeTab === "timeline" && (
          <div className="space-y-3">
            {timeline.map((entry, i) => {
              const Icon = entry.icon;
              return (
                <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", typeColor[entry.type])}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[15px] font-medium">{entry.event}</p>
                    <p className="text-white/30 text-[12px] mt-0.5">{entry.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "chart" && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-6">
            <p className="text-white text-[17px] font-semibold mb-1">التمارين الأسبوعية</p>
            <p className="text-white/30 text-[13px] mb-6">آخر 6 أسابيع</p>
            <div className="flex items-end justify-between gap-3 h-48" dir="ltr">
              {weeklyWorkouts.map((week) => {
                const heightPercent = (week.count / maxCount) * 100;
                return (
                  <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-white text-[13px] font-bold">{week.count}</span>
                    <div className="w-full flex items-end" style={{ height: "140px" }}>
                      <div className="w-full bg-gold rounded-sm transition-all duration-500 hover:bg-gold-high" style={{ height: `${heightPercent}%` }} />
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-[11px] font-medium">{week.week}</p>
                      <p className="text-white/20 text-[9px]">{week.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
