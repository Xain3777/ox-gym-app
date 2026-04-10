"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxChevronRight, OxPlay, OxInfo } from "@/components/icons/OxIcons";

// ── MOCK DATA ───────────────────────────────────────────────────
const mockWorkoutDays = [
  {
    label: "Day 1", title: "Push Day", isToday: true,
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
    label: "Day 2", title: "Pull Day", isToday: false,
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
    label: "Day 3", title: "Leg Day", isToday: false,
    exercises: [
      { name: "Squats", sets: 4, reps: "8-10", machine: "Squat Rack", done: false },
      { name: "Leg Press", sets: 4, reps: "10-12", machine: "Leg Press Machine", done: false },
      { name: "Romanian Deadlifts", sets: 3, reps: "10-12", machine: "Barbell", done: false },
      { name: "Leg Curls", sets: 3, reps: "12-15", machine: "Leg Curl Machine", done: false },
      { name: "Calf Raises", sets: 4, reps: "15-20", machine: "Calf Raise Machine", done: false },
    ],
  },
];

export default function WorkoutsPage() {
  const [days, setDays] = useState(mockWorkoutDays);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [machineHelp, setMachineHelp] = useState<string | null>(null);

  function toggleExercise(dayIdx: number, exIdx: number) {
    setDays((prev) =>
      prev.map((d, di) =>
        di === dayIdx
          ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, done: !ex.done } : ex) }
          : d
      )
    );
  }

  function getDoneCount(dayIdx: number) { return days[dayIdx].exercises.filter((e) => e.done).length; }
  function isAllDone(dayIdx: number) { return getDoneCount(dayIdx) === days[dayIdx].exercises.length; }

  // ── Workout Detail View ────────────────────────────────────
  if (selectedDay !== null) {
    const day = days[selectedDay];
    const doneCount = getDoneCount(selectedDay);
    const totalCount = day.exercises.length;
    const progress = Math.round((doneCount / totalCount) * 100);
    const allDone = doneCount === totalCount;

    return (
      <div className="relative min-h-full pb-28 lg:pb-10">
        {/* Page bull figure — top left, 70% visible */}
        <div className="absolute top-6 left-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
          <Image src="/fig-squat.png" alt="" fill className="object-contain object-left-top" unoptimized />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
          <BackArrow href="/portal/workouts" label="Back" />

          <div className="relative mb-6">
            <p className="text-gold/60 text-[11px] font-bold uppercase tracking-[0.15em]">{day.label}</p>
            <h1 className="text-white font-display text-[32px] tracking-wider leading-none mt-1">
              {day.title.toUpperCase()}
            </h1>
            {/* Danger tape accent */}
            <div className="w-20 h-[4px] mt-3 danger-tape-thin" />
          </div>

          {/* Progress bar card */}
          <div className={cn(
            "relative bg-white/[0.04] border border-white/[0.06] p-4 mb-6 overflow-hidden",
            allDone && "burn-glow"
          )}>
            {/* Chevron arrows on top when complete */}
            {allDone && (
              <div className="absolute top-0 left-0 right-0 h-[4px] danger-tape" />
            )}
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-[13px]">Progress</p>
              <p className={cn("text-[15px] font-semibold", allDone ? "text-gold" : "text-white")}>
                {doneCount}/{totalCount}
              </p>
            </div>
            <div className="w-full h-2 bg-white/[0.06] overflow-hidden">
              <div className={cn(
                "h-full transition-all duration-500 ease-out",
                allDone ? "bg-gradient-to-r from-[#FF5500] via-gold to-[#FF5500]" : "bg-gold"
              )} style={{ width: `${progress}%` }} />
            </div>
            {allDone && (
              <p className="text-gold text-[13px] font-bold mt-3 text-center uppercase tracking-wider">
                Workout Complete
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
                  {/* Danger tape accent on completed */}
                  {ex.done && (
                    <div className="absolute top-0 left-0 w-[3px] h-full bg-gold" />
                  )}
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
                      <p className="text-gold text-[15px] font-medium mt-1">{ex.sets} sets × {ex.reps} reps</p>
                    </div>
                  </div>
                  {!ex.done && (
                    <button
                      onClick={() => setMachineHelp(ex.machine)}
                      className="mt-3 ml-[60px] flex items-center gap-2 text-white/30 hover:text-gold text-[13px] transition-colors"
                    >
                      <OxInfo size={14} />
                      How to use machine
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SubscriptionGate>
        </div>

        {/* Machine Help Modal */}
        {machineHelp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMachineHelp(null)}>
            <div className="bg-iron w-full max-w-md p-6 pb-10 sm:pb-6 border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-white/20 mx-auto mb-6 sm:hidden" />
              <div className="w-full h-40 bg-white/[0.04] flex items-center justify-center mb-5">
                <OxPlay size={32} className="text-white/20" />
              </div>
              <h3 className="text-white text-[20px] font-bold">{machineHelp}</h3>
              <p className="text-white/40 text-[15px] mt-2 leading-relaxed">
                Adjust the seat height. Keep your back flat against the pad.
                Grip the handles firmly. Push with controlled motion. Exhale on effort.
              </p>
              <button onClick={() => setMachineHelp(null)} className="w-full mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 transition-colors" style={{ minHeight: "56px" }}>
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Day List View ──────────────────────────────────────────
  return (
    <div className="relative min-h-full pb-28 lg:pb-10">
      {/* Page bull figure — top left, 70% visible */}
      <div className="absolute top-6 left-2 w-28 h-36 opacity-70 pointer-events-none select-none fig-fade-right z-0">
        <Image src="/fig-flex.png" alt="" fill className="object-contain object-left-top" unoptimized />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <div className="relative mb-6">
          <h1 className="text-white font-display text-[32px] tracking-wider leading-none">MY WORKOUTS</h1>
          {/* Danger tape accent */}
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
                  "relative w-full border p-5 flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] overflow-hidden",
                  allDone && "burn-glow",
                  day.isToday ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                )}
                style={{ minHeight: "80px" }}
              >
                {/* Chevron arrows on top of each card */}
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="flex gap-0 -mt-[0.5px]">
                    <MiniChevron className={day.isToday ? "text-gold/40" : "text-white/[0.06]"} />
                    <MiniChevron className={day.isToday ? "text-gold/25" : "text-white/[0.04]"} />
                    <MiniChevron className={day.isToday ? "text-gold/40" : "text-white/[0.06]"} />
                  </div>
                </div>

                {/* Gold left accent bar for today */}
                {day.isToday && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold" />
                )}

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center flex-shrink-0",
                    allDone ? "bg-gold text-void" : day.isToday ? "bg-gold/15 text-gold" : "bg-white/[0.06] text-white/30"
                  )}>
                    {allDone ? <OxCheck size={20} /> : <OxPlay size={18} />}
                  </div>
                  <div>
                    <p className="text-white/40 text-[12px] font-medium uppercase tracking-wider">
                      {day.label} {day.isToday && "· Today"}
                    </p>
                    <p className={cn("text-[18px] font-semibold mt-0.5", day.isToday ? "text-white" : "text-white/80")}>
                      {day.title}
                    </p>
                    <p className="text-white/35 text-[13px] mt-0.5">
                      {day.exercises.length} exercises{doneCount > 0 && !allDone && ` · ${doneCount} done`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allDone ? (
                    <span className="text-gold text-[12px] font-bold uppercase tracking-wider">Done</span>
                  ) : (
                    <OxChevronRight size={18} className="text-white/20" />
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

// ── Mini chevron arrow for card tops ─────────────────────────
function MiniChevron({ className }: { className?: string }) {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8" fill="currentColor" className={className}>
      <path d="M0 0L10 6L20 0V2L10 8L0 2V0Z" />
    </svg>
  );
}
