import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const seed = JSON.parse(fs.readFileSync("data/workout-programs/ox_program_templates.json", "utf8"));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const meta = {
  pro_split_1: { name: "Pro Split 1", category: "Pro Split", level: "advanced" },
  pro_split_2: { name: "Pro Split 2", category: "Pro Split", level: "advanced" },
  double_split: { name: "Double Split", category: "Double Split", level: "advanced" },
  professional_feminine_focus: { name: "Professional Feminine Focus", category: "Feminine Focus", level: "advanced" },
};

const templates = [
  { key: "pro_split_1", days: seed.male_programs.pro_split_1 },
  { key: "pro_split_2", days: seed.male_programs.pro_split_2 },
  { key: "double_split", days: seed.male_programs.double_split },
  { key: "professional_feminine_focus", days: seed.female_programs.professional_feminine_focus },
];

const mediaPaths = {
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

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function exerciseName(exercise) {
  return typeof exercise === "string" ? exercise : exercise.name;
}

function exerciseSetsReps(exercise, fallback) {
  return typeof exercise === "string" ? fallback ?? null : exercise.sets_reps ?? fallback ?? null;
}

function exerciseRest(exercise) {
  return typeof exercise === "string" ? null : exercise.rest ?? null;
}

function exerciseDuration(exercise) {
  return typeof exercise === "string" ? null : exercise.duration ?? null;
}

function exerciseNotes(exercise) {
  return typeof exercise === "string" ? null : exercise.notes ?? null;
}

function mediaForExercise(name) {
  const media = mediaPaths[normalizeName(name)] ?? {};
  return {
    exercise_name: name,
    machine_name: name,
    machine_image_url: media.machine ?? null,
    demo_image_url: media.demo ?? media.machine ?? null,
    demo_video_url: null,
    instructions: `Use controlled form for ${name}. Keep the target muscle engaged and ask your coach if anything feels painful.`,
  };
}

function dayExercises(day) {
  if (day.sections?.length) {
    return day.sections.flatMap((section) =>
      section.exercises.map((exercise) => {
        const name = exerciseName(exercise);
        return {
          name,
          sets_reps: exerciseSetsReps(exercise, section.sets_reps),
          rest: exerciseRest(exercise),
          duration: exerciseDuration(exercise),
          notes: exerciseNotes(exercise),
          section: section.muscle_group,
          media: mediaForExercise(name),
        };
      }),
    );
  }

  return (day.exercises ?? []).map((exercise) => {
    const name = exerciseName(exercise);
    return {
      name,
      sets_reps: exerciseSetsReps(exercise, day.sets_reps),
      rest: exerciseRest(exercise),
      duration: exerciseDuration(exercise),
      notes: exerciseNotes(exercise),
      section: null,
      media: mediaForExercise(name),
    };
  });
}

function planContent(days) {
  return days.map((day) => ({
    day: day.name,
    day_type: day.type ?? "workout_day",
    sets_reps: day.sets_reps ?? null,
    cardio: day.cardio ?? [],
    options: day.options ?? [],
    exercises: dayExercises(day),
  }));
}

const { data: existing, error: readError } = await supabase
  .from("workout_plans")
  .select("id, name");

if (readError) {
  console.error("Failed to read workout_plans:", readError.message);
  process.exit(1);
}

const existingByName = new Map((existing ?? []).map((plan) => [plan.name, plan.id]));
let inserted = 0;
let updated = 0;

for (const template of templates) {
  const details = meta[template.key];
  const row = {
    name: details.name,
    category: details.category,
    level: details.level,
    duration_weeks: template.key === "professional_feminine_focus" ? 7 : template.days.length,
    content: planContent(template.days),
    created_by: "system_seed",
  };

  const existingId = existingByName.get(details.name);
  if (existingId) {
    const { error } = await supabase.from("workout_plans").update(row).eq("id", existingId);
    if (error) {
      console.error(`Failed to update ${details.name}:`, error.message);
      process.exit(1);
    }
    updated += 1;
  } else {
    const { error } = await supabase.from("workout_plans").insert(row);
    if (error) {
      console.error(`Failed to insert ${details.name}:`, error.message);
      process.exit(1);
    }
    inserted += 1;
  }
}

console.log(`Seeded workout_plans. inserted=${inserted} updated=${updated}`);
