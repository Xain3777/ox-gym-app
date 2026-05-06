"use client";

// ═══════════════════════════════════════════════════════════════
// CreatePlanForm — coach / manager workout-plan builder
//
// Library-aware as of migration 016: training systems, days, muscle
// groups, and exercises now load from Supabase (tables created by
// 016_coach_training_system.sql). Sets / reps / rest / tempo are
// blank by default — the coach fills them manually for each
// exercise. The plan still saves to workout_plans.content as JSONB
// so the existing /api/plans + /api/plans/[id] routes and the
// portal player view keep working.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, GripVertical, ChevronUp,
  Dumbbell, Zap, Target, Shield, Heart,
  Activity, Flame, X, Check, Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { ExerciseImage } from "@/components/ui/ExerciseImage";
import { createBrowserSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  WorkoutPlan, WorkoutDay, WorkoutExercise,
  TrainingSystem, TrainingSystemDay, MuscleGroup, Exercise,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
// STATIC OPTIONS (intentionally hardcoded — these don't belong in
// the editable library)
// ═══════════════════════════════════════════════════════════════

const DIFFICULTY_OPTIONS = [
  { value: "beginner",     label: "Beginner",     icon: Shield, color: "text-success", borderColor: "border-success/30", bgColor: "bg-success/10" },
  { value: "intermediate", label: "Intermediate", icon: Target, color: "text-gold",    borderColor: "border-gold/30",    bgColor: "bg-gold/10"    },
  { value: "advanced",     label: "Advanced",     icon: Flame,  color: "text-danger",  borderColor: "border-danger/30",  bgColor: "bg-danger/10"  },
] as const;

const DURATION_PRESETS = [15, 30, 45, 60];

const EQUIPMENT_OPTIONS = [
  { id: "bodyweight",       label: "Bodyweight",       icon: Activity },
  { id: "dumbbells",        label: "Dumbbells",        icon: Dumbbell },
  { id: "barbell",          label: "Barbell",          icon: Dumbbell },
  { id: "machines",         label: "Machines",         icon: Zap },
  { id: "resistance-bands", label: "Resistance Bands", icon: Target },
  { id: "kettlebell",       label: "Kettlebell",       icon: Dumbbell },
];

const TAG_OPTIONS = [
  { id: "strength",    label: "Strength",    color: "text-gold"    },
  { id: "fat-loss",    label: "Fat Loss",    color: "text-danger"  },
  { id: "mobility",    label: "Mobility",    color: "text-success" },
  { id: "rehab",       label: "Rehab",       color: "text-muted"   },
  { id: "endurance",   label: "Endurance",   color: "text-gold"    },
  { id: "hypertrophy", label: "Hypertrophy", color: "text-danger"  },
];

// ═══════════════════════════════════════════════════════════════
// FORM STATE
// ═══════════════════════════════════════════════════════════════

interface PlanDay {
  day:       string;
  exercises: WorkoutExercise[];
}

interface PlanFormState {
  name:             string;
  description:      string;
  level:            "beginner" | "intermediate" | "advanced";
  duration:         number;
  customDuration:   boolean;
  workoutDuration:  number;
  cardioDuration:   number;
  splitType:        string;          // training_system_id, or "custom"
  muscleGroupIds:   string[];        // selected muscle group IDs (target)
  equipment:        string[];
  customEquipment:  string;
  created_by:       string;
  days:             PlanDay[];
  notes:            string;
  tags:             string[];
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CreatePlanForm({
  initialData,
  returnPath = "/plans",
}: {
  initialData?: Partial<WorkoutPlan>;
  returnPath?: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const isEdit = !!initialData?.id;

  // ── DB-backed library data ───────────────────────────────────
  const [systems,       setSystems]       = useState<TrainingSystem[]>([]);
  const [systemDays,    setSystemDays]    = useState<TrainingSystemDay[]>([]);
  const [muscleGroups,  setMuscleGroups]  = useState<MuscleGroup[]>([]);
  const [exercises,     setExercises]     = useState<Exercise[]>([]);
  const [libLoaded,     setLibLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabase();
      const [sysRes, daysRes, mgRes, exRes] = await Promise.all([
        supabase.from("training_systems").select("*").eq("is_active", true).order("sort_order").order("name"),
        supabase.from("training_system_days").select("*").order("sort_order").order("day_number"),
        supabase.from("muscle_groups").select("*").eq("is_active", true).order("sort_order").order("name"),
        supabase.from("exercises").select("*").eq("is_active", true).order("sort_order").order("name"),
      ]);
      if (cancelled) return;
      if (sysRes.data)  setSystems(sysRes.data as TrainingSystem[]);
      if (daysRes.data) setSystemDays(daysRes.data as TrainingSystemDay[]);
      if (mgRes.data)   setMuscleGroups(mgRes.data as MuscleGroup[]);
      if (exRes.data)   setExercises(exRes.data as Exercise[]);
      setLibLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Form state ───────────────────────────────────────────────
  const initialDays: PlanDay[] = (initialData?.content as WorkoutDay[] | undefined)?.map((d) => ({
    day: d.day,
    exercises: d.exercises.map((ex) => ({ ...ex })),
  })) ?? [{ day: "Day 1", exercises: [] }];

  const [loading, setLoading] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showOtherEquipment, setShowOtherEquipment] = useState(false);

  const [form, setForm] = useState<PlanFormState>({
    name:            initialData?.name ?? "",
    description:     "",
    level:           initialData?.level ?? "intermediate",
    duration:        (initialData?.duration_weeks ?? 4) * 7,
    customDuration:  false,
    workoutDuration: 60,
    cardioDuration:  15,
    splitType:       initialData?.split_type ?? "",
    muscleGroupIds:  [],   // populated from initialData.category once muscle groups load
    equipment:       [],
    customEquipment: "",
    created_by:      initialData?.created_by ?? "",
    days:            initialDays,
    notes:           "",
    tags:            [],
  });

  // Once muscle groups load, hydrate the muscleGroupIds from initialData.category
  useEffect(() => {
    if (!libLoaded || !initialData?.category || form.muscleGroupIds.length > 0) return;
    const names = initialData.category.split(/\s*[·,]\s*/).map((s) => s.trim().toLowerCase());
    const ids = muscleGroups.filter((g) => names.includes(g.name.toLowerCase())).map((g) => g.id);
    if (ids.length > 0) setForm((p) => ({ ...p, muscleGroupIds: ids }));
  }, [libLoaded, muscleGroups, initialData?.category, form.muscleGroupIds.length]);

  // ── Field helpers ────────────────────────────────────────────
  function setField<K extends keyof PlanFormState>(key: K, val: PlanFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }
  function toggleArrayItem(key: "muscleGroupIds" | "equipment" | "tags", item: string) {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
  }

  // ── Day helpers ──────────────────────────────────────────────
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
  function moveDay(di: number, dir: -1 | 1) {
    setForm((prev) => {
      const next = [...prev.days];
      const target = di + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[di], next[target]] = [next[target], next[di]];
      return { ...prev, days: next };
    });
    if (activeDay === di) setActiveDay(di + dir);
  }

  // ── Exercise helpers ─────────────────────────────────────────
  // Adds an exercise to the active day with EMPTY sets/reps/rest/tempo
  // — coach fills them manually. The library-aware metadata (id, image
  // refs, muscle group, equipment) is captured so the player can
  // render images and the coach can edit the plan later without
  // re-looking-up the exercise.
  function addExerciseToDay(di: number, ex: Exercise) {
    setForm((prev) => {
      // Don't add duplicates
      if (prev.days[di].exercises.some((e) => e.exercise_id === ex.id)) return prev;
      const newEx: WorkoutExercise = {
        exercise_id:       ex.id,
        exercise_name:     ex.name,
        name:              ex.name,
        muscle_group:      muscleGroups.find((g) => g.id === ex.muscle_group_id)?.name ?? null,
        equipment:         ex.equipment,
        image_url:         ex.image_url,
        machine_image_url: ex.machine_image_url,
        demo_url:          ex.demo_url,
        sets:              "",
        reps:              "",
        rest:              "",
        tempo:             "",
        notes:             "",
      };
      return {
        ...prev,
        days: prev.days.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, newEx] } : d),
      };
    });
  }

  function addCustomExercise(di: number, name: string) {
    if (!name.trim()) return;
    setForm((prev) => {
      const newEx: WorkoutExercise = {
        exercise_id:    null,
        exercise_name:  name.trim(),
        name:           name.trim(),
        muscle_group:   null,
        equipment:      null,
        image_url:      null,
        machine_image_url: null,
        demo_url:       null,
        sets: "", reps: "", rest: "", tempo: "", notes: "",
      };
      return {
        ...prev,
        days: prev.days.map((d, i) => i === di ? { ...d, exercises: [...d.exercises, newEx] } : d),
      };
    });
  }

  function removeExercise(di: number, ei: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) =>
        i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d,
      ),
    }));
  }

  function updateExercise(di: number, ei: number, key: keyof WorkoutExercise, val: string | number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((ex, j) => j === ei ? { ...ex, [key]: val } : ex) }
          : d,
      ),
    }));
  }

  // ── Apply training-system preset ─────────────────────────────
  function applySplit(systemId: string) {
    if (!systemId) {
      setField("splitType", "");
      return;
    }
    const dayList = systemDays.filter((d) => d.training_system_id === systemId);
    setForm((prev) => ({
      ...prev,
      splitType: systemId,
      days: dayList.map((d) => ({ day: d.title, exercises: [] })),
    }));
    setActiveDay(0);
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toastError("Name required", "Please enter a plan name.");
      return;
    }
    if (form.days.every((d) => d.exercises.length === 0)) {
      toastError("No exercises", "Add at least one exercise to the plan.");
      return;
    }

    setLoading(true);
    try {
      // Derive `category` from the selected muscle groups so older parts
      // of the app (which read members.category as a display string) keep
      // showing something sensible.
      const selectedNames = muscleGroups
        .filter((g) => form.muscleGroupIds.includes(g.id))
        .map((g) => g.name);
      const category = selectedNames.length > 0 ? selectedNames.join(" · ") : "General";
      const splitName = systems.find((s) => s.id === form.splitType)?.name;

      const payload = {
        name:           form.name,
        category,
        level:          form.level,
        duration_weeks: Math.ceil(form.duration / 7) || 4,
        split_type:     splitName,
        content:        form.days.map((d) => ({
          day: d.day,
          exercises: d.exercises.map((ex) => ({
            // legacy display name
            name:               ex.exercise_name ?? ex.name,
            // library-aware
            exercise_id:        ex.exercise_id ?? null,
            exercise_name:      ex.exercise_name ?? ex.name,
            muscle_group:       ex.muscle_group ?? null,
            equipment:          ex.equipment ?? null,
            image_url:          ex.image_url ?? null,
            machine_image_url:  ex.machine_image_url ?? null,
            demo_url:           ex.demo_url ?? null,
            // coach-filled (kept as strings, blank by default)
            sets:               typeof ex.sets === "number" ? String(ex.sets) : (ex.sets ?? ""),
            reps:               ex.reps ?? "",
            rest:               ex.rest ?? "",
            tempo:              ex.tempo ?? "",
            notes:              ex.notes ?? "",
          })),
        })),
      };

      const url    = isEdit ? `/api/plans/${initialData!.id}` : "/api/plans";
      const method = isEdit ? "PATCH" : "POST";
      const res    = await fetch(url, {
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
      router.push(returnPath);
      router.refresh();
    } catch {
      toastError("Network error", "Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Exercise builder state ──────────────────────────────────
  const [activeDay, setActiveDay] = useState(0);
  const [customExName, setCustomExName] = useState("");
  const [exerciseStep, setExerciseStep] = useState<"muscles" | "exercises">("muscles");
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null);

  // Filtered exercises for the picker
  const filteredExercises = useCallback(() => {
    let pool = exercises;
    if (selectedMuscleId) pool = pool.filter((e) => e.muscle_group_id === selectedMuscleId);
    if (exerciseSearch.trim()) {
      const q = exerciseSearch.toLowerCase();
      pool = pool.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.equipment?.toLowerCase().includes(q) ?? false),
      );
    }
    return pool;
  }, [exercises, selectedMuscleId, exerciseSearch]);

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
                placeholder="Coach name"
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
                      "flex flex-col items-center gap-2 py-4 px-3 border transition-all duration-[120ms] relative",
                      selected
                        ? `${opt.bgColor} ${opt.borderColor} ${opt.color}`
                        : "border-steel bg-charcoal text-muted hover:border-slate hover:bg-iron",
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-mono text-[10px] tracking-[0.12em] uppercase">{opt.label}</span>
                    {selected && <Check size={12} className="absolute top-2 right-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration chips */}
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
                  min="5" max="180"
                  placeholder="Min"
                  value={form.duration}
                  onChange={(e) => setField("duration", parseInt(e.target.value, 10) || 30)}
                  className="w-20 bg-charcoal border border-gold/30 text-gold text-[13px] px-3 h-[38px] outline-none text-center font-mono"
                />
              )}
            </div>
          </div>

          {/* Workout + Cardio durations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5">
                Workout Duration (min)
              </label>
              <input
                type="number" min="10" max="180"
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
                type="number" min="0" max="120"
                value={form.cardioDuration}
                onChange={(e) => setField("cardioDuration", parseInt(e.target.value, 10) || 0)}
                className="w-full bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors font-mono"
              />
            </div>
          </div>

          {/* Training system (DB-backed) */}
          <div>
            <label className="block font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Training System
            </label>
            <div className="flex flex-wrap gap-2">
              {systems.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applySplit(s.id)}
                  className={cn(
                    "px-4 py-2 border font-mono text-[11px] tracking-[0.08em] transition-all duration-[120ms]",
                    form.splitType === s.id
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate",
                  )}
                >
                  {s.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setField("splitType", "")}
                className={cn(
                  "px-4 py-2 border font-mono text-[11px] tracking-[0.08em] transition-all duration-[120ms]",
                  !form.splitType
                    ? "bg-gold/10 border-gold/30 text-gold"
                    : "border-steel bg-charcoal text-muted hover:border-slate",
                )}
              >
                Custom
              </button>
            </div>
            {!libLoaded && <p className="text-muted text-[11px] mt-2">Loading library…</p>}
          </div>
        </div>
      </Card>

      {/* ═══ SECTION 2: TARGET MUSCLE GROUPS ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Target size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Target Muscle Groups</CardLabel>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {muscleGroups.map((mg) => {
              const selected = form.muscleGroupIds.includes(mg.id);
              return (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => toggleArrayItem("muscleGroupIds", mg.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-3 border transition-all duration-[120ms] relative",
                    selected
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-steel bg-charcoal text-muted hover:border-slate hover:bg-iron",
                  )}
                >
                  <span className="font-medium text-[12px]">{mg.name}</span>
                  {selected && <Check size={12} className="absolute top-2 right-2" />}
                </button>
              );
            })}
          </div>
          {muscleGroups.length === 0 && libLoaded && (
            <p className="text-muted text-[12px] py-3">No muscle groups in library — add some in <span className="text-gold">Coach → Library</span>.</p>
          )}
        </div>
      </Card>

      {/* ═══ SECTION 3: EQUIPMENT ═══ */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-steel bg-gunmetal flex items-center gap-2">
          <Dumbbell size={14} className="text-gold" />
          <CardLabel className="mb-0 text-gold">Equipment Available</CardLabel>
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
            <Plus size={12} /> Add Day
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
              {/* Day name + reorder + delete */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Day ${activeDay + 1} title`}
                  value={form.days[activeDay].day}
                  onChange={(e) => updateDayName(activeDay, e.target.value)}
                  className="flex-1 bg-charcoal border border-steel text-offwhite text-[14px] px-3.5 h-[44px] outline-none focus:border-gold transition-colors placeholder:text-slate"
                />
                <button
                  type="button"
                  onClick={() => moveDay(activeDay, -1)}
                  disabled={activeDay === 0}
                  title="Move up"
                  className="w-[44px] h-[44px] border border-steel text-slate hover:text-gold hover:border-gold/40 disabled:opacity-30 transition-colors flex items-center justify-center"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDay(activeDay, 1)}
                  disabled={activeDay === form.days.length - 1}
                  title="Move down"
                  className="w-[44px] h-[44px] border border-steel text-slate hover:text-gold hover:border-gold/40 disabled:opacity-30 transition-colors flex items-center justify-center"
                >
                  ↓
                </button>
                {form.days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { removeDay(activeDay); setActiveDay(Math.max(0, activeDay - 1)); }}
                    title="Remove day"
                    className="w-[44px] h-[44px] border border-steel text-slate hover:text-danger hover:border-danger/50 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Exercise picker */}
              <div className="border border-steel bg-charcoal">
                {exerciseStep === "muscles" ? (
                  <div className="p-4">
                    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted mb-3">
                      Choose a muscle group to browse, or search
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {muscleGroups.map((mg) => {
                        const exerciseCount = exercises.filter((e) => e.muscle_group_id === mg.id).length;
                        return (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() => {
                              setSelectedMuscleId(mg.id);
                              setExerciseStep("exercises");
                              setExerciseSearch("");
                            }}
                            className="flex flex-col items-center gap-1 py-4 px-3 border border-steel bg-iron hover:border-gold/30 hover:bg-gold/5 transition-all duration-[120ms] group"
                          >
                            <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-offwhite group-hover:text-gold transition-colors">
                              {mg.name}
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
                  <div>
                    <div className="px-4 py-3 border-b border-steel flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setExerciseStep("muscles"); setSelectedMuscleId(null); }}
                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted hover:text-gold transition-colors"
                      >
                        <ChevronUp size={12} /> Back
                      </button>
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-gold">
                        {muscleGroups.find((m) => m.id === selectedMuscleId)?.name}
                      </span>
                      <div className="flex-1 relative ml-auto max-w-[220px]">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
                        <input
                          type="text"
                          placeholder="Search exercises…"
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                          className="w-full bg-iron border border-steel text-offwhite text-[12px] pl-8 pr-3 h-[32px] outline-none focus:border-gold transition-colors placeholder:text-slate"
                        />
                      </div>
                    </div>

                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto">
                      {filteredExercises().map((ex) => {
                        const isAdded = form.days[activeDay]?.exercises.some((e) => e.exercise_id === ex.id);
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => !isAdded && addExerciseToDay(activeDay, ex)}
                            disabled={isAdded}
                            className={cn(
                              "flex items-center gap-2 text-left p-2 border transition-all duration-[120ms]",
                              isAdded
                                ? "border-gold/30 bg-gold/10 opacity-50 cursor-not-allowed"
                                : "border-steel/50 hover:border-gold/30 hover:bg-gold/5 cursor-pointer",
                            )}
                          >
                            <ExerciseImage src={ex.image_url} alt={ex.name} className="w-12 h-12 flex-shrink-0" iconSize={16} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] text-offwhite truncate">{ex.name}</p>
                              {ex.equipment && (
                                <p className="text-[10px] text-slate font-mono mt-0.5 truncate">{ex.equipment}</p>
                              )}
                            </div>
                            {isAdded && <Check size={11} className="text-gold flex-shrink-0" />}
                          </button>
                        );
                      })}
                      {filteredExercises().length === 0 && (
                        <div className="col-span-full text-center py-6 text-muted text-[12px]">
                          No exercises match. Add one in <span className="text-gold">Coach → Library</span>.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom exercise input */}
                <div className="px-3 py-3 border-t border-steel flex gap-2">
                  <input
                    type="text"
                    placeholder="+ Add custom exercise…"
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

              {/* Selected exercises */}
              {form.days[activeDay].exercises.length > 0 ? (
                <div className="space-y-2">
                  <CardLabel>Selected Exercises ({form.days[activeDay].exercises.length})</CardLabel>
                  {form.days[activeDay].exercises.map((ex, ei) => (
                    <div
                      key={ei}
                      className="bg-iron border border-steel p-3 space-y-2 group hover:border-gold/20 transition-colors"
                    >
                      {/* Top row: position, image, name, delete */}
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="text-steel flex-shrink-0" />
                        <span className="font-mono text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 flex-shrink-0">
                          {ei + 1}
                        </span>
                        <ExerciseImage
                          src={ex.image_url}
                          alt={ex.exercise_name ?? ex.name}
                          className="w-10 h-10 flex-shrink-0"
                          iconSize={14}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-offwhite truncate">{ex.exercise_name ?? ex.name}</p>
                          <p className="text-[10px] text-slate font-mono truncate">
                            {ex.muscle_group ?? ""}{ex.muscle_group && ex.equipment ? " · " : ""}{ex.equipment ?? ""}
                          </p>
                        </div>
                        {ex.machine_image_url && (
                          <ExerciseImage src={ex.machine_image_url} alt="machine" className="w-8 h-8 flex-shrink-0 hidden sm:block" iconSize={12} />
                        )}
                        {ex.demo_url && (
                          <ExerciseImage src={ex.demo_url} alt="demo" className="w-8 h-8 flex-shrink-0 hidden sm:block" iconSize={12} />
                        )}
                        <button
                          type="button"
                          onClick={() => removeExercise(activeDay, ei)}
                          title="Remove"
                          className="w-7 h-7 flex items-center justify-center text-steel hover:text-danger transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Coach-fillable values: empty by default */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <FieldCell label="Sets">
                          <input
                            type="text"
                            value={ex.sets === undefined || ex.sets === null ? "" : String(ex.sets)}
                            onChange={(e) => updateExercise(activeDay, ei, "sets", e.target.value)}
                            placeholder="—"
                            className={cellClass}
                          />
                        </FieldCell>
                        <FieldCell label="Reps">
                          <input
                            type="text"
                            value={ex.reps ?? ""}
                            onChange={(e) => updateExercise(activeDay, ei, "reps", e.target.value)}
                            placeholder="—"
                            className={cellClass}
                          />
                        </FieldCell>
                        <FieldCell label="Rest">
                          <input
                            type="text"
                            value={ex.rest ?? ""}
                            onChange={(e) => updateExercise(activeDay, ei, "rest", e.target.value)}
                            placeholder="—"
                            className={cellClass}
                          />
                        </FieldCell>
                        <FieldCell label="Tempo">
                          <input
                            type="text"
                            value={ex.tempo ?? ""}
                            onChange={(e) => updateExercise(activeDay, ei, "tempo", e.target.value)}
                            placeholder="—"
                            className={cellClass}
                          />
                        </FieldCell>
                        <FieldCell label="Notes" full>
                          <input
                            type="text"
                            value={ex.notes ?? ""}
                            onChange={(e) => updateExercise(activeDay, ei, "notes", e.target.value)}
                            placeholder="—"
                            className={cellClass}
                          />
                        </FieldCell>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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

      {/* ═══ SECTION 5: NOTES & TAGS ═══ */}
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

// ═══════════════════════════════════════════════════════════════
// Local helpers
// ═══════════════════════════════════════════════════════════════

function FieldCell({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2 sm:col-span-5")}>
      <span className="font-mono text-[8px] text-slate uppercase block mb-0.5">{label}</span>
      {children}
    </div>
  );
}

const cellClass =
  "w-full h-7 bg-charcoal border border-steel text-offwhite text-[12px] px-2 outline-none focus:border-gold transition-colors placeholder:text-slate/50";
