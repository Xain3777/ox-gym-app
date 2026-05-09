import type { SupabaseClient } from "@supabase/supabase-js";
import programSeed from "../../data/workout-programs/ox_program_templates.json";

type SeedExercise =
  | string
  | {
      name: string;
      sets_reps?: string;
      rest?: string;
      duration?: string;
      notes?: string;
    };

type SeedSection = {
  muscle_group: string;
  sets_reps?: string;
  exercises: SeedExercise[];
};

type SeedDay = {
  day?: number;
  name: string;
  sets_reps?: string;
  type?: string;
  exercises?: SeedExercise[];
  sections?: SeedSection[];
  cardio?: Array<{ name: string; duration: string }>;
  options?: string[];
};

export type ExerciseMedia = {
  id: string;
  exercise_name: string;
  machine_name: string | null;
  machine_image_url: string | null;
  demo_image_url: string | null;
  demo_video_url: string | null;
  instructions: string | null;
};

export type WorkoutTemplateExercise = {
  id: string;
  name: string;
  sets_reps: string | null;
  rest: string | null;
  duration: string | null;
  instructions: string | null;
  notes: string | null;
  sort_order: number;
  media: ExerciseMedia | null;
};

export type WorkoutTemplateSection = {
  id: string;
  name: string | null;
  muscle_group: string | null;
  sets_reps: string | null;
  sort_order: number;
  exercises: WorkoutTemplateExercise[];
};

export type WorkoutTemplateDay = {
  id: string;
  day_number: number | null;
  name: string;
  sets_reps: string | null;
  day_type: string;
  notes: string | null;
  cardio: Array<{ name: string; duration: string }>;
  options: string[];
  sort_order: number;
  sections: WorkoutTemplateSection[];
  exercises: WorkoutTemplateExercise[];
};

export type WorkoutProgramTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  gender_focus: string | null;
  description: string | null;
  is_active: boolean;
  source?: "structured_templates" | "legacy_workout_plans";
  days: WorkoutTemplateDay[];
};

const TEMPLATE_META: Record<string, { name: string; category: string; gender_focus: string | null }> = {
  pro_split_1: { name: "Pro Split 1", category: "Pro Split", gender_focus: "Male" },
  pro_split_2: { name: "Pro Split 2", category: "Pro Split", gender_focus: "Male" },
  double_split: { name: "Double Split", category: "Double Split", gender_focus: "Male" },
  professional_feminine_focus: {
    name: "Professional Feminine Focus",
    category: "Feminine Focus",
    gender_focus: "Female",
  },
};

const MEDIA_PATHS: Record<string, { machine?: string; demo?: string; machineName?: string }> = {
  "abdominal crunches": { machine: "/gym-machines/Abdominal Machine.jpg", demo: "/exercises/machines/abdominal.png" },
  "abductor machine": { machine: "/gym-machines/Abductor A.jpg", demo: "/exercises/machines/abdactor.png" },
  "adductor machine": { machine: "/gym-machines/Adductor B.jpg", demo: "/exercises/machines/addactor.png" },
  "barbell hip thrust": { machine: "/gym-machines/Hip Thrust.jpg", demo: "/exercises/machines/hip thrust.png" },
  "barbell overhead extension": { demo: "/exercises/machines/Barbell Overhead.png" },
  "barbell skull crusher": { demo: "/exercises/machines/Barbell Skull Crusher.png" },
  "banded kickbacks": { demo: "/exercises/machines/Cable kicbacks.png" },
  "belt squat - glutes": { machine: "/gym-machines/Rhino Squat-H.jpg", demo: "/exercises/machines/Belt squat _Glutes.png" },
  "belt squat - quadriceps": { machine: "/gym-machines/Rhino Squat-H.jpg", demo: "/exercises/machines/Pendulum Squat _Quadriceps.png" },
  "cable biceps curl": { demo: "/exercises/machines/Cable biceps curl.png" },
  "cable face pull": { machine: "/gym-machines/Functional Trainer.jpg" },
  "cable hammer curl": { demo: "/exercises/machines/Cable Hummer curl.png" },
  "cable kickbacks": { demo: "/exercises/machines/Cable kicbacks.png" },
  "cable lower chest fly": { demo: "/exercises/machines/Cable lower cheast fly.png" },
  "cable lower chest fly or dips machine": { machine: "/gym-machines/Dips Press Dual System.jpg", demo: "/exercises/machines/dual dips.png" },
  "cable seated row": { machine: "/gym-machines/Seated Row.jpg", demo: "/exercises/machines/rowing.png" },
  "calf raises": { machine: "/gym-machines/Calf.jpg", demo: "/exercises/machines/calf raises.png" },
  "chest fly machine": { machine: "/gym-machines/Super Middle Chest Flight.jpg", demo: "/exercises/machines/Fly incline chest.png" },
  "chest press": { machine: "/gym-machines/Chest Press.jpg", demo: "/exercises/machines/Vertical chest press machine.png" },
  "chest press - vertical grip": { machine: "/gym-machines/Vertical Press.jpg", demo: "/exercises/machines/Vertical chest press machine.png" },
  "cobra lower back": { demo: "/exercises/machines/Cobra lower back.png" },
  "dips": { machine: "/gym-machines/Dips Press Dual System.jpg", demo: "/exercises/machines/dual dips.png" },
  "dumbbell front raise": { demo: "/exercises/machines/Barbell Front Raise.png" },
  "dumbbell incline curl": { demo: "/exercises/machines/Dumbbell Incline Curl.png" },
  "dumbbell lateral raise": { demo: "/exercises/machines/Dumbbell Lateral Raise.png" },
  "dumbbell overhead extension": { demo: "/exercises/machines/Dumbbell Overhead Extension.png" },
  "dumbbell shoulder press": { demo: "/exercises/machines/Dumbbell Shoulder Press.png" },
  "hammer curl machine": { demo: "/exercises/machines/hummer curl machine.png" },
  "hip thrust": { machine: "/gym-machines/Hip Thrust.jpg", demo: "/exercises/machines/hip thrust.png" },
  "incline chest fly": { demo: "/exercises/machines/Incline cheast press.png" },
  "incline chest press": { machine: "/gym-machines/Incline Chest Press (Plate Loaded).jpg", demo: "/exercises/machines/Incline cheast press.png" },
  "incline row machine": { machine: "/gym-machines/Incline Lever Row.jpg", demo: "/exercises/machines/Incline  Row Machine 2.png" },
  "lat pulldown": { machine: "/gym-machines/Pull Down.jpg", demo: "/exercises/machines/pull up.png" },
  "lat pulldown machine": { machine: "/gym-machines/Iso-Lateral Lat Pulldown.jpg", demo: "/exercises/machines/pull up.png" },
  "lateral raise": { machine: "/gym-machines/Standing Lateral Raise.jpg", demo: "/exercises/machines/laterial raises.png" },
  "leg curl": { machine: "/gym-machines/Prone Leg Curl.jpg", demo: "/exercises/machines/single leg curl.png" },
  "leg extension": { machine: "/gym-machines/Leg Extension.jpg", demo: "/exercises/machines/leg press.png" },
  "leg press - quadriceps": { machine: "/gym-machines/Leg Press.jpg", demo: "/exercises/machines/leg press.png" },
  "overhead cable extension": { demo: "/exercises/machines/Overhead Cable Extension.png" },
  "preacher curl": { machine: "/gym-machines/Biceps.jpg", demo: "/exercises/machines/biceps triceps machine.png" },
  "rear delt fly machine": { machine: "/gym-machines/Super Middle Chest Flight.jpg", demo: "/exercises/machines/rear kickback.png" },
  "rear kick machine": { machine: "/gym-machines/Rear Kick.jpg", demo: "/exercises/machines/rear kickback.png" },
  "romanian deadlift - rdl": { demo: "/exercises/machines/Romanian Deadlift - RDL.png" },
  "seated row": { machine: "/gym-machines/Seated Row.jpg", demo: "/exercises/machines/rowing.png" },
  "seated row - wide grip": { machine: "/gym-machines/Seated Row Machine.jpg", demo: "/exercises/machines/rowing.png" },
  "shoulder press": { machine: "/gym-machines/Shoulder Press.jpg", demo: "/exercises/machines/shoulder press.png" },
  "shoulder press machine": { machine: "/gym-machines/Shoulder Press.jpg", demo: "/exercises/machines/shoulder press machine.png" },
  "split chest press": { machine: "/gym-machines/Split Push Chest Trainer.jpg", demo: "/exercises/machines/Split cheast press.png" },
  "t-bar row - upper back": { machine: "/gym-machines/Incline Lever Row.jpg", demo: "/exercises/machines/Incline  Row Machine 2.png" },
  "triceps cable pushdown": { demo: "/exercises/machines/Triceps cable push down.png" },
};

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function exerciseName(exercise: SeedExercise): string {
  return typeof exercise === "string" ? exercise : exercise.name;
}

function exerciseSetsReps(exercise: SeedExercise, fallback?: string): string | null {
  return typeof exercise === "string" ? fallback ?? null : exercise.sets_reps ?? fallback ?? null;
}

function exerciseRest(exercise: SeedExercise): string | null {
  return typeof exercise === "string" ? null : exercise.rest ?? null;
}

function exerciseDuration(exercise: SeedExercise): string | null {
  return typeof exercise === "string" ? null : exercise.duration ?? null;
}

function exerciseNotes(exercise: SeedExercise): string | null {
  return typeof exercise === "string" ? null : exercise.notes ?? null;
}

function allSeedTemplates(): Array<{ key: string; days: SeedDay[] }> {
  return [
    { key: "pro_split_1", days: programSeed.male_programs.pro_split_1 as SeedDay[] },
    { key: "pro_split_2", days: programSeed.male_programs.pro_split_2 as SeedDay[] },
    { key: "double_split", days: programSeed.male_programs.double_split as SeedDay[] },
    { key: "professional_feminine_focus", days: programSeed.female_programs.professional_feminine_focus as SeedDay[] },
  ];
}

export async function ensureWorkoutProgramSeeded(supabase: SupabaseClient): Promise<void> {
  const { data: existingTemplates, error } = await supabase
    .from("workout_program_templates")
    .select("id, key");

  if (error) {
    throw new Error(`Workout program tables are not ready: ${error.message}`);
  }

  const existingByKey = new Map(
    (existingTemplates ?? []).map((template) => [template.key as string, template.id as string]),
  );

  if (existingByKey.has("pro_split")) {
    await supabase
      .from("workout_program_templates")
      .update({
        name: "Pro Split Legacy",
        is_active: false,
        description: "Replaced by Pro Split 1 and Pro Split 2 variants.",
        updated_at: new Date().toISOString(),
      })
      .eq("key", "pro_split");
  }

  for (const seedTemplate of allSeedTemplates()) {
    const meta = TEMPLATE_META[seedTemplate.key];
    if (!meta) continue;

    let templateId = existingByKey.get(seedTemplate.key);
    if (!templateId) {
      const { data: template, error: templateError } = await supabase
        .from("workout_program_templates")
        .upsert({
          key: seedTemplate.key,
          name: meta.name,
          category: meta.category,
          gender_focus: meta.gender_focus,
          description: `${meta.name} OX structured workout program`,
          is_active: true,
        }, { onConflict: "key" })
        .select("id")
        .single();

      if (templateError || !template) continue;
      templateId = template.id as string;
    }

    const { count: dayCount } = await supabase
      .from("workout_template_days")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId);

    if ((dayCount ?? 0) > 0) {
      if (seedTemplate.key === "double_split") {
        const legsDay = seedTemplate.days.find((day) => day.name === "Legs");
        const { count: legsCount } = await supabase
          .from("workout_template_days")
          .select("id", { count: "exact", head: true })
          .eq("template_id", templateId)
          .eq("name", "Legs");

        if (legsDay && (legsCount ?? 0) === 0) {
          await insertSeedDay(supabase, templateId, legsDay, dayCount ?? seedTemplate.days.length);
        }
      }

      continue;
    }

    for (let dayIndex = 0; dayIndex < seedTemplate.days.length; dayIndex += 1) {
      await insertSeedDay(supabase, templateId, seedTemplate.days[dayIndex], dayIndex);
    }
  }
}

async function insertSeedDay(
  supabase: SupabaseClient,
  templateId: string,
  day: SeedDay,
  dayIndex: number,
): Promise<void> {
  const { data: insertedDay } = await supabase
    .from("workout_template_days")
    .insert({
      template_id: templateId,
      day_number: day.day ?? dayIndex + 1,
      name: day.name,
      sets_reps: day.sets_reps ?? null,
      day_type: day.type ?? "workout_day",
      cardio: day.cardio ?? [],
      options: day.options ?? [],
      sort_order: dayIndex,
    })
    .select("id")
    .single();

  if (!insertedDay) return;

  if (day.sections?.length) {
    for (let sectionIndex = 0; sectionIndex < day.sections.length; sectionIndex += 1) {
      const section = day.sections[sectionIndex];
      const { data: insertedSection } = await supabase
        .from("workout_template_sections")
        .insert({
          day_id: insertedDay.id,
          name: section.muscle_group,
          muscle_group: section.muscle_group,
          sets_reps: section.sets_reps ?? null,
          sort_order: sectionIndex,
        })
        .select("id")
        .single();

      if (insertedSection) {
        await insertExercises(supabase, templateId, insertedDay.id, insertedSection.id, section.exercises, section.sets_reps);
      }
    }
  } else {
    await insertExercises(supabase, templateId, insertedDay.id, null, day.exercises ?? [], day.sets_reps);
  }
}

async function insertExercises(
  supabase: SupabaseClient,
  templateId: string,
  dayId: string,
  sectionId: string | null,
  exercises: SeedExercise[],
  fallbackSetsReps?: string,
): Promise<void> {
  for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
    const exercise = exercises[exerciseIndex];
    const name = exerciseName(exercise);
    const media = await upsertExerciseMedia(supabase, name);
    await supabase.from("workout_template_exercises").insert({
      template_id: templateId,
      day_id: dayId,
      section_id: sectionId,
      exercise_media_id: media?.id ?? null,
      name,
      sets_reps: exerciseSetsReps(exercise, fallbackSetsReps),
      rest: exerciseRest(exercise),
      duration: exerciseDuration(exercise),
      notes: exerciseNotes(exercise),
      sort_order: exerciseIndex,
    });
  }
}

async function upsertExerciseMedia(supabase: SupabaseClient, exerciseNameValue: string): Promise<{ id: string } | null> {
  const media = MEDIA_PATHS[normalizeExerciseName(exerciseNameValue)] ?? {};
  const { data } = await supabase
    .from("exercise_media")
    .upsert({
      exercise_name: exerciseNameValue,
      machine_name: media.machineName ?? exerciseNameValue,
      machine_image_url: media.machine ?? null,
      demo_image_url: media.demo ?? media.machine ?? null,
      demo_video_url: null,
      instructions: `Use controlled form for ${exerciseNameValue}. Keep the target muscle engaged and ask your coach if anything feels painful.`,
    }, { onConflict: "exercise_name" })
    .select("id")
    .single();

  return data ?? null;
}

export async function loadWorkoutProgramTemplates(supabase: SupabaseClient): Promise<WorkoutProgramTemplate[]> {
  const { data: templates, error } = await supabase
    .from("workout_program_templates")
    .select("id, key, name, category, gender_focus, description, is_active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load workout programs: ${error.message}`);
  }

  const result: WorkoutProgramTemplate[] = [];
  for (const template of templates ?? []) {
    result.push({
      ...(template as Omit<WorkoutProgramTemplate, "days">),
      source: "structured_templates",
      days: await loadTemplateDays(supabase, template.id as string),
    });
  }
  return result;
}

export async function ensureLegacyWorkoutPlansSeeded(supabase: SupabaseClient): Promise<void> {
  const { data: existing, error } = await supabase
    .from("workout_plans")
    .select("id, name")
    .in("name", Object.values(TEMPLATE_META).map((meta) => meta.name));

  if (error) throw new Error(`Existing workout_plans table is not ready: ${error.message}`);

  const existingNames = new Set((existing ?? []).map((plan) => plan.name as string));
  const rows = allSeedTemplates()
    .map((seedTemplate) => {
      const meta = TEMPLATE_META[seedTemplate.key];
      if (!meta || existingNames.has(meta.name)) return null;
      return {
        name: meta.name,
        category: meta.category,
        level: "advanced",
        duration_weeks: seedTemplate.key === "professional_feminine_focus" ? 7 : seedTemplate.days.length,
        content: seedDaysToLegacyContent(seedTemplate.days),
        created_by: "system_seed",
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from("workout_plans").insert(rows);
  if (insertError) throw new Error(`Failed to seed workout_plans: ${insertError.message}`);
}

export async function loadLegacyWorkoutProgramTemplates(supabase: SupabaseClient): Promise<WorkoutProgramTemplate[]> {
  const { data: plans, error } = await supabase
    .from("workout_plans")
    .select("id, name, category, content, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load workout_plans: ${error.message}`);

  return (plans ?? []).map((plan) => {
    const content = Array.isArray(plan.content) ? plan.content : [];
    return {
      id: plan.id as string,
      key: `legacy_${plan.id}`,
      name: plan.name as string,
      category: plan.category as string,
      gender_focus: legacyGenderFocus(plan.name as string),
      description: "Seeded workout plan from workout_plans.",
      is_active: true,
      source: "legacy_workout_plans",
      days: content.map((day, dayIndex) => legacyDayToTemplateDay(plan.id as string, day, dayIndex)),
    };
  });
}

function seedDaysToLegacyContent(days: SeedDay[]) {
  return days.map((day) => ({
    day: day.name,
    day_type: day.type ?? "workout_day",
    sets_reps: day.sets_reps ?? null,
    cardio: day.cardio ?? [],
    options: day.options ?? [],
    exercises: seedDayExercises(day),
  }));
}

function seedDayExercises(day: SeedDay) {
  if (day.sections?.length) {
    return day.sections.flatMap((section) =>
      section.exercises.map((exercise) => ({
        name: exerciseName(exercise),
        sets_reps: exerciseSetsReps(exercise, section.sets_reps),
        rest: exerciseRest(exercise),
        duration: exerciseDuration(exercise),
        notes: exerciseNotes(exercise),
        section: section.muscle_group,
        media: legacyMediaForExercise(exerciseName(exercise)),
      })),
    );
  }

  return (day.exercises ?? []).map((exercise) => ({
    name: exerciseName(exercise),
    sets_reps: exerciseSetsReps(exercise, day.sets_reps),
    rest: exerciseRest(exercise),
    duration: exerciseDuration(exercise),
    notes: exerciseNotes(exercise),
    section: null,
    media: legacyMediaForExercise(exerciseName(exercise)),
  }));
}

function legacyMediaForExercise(name: string) {
  const media = MEDIA_PATHS[normalizeExerciseName(name)] ?? {};
  return {
    exercise_name: name,
    machine_name: media.machineName ?? name,
    machine_image_url: media.machine ?? null,
    demo_image_url: media.demo ?? media.machine ?? null,
    demo_video_url: null,
    instructions: `Use controlled form for ${name}. Keep the target muscle engaged and ask your coach if anything feels painful.`,
  };
}

function legacyDayToTemplateDay(planId: string, day: unknown, dayIndex: number): WorkoutTemplateDay {
  const row = day as {
    day?: string;
    day_type?: string;
    sets_reps?: string | null;
    notes?: string | null;
    cardio?: Array<{ name: string; duration: string }>;
    options?: string[];
    exercises?: Array<{
      name: string;
      sets_reps?: string | null;
      rest?: string | null;
      duration?: string | null;
      notes?: string | null;
      section?: string | null;
      media?: ExerciseMedia | null;
    }>;
  };

  const exercises = row.exercises ?? [];
  const sectionNames = Array.from(new Set(exercises.map((exercise) => exercise.section).filter(Boolean))) as string[];
  const directExercises = exercises.filter((exercise) => !exercise.section);

  return {
    id: `${planId}:day:${dayIndex}`,
    day_number: dayIndex + 1,
    name: row.day ?? `Day ${dayIndex + 1}`,
    sets_reps: row.sets_reps ?? null,
    day_type: row.day_type ?? "workout_day",
    notes: row.notes ?? null,
    cardio: row.cardio ?? [],
    options: row.options ?? [],
    sort_order: dayIndex,
    exercises: directExercises.map((exercise, exerciseIndex) =>
      legacyExerciseToTemplateExercise(`${planId}:day:${dayIndex}:exercise:${exerciseIndex}`, exercise, exerciseIndex),
    ),
    sections: sectionNames.map((sectionName, sectionIndex) => ({
      id: `${planId}:day:${dayIndex}:section:${sectionIndex}`,
      name: sectionName,
      muscle_group: sectionName,
      sets_reps: exercises.find((exercise) => exercise.section === sectionName)?.sets_reps ?? null,
      sort_order: sectionIndex,
      exercises: exercises
        .filter((exercise) => exercise.section === sectionName)
        .map((exercise, exerciseIndex) =>
          legacyExerciseToTemplateExercise(
            `${planId}:day:${dayIndex}:section:${sectionIndex}:exercise:${exerciseIndex}`,
            exercise,
            exerciseIndex,
          ),
        ),
    })),
  };
}

function legacyExerciseToTemplateExercise(
  id: string,
  exercise: {
    name: string;
    sets_reps?: string | null;
    rest?: string | null;
    duration?: string | null;
    notes?: string | null;
    media?: ExerciseMedia | null;
  },
  sortOrder: number,
): WorkoutTemplateExercise {
  return {
    id,
    name: exercise.name,
    sets_reps: exercise.sets_reps ?? null,
    rest: exercise.rest ?? null,
    duration: exercise.duration ?? null,
    instructions: exercise.media?.instructions ?? null,
    notes: exercise.notes ?? null,
    sort_order: sortOrder,
    media: exercise.media ?? null,
  };
}

function legacyGenderFocus(name: string): string | null {
  return name === "Professional Feminine Focus" ? "Female" : "Male";
}

export async function loadTemplateDays(supabase: SupabaseClient, templateId: string): Promise<WorkoutTemplateDay[]> {
  const { data: days } = await supabase
    .from("workout_template_days")
    .select("id, day_number, name, sets_reps, day_type, notes, cardio, options, sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  const loadedDays: WorkoutTemplateDay[] = [];
  for (const day of days ?? []) {
    const dayId = day.id as string;
    loadedDays.push({
      id: dayId,
      day_number: day.day_number as number | null,
      name: day.name as string,
      sets_reps: day.sets_reps as string | null,
      day_type: day.day_type as string,
      notes: day.notes as string | null,
      cardio: (day.cardio ?? []) as Array<{ name: string; duration: string }>,
      options: (day.options ?? []) as string[],
      sort_order: day.sort_order as number,
      sections: await loadTemplateSections(supabase, dayId),
      exercises: await loadTemplateExercises(supabase, dayId, null),
    });
  }
  return loadedDays;
}

async function loadTemplateSections(supabase: SupabaseClient, dayId: string): Promise<WorkoutTemplateSection[]> {
  const { data: sections } = await supabase
    .from("workout_template_sections")
    .select("id, name, muscle_group, sets_reps, sort_order")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: true });

  const loaded: WorkoutTemplateSection[] = [];
  for (const section of sections ?? []) {
    loaded.push({
      id: section.id as string,
      name: section.name as string | null,
      muscle_group: section.muscle_group as string | null,
      sets_reps: section.sets_reps as string | null,
      sort_order: section.sort_order as number,
      exercises: await loadTemplateExercises(supabase, dayId, section.id as string),
    });
  }
  return loaded;
}

async function loadTemplateExercises(
  supabase: SupabaseClient,
  dayId: string,
  sectionId: string | null,
): Promise<WorkoutTemplateExercise[]> {
  let query = supabase
    .from("workout_template_exercises")
    .select("id, name, sets_reps, rest, duration, instructions, notes, sort_order, media:exercise_media(*)")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: true });

  query = sectionId ? query.eq("section_id", sectionId) : query.is("section_id", null);

  const { data: exercises } = await query;
  return (exercises ?? []).map((exercise) => ({
    id: exercise.id as string,
    name: exercise.name as string,
    sets_reps: exercise.sets_reps as string | null,
    rest: exercise.rest as string | null,
    duration: exercise.duration as string | null,
    instructions: exercise.instructions as string | null,
    notes: exercise.notes as string | null,
    sort_order: exercise.sort_order as number,
    media: (exercise.media as unknown as ExerciseMedia | null) ?? null,
  }));
}
