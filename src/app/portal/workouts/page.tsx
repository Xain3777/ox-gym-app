"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";
import { OxCheck, OxChevronRight, OxPlay, OxInfo, OxTrophy, OxDumbbell } from "@/components/icons/OxIcons";
import { createBrowserSupabase } from "@/lib/supabase";

// ── MOCK DATA ───────────────────────────────────────────────────
const mockWorkoutDays = [
  {
    label: "اليوم 1", title: "يوم الدفع", isToday: true,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "8-10", machine: "Flat Bench", done: false },
      { name: "Overhead Press", sets: 3, reps: "10-12", machine: "Shoulder Press Machine", done: false },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", machine: "Incline Bench", done: false },
      { name: "Lateral Raises", sets: 4, reps: "12-15", machine: "Dumbbells", done: false },
      { name: "Tricep Pushdowns", sets: 3, reps: "12-15", machine: "Cable Machine", done: false },
      { name: "Cable Flyes", sets: 3, reps: "12-15", machine: "Cable Crossover", done: false },
    ],
  },
  {
    label: "اليوم 2", title: "يوم السحب", isToday: false,
    exercises: [
      { name: "Deadlifts", sets: 4, reps: "6-8", machine: "Barbell", done: false },
      { name: "Barbell Rows", sets: 4, reps: "8-10", machine: "Barbell", done: false },
      { name: "Lat Pulldowns", sets: 3, reps: "10-12", machine: "Lat Pulldown Machine", done: false },
      { name: "Face Pulls", sets: 3, reps: "15-20", machine: "Cable Machine", done: false },
      { name: "Barbell Curls", sets: 3, reps: "10-12", machine: "Barbell", done: false },
      { name: "Hammer Curls", sets: 3, reps: "12-15", machine: "Dumbbells", done: false },
    ],
  },
  {
    label: "اليوم 3", title: "يوم الأرجل", isToday: false,
    exercises: [
      { name: "Squats", sets: 4, reps: "8-10", machine: "Squat Rack", done: false },
      { name: "Leg Press", sets: 4, reps: "10-12", machine: "Leg Press Machine", done: false },
      { name: "Romanian Deadlifts", sets: 3, reps: "10-12", machine: "Barbell", done: false },
      { name: "Leg Curls", sets: 3, reps: "12-15", machine: "Leg Curl Machine", done: false },
      { name: "Calf Raises", sets: 4, reps: "15-20", machine: "Calf Raise Machine", done: false },
    ],
  },
];

// ── LOGGING ─────────────────────────────────────────────────────
async function saveWorkoutLog(dayTitle: string, doneCount: number, totalCount: number, partial: boolean) {
  const entry = {
    workout_day: dayTitle,
    exercises_done: doneCount,
    total_exercises: totalCount,
    partial,
    logged_at: new Date().toISOString(),
  };
  // Persist locally as fallback
  try {
    const prev = JSON.parse(localStorage.getItem("ox-workout-logs") ?? "[]");
    localStorage.setItem("ox-workout-logs", JSON.stringify([...prev, entry]));
  } catch { /* ignore */ }
  // Try Supabase (silent fail if table doesn't exist yet)
  try {
    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("members").select("id").eq("auth_id", user.id).single();
    if (member) {
      await supabase.from("workout_logs").insert({ member_id: member.id, ...entry });
    }
  } catch { /* silent — table may not exist yet */ }
}

// ── PAGE ─────────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const router = useRouter();
  const [days, setDays] = useState(mockWorkoutDays);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [machineHelp, setMachineHelp] = useState<string | null>(null);

  // Finish + quit modals
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showQuitModal, setShowQuitModal]   = useState(false);
  const [finishShownFor, setFinishShownFor] = useState<number | null>(null); // prevent re-showing
  const [logging, setLogging] = useState(false);
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  function toggleExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, di) =>
        di === dayIdx
          ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, done: !ex.done } : ex) }
          : d
      )
    );
  }

  const getDoneCount = useCallback((dayIdx: number) => days[dayIdx].exercises.filter((e) => e.done).length, [days]);
  const isAllDone    = useCallback((dayIdx: number) => getDoneCount(dayIdx) === days[dayIdx].exercises.length, [days, getDoneCount]);

  // Auto-show finish modal when all exercises are ticked
  useEffect(() => {
    if (selectedDay === null) return;
    if (isAllDone(selectedDay) && finishShownFor !== selectedDay) {
      setFinishShownFor(selectedDay);
      // Small delay so the last checkbox animation completes
      const t = setTimeout(() => setShowFinishModal(true), 400);
      return () => clearTimeout(t);
    }
  }, [days, selectedDay, isAllDone, finishShownFor]);

  // ── Log + go back ──────────────────────────────────────────
  async function handleLog(partial: boolean) {
    if (selectedDay === null) return;
    setLogging(true);
    await saveWorkoutLog(
      days[selectedDay].title,
      getDoneCount(selectedDay),
      days[selectedDay].exercises.length,
      partial,
    );
    setLogging(false);
    setLoggedSuccess(true);
    setTimeout(() => {
      setLoggedSuccess(false);
      setShowFinishModal(false);
      setShowQuitModal(false);
      setSelectedDay(null);
    }, 1200);
  }

  function handleBackPress() {
    const doneCount = selectedDay !== null ? getDoneCount(selectedDay) : 0;
    if (doneCount === 0) {
      // Nothing done — exit silently
      setSelectedDay(null);
    } else if (selectedDay !== null && isAllDone(selectedDay)) {
      // Already finished → re-show finish modal
      setShowFinishModal(true);
    } else {
      setShowQuitModal(true);
    }
  }

  // ── Workout Detail View ──────────────────────────────────────
  if (selectedDay !== null) {
    const day = days[selectedDay];
    const doneCount = getDoneCount(selectedDay);
    const totalCount = day.exercises.length;
    const progress = Math.round((doneCount / totalCount) * 100);
    const allDone = doneCount === totalCount;

    return (
      <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
        <div className="absolute top-6 right-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-left z-0">
          <Image src="/fig-squat.png" alt="" fill className="object-contain object-right-top" unoptimized />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
          {/* Custom back button — intercepts to show quit modal */}
          <button
            onClick={handleBackPress}
            className="group flex items-center gap-2 mb-5 -mr-1 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 group-active:scale-95 transition-all duration-200">
              <OxChevronRight size={20} className="text-gold" />
            </div>
            <span className="text-gold text-[14px] font-semibold tracking-wide group-hover:text-gold-high transition-colors">
              رجوع
            </span>
          </button>

          <div className="relative mb-6">
            <p className="text-gold/60 text-[11px] font-bold uppercase tracking-[0.15em]">{day.label}</p>
            <h1 className="text-white font-display text-[32px] tracking-wider leading-none mt-1">
              {day.title}
            </h1>
            <div className="w-20 h-[4px] mt-3 danger-tape-thin" />
          </div>

          {/* Progress bar */}
          <div className={cn(
            "relative bg-white/[0.04] border border-white/[0.06] p-4 mb-6 overflow-hidden",
            allDone && "burn-glow"
          )}>
            {allDone && <div className="absolute top-0 left-0 right-0 h-[4px] danger-tape" />}
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-[13px]">التقدم</p>
              <p className={cn("text-[15px] font-semibold", allDone ? "text-gold" : "text-white")} dir="ltr">
                {doneCount}/{totalCount}
              </p>
            </div>
            <div className="w-full h-2 bg-white/[0.06] overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  allDone ? "bg-gradient-to-r from-[#FF5500] via-gold to-[#FF5500]" : "bg-gold"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {allDone && (
              <p className="text-gold text-[13px] font-bold mt-3 text-center uppercase tracking-wider">
                اكتمل التمرين 🎉
              </p>
            )}
          </div>

          <SubscriptionGate endDate="2026-12-31">
            <div className="space-y-3">
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} className={cn(
                  "relative border p-4 transition-all duration-200 overflow-hidden",
                  ex.done ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06]"
                )}>
                  {ex.done && <div className="absolute top-0 right-0 w-[3px] h-full bg-gold" />}
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleExercise(selectedDay, exIdx)}
                      className={cn(
                        "w-11 h-11 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                        ex.done
                          ? "bg-gold text-void"
                          : "bg-white/[0.06] border border-white/[0.08] text-white/20 hover:border-gold/40 hover:text-gold"
                      )}
                      style={{ minHeight: "44px", minWidth: "44px" }}
                    >
                      <OxCheck size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[17px] font-semibold", ex.done ? "text-white/40 line-through" : "text-white")}>
                        {ex.name}
                      </p>
                      <p className="text-gold text-[15px] font-medium mt-1" dir="ltr">
                        {ex.sets} sets × {ex.reps} reps
                      </p>
                    </div>
                  </div>
                  {!ex.done && (
                    <button
                      onClick={() => setMachineHelp(ex.machine)}
                      className="mt-3 me-[60px] flex items-center gap-2 text-white/30 hover:text-gold text-[13px] transition-colors"
                    >
                      <OxInfo size={14} />
                      كيفية استخدام الجهاز
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SubscriptionGate>
        </div>

        {/* ── Finish / Log modal ──────────────────────────────── */}
        {showFinishModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-iron w-full max-w-md p-6 pb-10 sm:pb-6 border border-white/[0.08]" dir="rtl">
              <div className="w-10 h-1 bg-white/20 mx-auto mb-6 sm:hidden" />
              {loggedSuccess ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                    <OxCheck size={28} className="text-gold" />
                  </div>
                  <p className="text-gold font-display text-[22px] tracking-wider">تم الحفظ!</p>
                  <p className="text-white/40 text-[14px] mt-2">تم تسجيل تمرينك بنجاح.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                      <OxTrophy size={28} className="text-gold" />
                    </div>
                    <h3 className="text-white font-display text-[24px] tracking-wider leading-none">
                      أحسنت! 💪
                    </h3>
                    <p className="text-white/40 text-[14px] mt-2 text-center leading-relaxed">
                      أكملت جميع تمارين {day.title}.<br />هل تريد تسجيل هذا التمرين؟
                    </p>
                  </div>

                  {/* Workout summary */}
                  <div className="bg-white/[0.03] border border-white/[0.06] p-4 mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <OxDumbbell size={18} className="text-gold" />
                      <div>
                        <p className="text-white text-[14px] font-semibold">{day.title}</p>
                        <p className="text-white/30 text-[12px]">{day.label}</p>
                      </div>
                    </div>
                    <span className="text-gold font-bold text-[15px]" dir="ltr">{doneCount}/{totalCount}</span>
                  </div>

                  <button
                    onClick={() => handleLog(false)}
                    disabled={logging}
                    className="w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-all duration-200 flex items-center justify-center gap-2 mb-3"
                    style={{ minHeight: "56px" }}
                  >
                    <OxCheck size={20} />
                    {logging ? "جاري الحفظ..." : "نعم، سجّل التمرين"}
                  </button>
                  <button
                    onClick={() => { setShowFinishModal(false); setSelectedDay(null); }}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 font-semibold text-[15px] py-3.5 transition-colors"
                  >
                    لا، خروج بدون تسجيل
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Quit confirmation modal ──────────────────────────── */}
        {showQuitModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-iron w-full max-w-md p-6 pb-10 sm:pb-6 border border-white/[0.08]" dir="rtl">
              <div className="w-10 h-1 bg-white/20 mx-auto mb-6 sm:hidden" />
              {loggedSuccess ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                    <OxCheck size={28} className="text-gold" />
                  </div>
                  <p className="text-gold font-display text-[22px] tracking-wider">تم الحفظ!</p>
                  <p className="text-white/40 text-[14px] mt-2">تم تسجيل تقدمك بنجاح.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-white font-display text-[22px] tracking-wider leading-none mb-2">
                    هل تريد حفظ تقدمك؟
                  </h3>
                  <p className="text-white/40 text-[14px] mb-6 leading-relaxed">
                    أكملت {doneCount} من أصل {totalCount} تمارين. يمكننا حفظ ما أنجزته.
                  </p>
                  <button
                    onClick={() => handleLog(true)}
                    disabled={logging}
                    className="w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 transition-all duration-200 flex items-center justify-center gap-2 mb-3"
                    style={{ minHeight: "56px" }}
                  >
                    <OxCheck size={20} />
                    {logging ? "جاري الحفظ..." : "نعم، احفظ التقدم"}
                  </button>
                  <button
                    onClick={() => { setShowQuitModal(false); setSelectedDay(null); }}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 font-semibold text-[15px] py-3.5 transition-colors"
                  >
                    لا، خروج بدون حفظ
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Machine Help Modal */}
        {machineHelp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMachineHelp(null)}>
            <div className="bg-iron w-full max-w-md p-6 pb-10 sm:pb-6 border border-white/[0.08]" dir="rtl" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/20 mx-auto mb-6 sm:hidden" />
              <div className="w-full h-40 bg-white/[0.04] flex items-center justify-center mb-5">
                <OxPlay size={32} className="text-white/20" />
              </div>
              <h3 className="text-white text-[20px] font-bold">{machineHelp}</h3>
              <p className="text-white/40 text-[15px] mt-2 leading-relaxed">
                اضبط ارتفاع المقعد. حافظ على استقامة ظهرك. أمسك بالمقابض بإحكام. اضغط بحركة منضبطة. أخرج الهواء عند بذل الجهد.
              </p>
              <button onClick={() => setMachineHelp(null)} className="w-full mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 transition-colors" style={{ minHeight: "56px" }}>
                فهمت
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Day List View ─────────────────────────────────────────────
  return (
    <div className="relative min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="absolute top-6 right-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-left z-0">
        <Image src="/fig-flex.png" alt="" fill className="object-contain object-right-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <div className="relative mb-6">
          <h1 className="text-white font-display text-[32px] tracking-wider leading-none">تماريني</h1>
          <div className="w-24 h-[4px] mt-3 danger-tape-thin" />
        </div>

        <div className="space-y-3">
          {days.map((day, dayIdx) => {
            const allDone = isAllDone(dayIdx);
            const doneCount = getDoneCount(dayIdx);
            return (
              <button
                key={dayIdx}
                onClick={() => setSelectedDay(dayIdx)}
                className={cn(
                  "relative w-full border p-5 flex items-center justify-between text-right transition-all duration-200 active:scale-[0.98] overflow-hidden",
                  allDone && "burn-glow",
                  day.isToday ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                )}
                style={{ minHeight: "80px" }}
              >
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="flex gap-0 -mt-[0.5px]">
                    <MiniChevron className={day.isToday ? "text-gold/40" : "text-white/[0.06]"} />
                    <MiniChevron className={day.isToday ? "text-gold/25" : "text-white/[0.04]"} />
                    <MiniChevron className={day.isToday ? "text-gold/40" : "text-white/[0.06]"} />
                  </div>
                </div>

                {day.isToday && (
                  <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gold" />
                )}

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center flex-shrink-0",
                    allDone ? "bg-gold text-void" : day.isToday ? "bg-gold/15 text-gold" : "bg-white/[0.06] text-white/30"
                  )}>
                    {allDone ? <OxCheck size={20} /> : <OxPlay size={18} />}
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-[12px] font-medium uppercase tracking-wider">
                      {day.label}{day.isToday && " · اليوم"}
                    </p>
                    <p className={cn("text-[18px] font-semibold mt-0.5", day.isToday ? "text-white" : "text-white/80")}>
                      {day.title}
                    </p>
                    <p className="text-white/35 text-[13px] mt-0.5">
                      {day.exercises.length} تمرين{doneCount > 0 && !allDone && ` · ${doneCount} تم`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allDone ? (
                    <span className="text-gold text-[12px] font-bold uppercase tracking-wider">تم ✓</span>
                  ) : (
                    <OxChevronRight size={18} className="text-white/20 rotate-180" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniChevron({ className }: { className?: string }) {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8" fill="currentColor" className={className}>
      <path d="M0 0L10 6L20 0V2L10 8L0 2V0Z" />
    </svg>
  );
}
