"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Dumbbell, Timer, Zap, Target, Shield, Heart,
  Activity, Flame, X, Check, Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { WorkoutPlan, WorkoutDay, WorkoutExercise } from "@/types";

// ═══════════════════════════════════════════════════════════════
// PREDEFINED DATA
// ═══════════════════════════════════════════════════════════════

const DIFFICULTY_OPTIONS = [
  { value: "beginner",     label: "Beginner",     icon: Shield,   color: "text-success",  borderColor: "border-success/30", bgColor: "bg-success/10" },
  { value: "intermediate", label: "Intermediate", icon: Target,   color: "text-gold",     borderColor: "border-gold/30",    bgColor: "bg-gold/10" },
  { value: "advanced",     label: "Advanced",     icon: Flame,    color: "text-danger",   borderColor: "border-danger/30",  bgColor: "bg-danger/10" },
] as const;

const DURATION_PRESETS = [15, 30, 45, 60];

const MUSCLE_GROUPS = [
  { id: "chest",     label: "Chest",     icon: "💪" },
  { id: "back",      label: "Back",      icon: "🔙" },
  { id: "legs",      label: "Legs",      icon: "🦵" },
  { id: "arms",      label: "Arms",      icon: "💪" },
  { id: "shoulders", label: "Shoulders", icon: "🏋️" },
  { id: "core",      label: "Core",      icon: "🎯" },
  { id: "full-body", label: "Full Body", icon: "⚡" },
];

const EQUIPMENT_OPTIONS = [
  { id: "bodyweight",       label: "Bodyweight",       icon: Activity },
  { id: "dumbbells",        label: "Dumbbells",        icon: Dumbbell },
  { id: "barbell",          label: "Barbell",          icon: Dumbbell },
  { id: "machines",         label: "Machines",         icon: Zap },
  { id: "resistance-bands", label: "Resistance Bands", icon: Target },
  { id: "kettlebell",       label: "Kettlebell",       icon: Dumbbell },
];

const EXERCISE_LIBRARY: Record<string, { name: string; defaultSets: number; defaultReps: string }[]> = {
  chest: [
    { name: "Barbell Bench Press",    defaultSets: 4, defaultReps: "8-10" },
    { name: "Incline Dumbbell Press", defaultSets: 3, defaultReps: "10-12" },
    { name: "Cable Chest Fly",        defaultSets: 3, defaultReps: "12-15" },
    { name: "Push-Ups",               defaultSets: 3, defaultReps: "15-20" },
    { name: "Dumbbell Pullover",      defaultSets: 3, defaultReps: "10-12" },
    { name: "Machine Chest Press",    defaultSets: 3, defaultReps: "10-12" },
    { name: "Decline Bench Press",    defaultSets: 3, defaultReps: "8-10" },
  ],
  back: [
    { name: "Pull-Ups",              defaultSets: 4, defaultReps: "8-12" },
    { name: "Barbell Row",           defaultSets: 4, defaultReps: "8-10" },
    { name: "Lat Pulldown",          defaultSets: 3, defaultReps: "10-12" },
    { name: "Seated Cable Row",      defaultSets: 3, defaultReps: "10-12" },
    { name: "Dumbbell Row",          defaultSets: 3, defaultReps: "10-12" },
    { name: "Face Pulls",            defaultSets: 3, defaultReps: "15" },
    { name: "T-Bar Row",             defaultSets: 3, defaultReps: "8-10" },
    { name: "Deadlift",              defaultSets: 4, defaultReps: "5" },
  ],
  legs: [
    { name: "Barbell Squat",         defaultSets: 4, defaultReps: "6-8" },
    { name: "Leg Press",             defaultSets: 4, defaultReps: "10-12" },
    { name: "Romanian Deadlift",     defaultSets: 3, defaultReps: "10-12" },
    { name: "Walking Lunges",        defaultSets: 3, defaultReps: "12 each" },
    { name: "Leg Extension",         defaultSets: 3, defaultReps: "12-15" },
    { name: "Leg Curl",              defaultSets: 3, defaultReps: "10-12" },
    { name: "Calf Raises",           defaultSets: 4, defaultReps: "15-20" },
    { name: "Bulgarian Split Squat", defaultSets: 3, defaultReps: "10 each" },
    { name: "Hip Thrust",            defaultSets: 3, defaultReps: "10-12" },
  ],
  arms: [
    { name: "Barbell Curl",            defaultSets: 3, defaultReps: "10-12" },
    { name: "Hammer Curl",             defaultSets: 3, defaultReps: "10-12" },
    { name: "Tricep Pushdown",         defaultSets: 3, defaultReps: "12-15" },
    { name: "Overhead Tricep Extension", defaultSets: 3, defaultReps: "10-12" },
    { name: "Preacher Curl",           defaultSets: 3, defaultReps: "10-12" },
    { name: "Tricep Dips",             defaultSets: 3, defaultReps: "10-15" },
    { name: "Concentration Curl",      defaultSets: 3, defaultReps: "12" },
    { name: "Skull Crushers",          defaultSets: 3, defaultReps: "10-12" },
  ],
  shoulders: [
    { name: "Overhead Press",     defaultSets: 4, defaultReps: "6-8" },
    { name: "Lateral Raises",     defaultSets: 3, defaultReps: "12-15" },
    { name: "Front Raises",       defaultSets: 3, defaultReps: "12" },
    { name: "Arnold Press",       defaultSets: 3, defaultReps: "10-12" },
    { name: "Rear Delt Fly",      defaultSets: 3, defaultReps: "15" },
    { name: "Upright Row",        defaultSets: 3, defaultReps: "10-12" },
    { name: "Shrugs",             defaultSets: 3, defaultReps: "12-15" },
  ],
  core: [
    { name: "Plank",              defaultSets: 3, defaultReps: "60s" },
    { name: "Hanging Leg Raise",  defaultSets: 3, defaultReps: "12-15" },
    { name: "Cable Crunch",       defaultSets: 3, defaultReps: "15-20" },
    { name: "Russian Twist",      defaultSets: 3, defaultReps: "20" },
    { name: "Ab Wheel Rollout",   defaultSets: 3, defaultReps: "10-12" },
    { name: "Mountain Climbers",  defaultSets: 3, defaultReps: "30s" },
    { name: "Dead Bug",           defaultSets: 3, defaultReps: "12 each" },
  ],
  "full-body": [
    { name: "Clean & Press",      defaultSets: 4, defaultReps: "5" },
    { name: "Burpees",            defaultSets: 3, defaultReps: "15" },
    { name: "Thrusters",          defaultSets: 3, defaultReps: "10" },
    { name: "Kettlebell Swing",   defaultSets: 3, defaultReps: "15" },
    { name: "Turkish Get-Up",     defaultSets: 3, defaultReps: "5 each" },
    { name: "Man Makers",         defaultSets: 3, defaultReps: "8" },
  ],
};

const REST_OPTIONS = ["30s", "45s", "60s", "90s", "120s"];
const REPS_PRESETS = ["5", "8", "10", "12", "15", "AMRAP"];

const SPLIT_OPTIONS = [
  { value: "3-day", label: "3-Day Split", days: ["Day 1 — Push", "Day 2 — Pull", "Day 3 — Legs"] },
  { value: "4-day", label: "4-Day Split", days: ["Day 1 — Push", "Day 2 — Pull", "Day 3 — Legs", "Day 4 — Upper"] },
  { value: "5-day", label: "5-Day Split", days: ["Day 1 — Chest", "Day 2 — Back", "Day 3 — Legs", "Day 4 — Shoulders", "Day 5 — Arms"] },
  { value: "6-day", label: "6-Day Split", days: ["Day 1 — Push", "Day 2 — Pull", "Day 3 — Legs", "Day 4 — Push", "Day 5 — Pull", "Day 6 — Legs"] },
] as const;

const TAG_OPTIONS = [
  { id: "strength",  label: "Strength",  color: "text-gold" },
  { id: "fat-loss",  label: "Fat Loss",  color: "text-danger" },
  { id: "mobility",  label: "Mobility",  color: "text-success" },
  { id: "rehab",     label: "Rehab",     color: "text-muted" },
  { id: "endurance", label: "Endurance", color: "text-gold" },
  { id: "hypertrophy", label: "Hypertrophy", color: "text-danger" },
];

// ═══════════════════════════════════════════════════════════════
// FORM STATE
// ═══════════════════════════════════════════════════════════════

interface SelectedExercise extends WorkoutExercise {
  rest: string;
}

interface PlanFormState {
  name:             string;
  description:      string;
  level:            "beginner" | "intermediate" | "advanced";
  duration:         number;
  customDuration:   boolean;
  workoutDuration:  number;
  cardioDuration:   number;
  splitType:        string;
  muscleGroups:     string[];
  customMuscle:     string;
  equipment:        string[];
  customEquipment:  string;
  created_by:       string;
  days:             {
    day: string;
    exercises: SelectedExercise[];
  }[];
  notes:            string;
  tags:             string[];
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CreatePlanForm({
  initialData,
}: {
  initialData?: Partial<WorkoutPlan>;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const isEdit = !!initialData?.id;

  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showOtherMuscle, setShowOtherMuscle] = useState(false);
  const [showOtherEquipment, setShowOtherEquipment] = useState(false);
  const [activeMuscleFilter, setActiveMuscleFilter] = useState<string>("chest");

  // Parse initial data for editing
  const initialDays = (initialData?.content as any[])?.map((d) => ({
    day: d.day,
    exercises: d.exercises.map((ex: any) => ({
      ...ex,
      rest: ex.rest || "60s",
    })),
  })) ?? [{ day: "Day 1", exercises: [] }];

  const [form, setForm] = useState<PlanFormState>({
    name:            initialData?.name           ?? "",
    description:     "",
    level:           initialData?.level          ?? "intermediate",
    duration:        (initialData?.duration_weeks ?? 4) * 7,
    customDuration:  false,
    workoutDuration: 60,
    cardioDuration:  15,
    splitType:       "",
    muscleGroups:    initialData?.category ? initialData.category.split(" · ").map(s => s.toLowerCase().trim()) : [],
    customMuscle:    "",
    equipment:       [],
    customEquipment: "",
    created_by:      initialData?.created_by     ?? "",
    days:            initialDays,
    notes:           "",
    tags:            [],
  });

  // ── FIELD HELPERS ─────────────────────────────────────────
  function setField<K extends keyof PlanFormState>(key: K, val: PlanFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggleArrayItem(key: "muscleGroups" | "equipment" | "tags", item: string) {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
  }

  // ── DAY HELPERS ───────────────────────────────────────────
  function addDay() {
    setForm((prev) => ({
      ...prev,
      days: [...prev.days, { day: `Day ${prev.days.length + 1}`, exercises: [] }],
    }));
  }

  function removeDay(di: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.filter((_, i) => i !== di),
    }));
  }

  function updateDayName(di: number, name: string) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => i === di ? { ...d, day: name } : d),
    }));
  }

  // ── EXERCISE HELPERS ──────────────────────────────────────
  function addExerciseToDay(di: number, exercise: { name: string; defaultSets: number; defaultReps: string }) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) =>
        i === di
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                { name: exercise.name, sets: exercise.defaultSets, reps: exercise.defaultReps, rest: "60s", notes: "" },
              ],
            }
          : d
      ),
    }));
  }

  function addCustomExercise(di: number, name: string) {
    if (!name.trim()) return;
    addExerciseToDay(di, { name: name.trim(), defaultSets: 3, defaultReps: "10" });
  }

  function removeExercise(di: number, ei: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) =>
        i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d
      ),
    }));
  }

  function updateExercise(di: number, ei: number, key: keyof SelectedExercise, val: string | number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((ex, j) => j === ei ? { ...ex, [key]: val } : ex) }
          : d
      ),
    }));
  }

  // ── SUBMIT ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toastError("Name required", "Please enter a plan name.");
      return;
    }
    if (form.days.every(d => d.exercises.length === 0)) {
      toastError("No exercises", "Add at least one exercise to the plan.");
      return;
    }

    setLoading(true);
    try {
      const category = form.muscleGroups.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(" · ") ||
        (form.customMuscle ? form.customMuscle : "General");

      const payload = {
        name:           form.name,
        category,
        level:          form.level,
        duration_weeks: Math.ceil(form.duration / 7) || 4,
        content:        form.days.map(d => ({
          day: d.day,
          exercises: d.exercises.map(ex => ({
            name:  ex.name,
            sets:  ex.sets,
            reps:  ex.reps,
            notes: ex.notes || (ex.rest !== "60s" ? `Rest: ${ex.rest}` : ""),
          })),
        })),
        created_by: form.created_by,
      };

      const url    = isEdit ? `/api/plans/${initialData!.id}` : "/api/plans";
      const method = isEdit ? "PATCH" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toastError("Save failed", data.error ?? "Please try again.");
        return;
      }

      success(
        isEdit ? "Plan updated" : "Plan created",
        `${form.name} has been saved.`,
      );
      router.push("/plans");
      router.refresh();
    } catch {
      toastError("Network error", "Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Get filtered exercises for display ────────────────────
  const getFilteredExercises = useCallback(() => {
    const exercises = EXERCISE_LIBRARY[activeMuscleFilter] ?? [];
    if (!exerciseSearch.trim()) return exercises;
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
  }, [activeMuscleFilter, exerciseSearch]);

  const getAllFilteredExercises = useCallback(() => {
    if (!exerciseSearch.trim()) return null;
    const results: { muscle: string; exercises: typeof EXERCISE_LIBRARY["chest"] }[] = [];
    for (const [muscle, exs] of Object.entries(EXERCISE_LIBRARY)) {
      const filtered = exs.filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()));
      if (filtered.length > 0) results.push({ muscle, exercises: filtered });
    }
    return results;
  }, [exerciseSearch]);

  // ── Active day for exercise builder ───────────────────────
  const [activeDay, setActiveDay] = useState(0);
  const [customExName, setCustomExName] = useState("");
  const [exerciseStep, setExerciseStep] = useState<"muscles" | "exercises">("muscles");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // ── Split type handler ──────────────────────────────────
  function applySplit(splitValue: string) {
    const split = SPLIT_OPTIONS.find(s => s.value === splitValue);
    if (!split) return;
    setForm((prev) => ({
      ...prev,
      splitType: splitValue,
      days: split.days.map(d => ({ day: d, exercises: [] })),
    }));
    setActiveDay(0);
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-[960px]">

      {/* ═══ SECTION 1: BASIC INFO ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Dumbbell size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Basic Information</CardLabel>
        </div>
        <div className="p-5 space-y-5">
          {/* Name + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
                Workout Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PUSH POWER"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors placeholder:text-slate"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
                Created By
              </label>
              <input
                type="text"
                placeholder="Coach Tariq"
                value={form.created_by}
                onChange={(e) => setField("created_by", e.target.value)}
                className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors placeholder:text-slate"
              />
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Brief description of the workout plan..."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 py-3 outline-none focus:border-gold transition-colors placeholder:text-slate resize-y min-h-[60px]"
            />
          </div>

          {/* Difficulty Cards */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = form.level === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("level", opt.value as PlanFormState["level"])}
                    className={cn(
                      "flex flex-col items-center gap-2 py-4 px-3 border transition-all duration-[120ms]",
                      selected
                        ? `${opt.bgColor} ${opt.borderColor} ${opt.color}`
                        : "border-steel bg-charcoal text-muted hover:border-slate hover:bg-iron",
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
                      {opt.label}
                    </span>
                    {selected && (
                      <Check size={12} className="absolute top-2 right-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Chips */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Duration (minutes per session)
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setField("duration", d); setField("customDuration", false); }}
                  className={cn(
                    "px-4 py-2 border font-mono text-[12px] tracking-[0.08em] transition-all duration-[120ms]",
                    !form.customDuration && form.duration === d
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate",
                  )}
                >
                  {d} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setField("customDuration", true)}
                className={cn(
                  "px-4 py-2 border font-mono text-[12px] tracking-[0.08em] transition-all duration-[120ms]",
                  form.customDuration
                    ? "bg-gold/10 border-gold/30 text-gold"
                    : "border-steel bg-charcoal text-muted hover:border-slate",
                )}
              >
                Custom
              </button>
              {form.customDuration && (
                <input
                  type="number"
                  min="5"
                  max="180"
                  placeholder="Min"
                  value={form.duration}
                  onChange={(e) => setField("duration", parseInt(e.target.value, 10) || 30)}
                  className="w-20 bg-charcoal border border-gold/30 text-gold text-[13px] px-3 h-[38px] outline-none text-center font-mono"
                />
              )}
            </div>
          </div>

          {/* Workout + Cardio Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
                Workout Duration (min)
              </label>
              <input
                type="number"
                min="10"
                max="180"
                value={form.workoutDuration}
                onChange={(e) => setField("workoutDuration", parseInt(e.target.value, 10) || 60)}
                className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
                Cardio Duration (min)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={form.cardioDuration}
                onChange={(e) => setField("cardioDuration", parseInt(e.target.value, 10) || 0)}
                className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors font-mono"
              />
            </div>
          </div>

          {/* Split Type */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Training Split
            </label>
            <div className="flex flex-wrap gap-2">
              {SPLIT_OPTIONS.map((split) => (
                <button
                  key={split.value}
                  type="button"
                  onClick={() => applySplit(split.value)}
                  className={cn(
                    "px-4 py-2 border font-mono text-[12px] tracking-[0.08em] transition-all duration-[120ms]",
                    form.splitType === split.value
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate",
                  )}
                >
                  {split.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setField("splitType", "")}
                className={cn(
                  "px-4 py-2 border font-mono text-[12px] tracking-[0.08em] transition-all duration-[120ms]",
                  !form.splitType
                    ? "bg-gold/10 border-gold/30 text-gold"
                    : "border-steel bg-charcoal text-muted hover:border-slate",
                )}
              >
                Custom
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ SECTION 2: MUSCLE TARGETING ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Target size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Target Muscle Groups</CardLabel>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MUSCLE_GROUPS.map((mg) => {
              const selected = form.muscleGroups.includes(mg.id);
              return (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => toggleArrayItem("muscleGroups", mg.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 px-3 border transition-all duration-[120ms] relative",
                    selected
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate hover:bg-iron",
                  )}
                >
                  <span className="text-2xl">{mg.icon}</span>
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase">{mg.label}</span>
                  {selected && (
                    <span className="absolute top-2 right-2">
                      <Check size={12} className="text-gold" />
                    </span>
                  )}
                </button>
              );
            })}
            {/* Other */}
            <button
              type="button"
              onClick={() => setShowOtherMuscle(!showOtherMuscle)}
              className={cn(
                "flex flex-col items-center gap-2 py-4 px-3 border transition-all duration-[120ms]",
                showOtherMuscle
                  ? "bg-gold/10 border-gold/30 text-gold"
                  : "border-steel bg-charcoal text-muted hover:border-slate hover:bg-iron",
              )}
            >
              <Plus size={20} />
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase">Other</span>
            </button>
          </div>
          {showOtherMuscle && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Custom muscle group..."
                value={form.customMuscle}
                onChange={(e) => setField("customMuscle", e.target.value)}
                className="flex-1 bg-charcoal border border-gold/30 text-offwhite text-[13px] px-3 h-[38px] outline-none focus:border-gold transition-colors placeholder:text-slate"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (form.customMuscle.trim()) {
                    toggleArrayItem("muscleGroups", form.customMuscle.toLowerCase());
                    setField("customMuscle", "");
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ═══ SECTION 3: EQUIPMENT ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Dumbbell size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Equipment Required</CardLabel>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const Icon = eq.icon;
              const selected = form.equipment.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => toggleArrayItem("equipment", eq.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 border transition-all duration-[120ms]",
                    selected
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate",
                  )}
                >
                  <Icon size={14} />
                  <span className="font-mono text-[11px] tracking-[0.08em] uppercase">{eq.label}</span>
                  {selected && <Check size={11} />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowOtherEquipment(!showOtherEquipment)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 border transition-all duration-[120ms]",
                showOtherEquipment
                  ? "bg-gold/10 border-gold/30 text-gold"
                  : "border-steel bg-charcoal text-muted hover:border-slate",
              )}
            >
              <Plus size={14} />
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase">Other</span>
            </button>
          </div>
          {showOtherEquipment && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Custom equipment..."
                value={form.customEquipment}
                onChange={(e) => setField("customEquipment", e.target.value)}
                className="flex-1 bg-charcoal border border-gold/30 text-offwhite text-[13px] px-3 h-[38px] outline-none focus:border-gold transition-colors placeholder:text-slate"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (form.customEquipment.trim()) {
                    toggleArrayItem("equipment", form.customEquipment.toLowerCase());
                    setField("customEquipment", "");
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ═══ SECTION 4: EXERCISE BUILDER ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-gold" />
            <CardLabel className="mb-0 text-gold">Exercise Builder</CardLabel>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addDay}>
            <Plus size={12} />
            Add Day
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Day tabs */}
          <div className="flex gap-0 border-b border-steel overflow-x-auto">
            {form.days.map((day, di) => (
              <button
                key={di}
                type="button"
                onClick={() => setActiveDay(di)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase",
                  "border-b-2 -mb-px transition-colors duration-[120ms] whitespace-nowrap",
                  activeDay === di
                    ? "text-gold border-b-gold"
                    : "text-muted border-b-transparent hover:text-offwhite",
                )}
              >
                D{di + 1}
                {day.exercises.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[8px] bg-gold/10 text-gold">
                    {day.exercises.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {form.days[activeDay] && (
            <div className="space-y-4">
              {/* Day name input */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder={`Day ${activeDay + 1} — Push / Pull / Legs...`}
                  value={form.days[activeDay].day}
                  onChange={(e) => updateDayName(activeDay, e.target.value)}
                  className="flex-1 bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors placeholder:text-slate"
                />
                {form.days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      removeDay(activeDay);
                      setActiveDay(Math.max(0, activeDay - 1));
                    }}
                    className="w-[44px] h-[44px] border border-steel text-slate hover:text-danger hover:border-danger/50 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Exercise Library — Two-Step Selection */}
              <div className="border border-steel bg-charcoal">
                {exerciseStep === "muscles" ? (
                  /* STEP 1: Muscle Group Cards */
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted mb-3">
                      Select a muscle group
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {MUSCLE_GROUPS.map((mg) => {
                        const exerciseCount = EXERCISE_LIBRARY[mg.id]?.length ?? 0;
                        return (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() => {
                              setSelectedMuscle(mg.id);
                              setExerciseStep("exercises");
                              setExerciseSearch("");
                            }}
                            className="flex flex-col items-center gap-2 py-5 px-3 border border-steel bg-iron hover:border-gold/30 hover:bg-gold/5 transition-all duration-[120ms] group"
                          >
                            <span className="text-2xl">{mg.icon}</span>
                            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-offwhite group-hover:text-gold transition-colors">
                              {mg.label}
                            </span>
                            <span className="font-mono text-[9px] text-slate">
                              {exerciseCount} exercises
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* STEP 2: Exercises for Selected Muscle */
                  <div>
                    <div className="px-4 py-3 border-b border-steel flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setExerciseStep("muscles"); setSelectedMuscle(null); }}
                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-gold transition-colors"
                      >
                        <ChevronUp size={12} />
                        Back
                      </button>
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-gold">
                        {MUSCLE_GROUPS.find(m => m.id === selectedMuscle)?.icon}{" "}
                        {selectedMuscle?.replace("-", " ")}
                      </span>
                      <div className="flex-1 relative ml-auto max-w-[200px]">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                          className="w-full bg-iron border border-steel text-offwhite text-[12px] pl-8 pr-3 h-[32px] outline-none focus:border-gold transition-colors placeholder:text-slate"
                        />
                      </div>
                    </div>

                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto">
                      {(EXERCISE_LIBRARY[selectedMuscle ?? ""] ?? [])
                        .filter(ex => !exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                        .map((ex) => {
                          const isAdded = form.days[activeDay]?.exercises.some(e => e.name === ex.name);
                          return (
                            <button
                              key={ex.name}
                              type="button"
                              onClick={() => !isAdded && addExerciseToDay(activeDay, ex)}
                              disabled={isAdded}
                              className={cn(
                                "text-left px-3 py-2.5 border transition-all duration-[120ms]",
                                isAdded
                                  ? "border-gold/30 bg-gold/10 opacity-50 cursor-not-allowed"
                                  : "border-steel/50 hover:border-gold/30 hover:bg-gold/5 cursor-pointer",
                              )}
                            >
                              <p className="text-[12px] text-offwhite truncate">{ex.name}</p>
                              <p className="text-[9px] text-slate font-mono mt-0.5">{ex.defaultSets}×{ex.defaultReps}</p>
                              {isAdded && <Check size={10} className="text-gold mt-1" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Custom exercise input */}
                <div className="px-3 py-3 border-t border-steel flex gap-2">
                  <input
                    type="text"
                    placeholder="+ Add custom exercise..."
                    value={customExName}
                    onChange={(e) => setCustomExName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomExercise(activeDay, customExName);
                        setCustomExName("");
                      }
                    }}
                    className="flex-1 bg-iron border border-steel text-offwhite text-[13px] px-3 h-[36px] outline-none focus:border-gold transition-colors placeholder:text-slate"
                  />
                  <button
                    type="button"
                    onClick={() => { addCustomExercise(activeDay, customExName); setCustomExName(""); }}
                    className="px-4 h-[36px] border border-steel text-muted hover:border-gold/30 hover:text-gold font-mono text-[10px] tracking-[0.1em] uppercase transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected exercises list */}
              {form.days[activeDay].exercises.length > 0 && (
                <div className="space-y-2">
                  <CardLabel>
                    Selected Exercises ({form.days[activeDay].exercises.length})
                  </CardLabel>
                  {form.days[activeDay].exercises.map((ex, ei) => (
                    <div
                      key={ei}
                      className="bg-iron border border-steel p-3 flex flex-col sm:flex-row gap-3 group hover:border-gold/20 transition-colors"
                    >
                      {/* Grip + Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripVertical size={14} className="text-steel flex-shrink-0 cursor-grab" />
                        <span className="font-mono text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 flex-shrink-0">
                          {ei + 1}
                        </span>
                        <span className="text-[13px] text-offwhite truncate">{ex.name}</span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Sets */}
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[8px] text-slate uppercase mb-0.5">Sets</span>
                          <div className="flex items-center border border-steel">
                            <button
                              type="button"
                              onClick={() => updateExercise(activeDay, ei, "sets", Math.max(1, ex.sets - 1))}
                              className="w-7 h-7 flex items-center justify-center text-muted hover:text-gold transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 h-7 flex items-center justify-center text-[12px] text-offwhite font-mono bg-charcoal border-x border-steel">
                              {ex.sets}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateExercise(activeDay, ei, "sets", ex.sets + 1)}
                              className="w-7 h-7 flex items-center justify-center text-muted hover:text-gold transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Reps */}
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[8px] text-slate uppercase mb-0.5">Reps</span>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => updateExercise(activeDay, ei, "reps", e.target.value)}
                            className="w-16 h-7 bg-charcoal border border-steel text-offwhite text-[12px] text-center font-mono outline-none focus:border-gold transition-colors"
                          />
                        </div>

                        {/* Rest */}
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[8px] text-slate uppercase mb-0.5">Rest</span>
                          <select
                            value={ex.rest}
                            onChange={(e) => updateExercise(activeDay, ei, "rest", e.target.value)}
                            className="h-7 bg-charcoal border border-steel text-offwhite text-[11px] px-1 font-mono outline-none focus:border-gold transition-colors cursor-pointer"
                          >
                            {REST_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeExercise(activeDay, ei)}
                          className="w-7 h-7 flex items-center justify-center text-steel hover:text-danger transition-colors mt-3"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Notes field */}
                      <div className="w-full sm:ml-[30px]">
                        <input
                          type="text"
                          placeholder="Notes (e.g. slow eccentric, pause at bottom...)"
                          value={ex.notes || ""}
                          onChange={(e) => updateExercise(activeDay, ei, "notes", e.target.value)}
                          className="w-full bg-charcoal border border-steel/50 text-muted text-[11px] px-3 h-7 outline-none focus:border-gold focus:text-offwhite transition-colors placeholder:text-slate/60"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {form.days[activeDay].exercises.length === 0 && (
                <div className="py-8 text-center border border-dashed border-steel bg-charcoal/50">
                  <Dumbbell size={24} className="text-steel mx-auto mb-2" />
                  <p className="text-[12px] text-muted">Click exercises above to add them</p>
                  <p className="text-[10px] text-slate mt-1">Or use the custom input to add your own</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ═══ SECTION 5: EXTRAS ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Heart size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Notes & Tags</CardLabel>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Additional notes for the coach or client..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
              className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 py-3 outline-none focus:border-gold transition-colors placeholder:text-slate resize-y min-h-[60px]"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => {
                const selected = form.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleArrayItem("tags", tag.id)}
                    className={cn(
                      "px-4 py-2 border font-mono text-[11px] tracking-[0.08em] uppercase transition-all duration-[120ms]",
                      selected
                        ? `bg-gold/10 border-gold/30 ${tag.color}`
                        : "border-steel bg-charcoal text-muted hover:border-slate",
                    )}
                  >
                    {selected && <Check size={10} className="inline mr-1.5" />}
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ SUBMIT ═══ */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" size="md" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} fullWidth>
          {loading ? "Saving..." : isEdit ? "SAVE CHANGES" : "CREATE PLAN"}
        </Button>
      </div>
    </form>
  );
}
