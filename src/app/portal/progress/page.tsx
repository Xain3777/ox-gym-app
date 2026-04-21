"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxScale, OxDumbbell, OxFlame, OxCalendar, OxTrophy } from "@/components/icons/OxIcons";
import { createBrowserSupabase } from "@/lib/supabase";

type WorkoutLog = {
  id: string;
  workout_day: string;
  exercises_done: number;
  total_exercises: number;
  partial: boolean;
  logged_at: string;
};

type WeekBucket = { week: string; count: number; label: string };

function getWeekBuckets(logs: WorkoutLog[]): WeekBucket[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (5 - i) * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);

    const count = logs.filter((l) => {
      const d = new Date(l.logged_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    const label = weekStart.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
    return { week: `أ${i + 1}`, count, label };
  });
}

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<"timeline" | "chart">("timeline");
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const supabase = createBrowserSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!member) { setLoading(false); return; }

        const { data } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("member_id", member.id)
          .order("logged_at", { ascending: false });

        setLogs(data ?? []);
      } catch { /* table might not exist yet */ }
      setLoading(false);
    }
    loadLogs();
  }, []);

  const completedLogs = logs.filter((l) => !l.partial);
  const partialLogs   = logs.filter((l) => l.partial);
  const totalDone     = completedLogs.length;

  const weeklyBuckets = getWeekBuckets(logs);
  const maxCount = Math.max(...weeklyBuckets.map((w) => w.count), 1);

  const stats = [
    { label: "التمارين المكتملة", value: String(totalDone), icon: OxDumbbell },
    { label: "جلسات جزئية", value: String(partialLogs.length), icon: OxFlame },
    { label: "إجمالي السجلات", value: String(logs.length), icon: OxScale },
    { label: "آخر تمرين", value: logs[0] ? new Date(logs[0].logged_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }) : "—", icon: OxCalendar },
  ];

  return (
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" label="رجوع" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">التقدم</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-gold" />
                  <p className="text-white/30 text-[11px] font-medium tracking-wider">{stat.label}</p>
                </div>
                <p className="text-[22px] font-bold text-white" dir="ltr">
                  {loading ? <span className="text-white/20">...</span> : stat.value}
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
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 h-16 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && logs.length === 0 && (
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-8 text-center">
                <OxDumbbell size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-[15px]">لا توجد سجلات تمرين بعد.</p>
                <p className="text-white/20 text-[13px] mt-1">سجّل تمرينك الأول من صفحة التمارين.</p>
              </div>
            )}
            {!loading && logs.map((log, i) => (
              <div key={log.id ?? i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  log.partial ? "bg-white/[0.06] text-white/40" : "bg-gold/10 text-gold"
                )}>
                  {log.partial ? <OxFlame size={18} /> : <OxTrophy size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[15px] font-medium">
                    {log.partial ? `جزئي — ${log.workout_day}` : `اكتمل — ${log.workout_day}`}
                  </p>
                  <p className="text-white/30 text-[12px] mt-0.5" dir="ltr">
                    {log.exercises_done}/{log.total_exercises} تمارين ·{" "}
                    {new Date(log.logged_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "chart" && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-6">
            <p className="text-white text-[17px] font-semibold mb-1">التمارين الأسبوعية</p>
            <p className="text-white/30 text-[13px] mb-6">آخر 6 أسابيع</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-white/20 text-[14px]">جاري التحميل...</p>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-48" dir="ltr">
                {weeklyBuckets.map((week) => {
                  const heightPercent = (week.count / maxCount) * 100;
                  return (
                    <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-white text-[13px] font-bold">{week.count || ""}</span>
                      <div className="w-full flex items-end" style={{ height: "140px" }}>
                        <div
                          className={cn("w-full rounded-sm transition-all duration-500", week.count > 0 ? "bg-gold hover:bg-gold-high" : "bg-white/[0.06]")}
                          style={{ height: week.count > 0 ? `${Math.max(heightPercent, 4)}%` : "4%" }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-white/40 text-[11px] font-medium">{week.week}</p>
                        <p className="text-white/20 text-[9px]">{week.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && logs.length === 0 && (
              <p className="text-white/20 text-[13px] text-center -mt-4">سجّل تمارينك لتظهر هنا</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
