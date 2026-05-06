-- ═══════════════════════════════════════════════════════════════
-- 016 — Coach Training System (English-only)
--
-- Four editable tables that back the coach plan builder:
--   training_systems      — Push/Pull/Legs, Upper/Lower, etc.
--   training_system_days  — default day templates per system
--   muscle_groups         — Chest, Back, Glutes, Cardio, etc.
--   exercises             — exercise library with image refs
--
-- Plans themselves stay in workout_plans (JSONB content); plan
-- assignments stay in plan_sends. This migration deliberately does
-- NOT add training_programs / member_training_programs to avoid
-- duplicating those concerns.
--
-- Sets / reps / rest / tempo are NOT seeded onto exercises.
-- Those values belong to the plan, not the library — coach fills
-- them while building each plan.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- updated_at trigger function (reused by all four tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ── 1. training_systems ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_systems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_systems ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_training_systems_updated_at ON public.training_systems;
CREATE TRIGGER trg_training_systems_updated_at
  BEFORE UPDATE ON public.training_systems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. training_system_days ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_system_days (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_system_id UUID NOT NULL REFERENCES public.training_systems(id) ON DELETE CASCADE,
  day_number         INTEGER,
  title              TEXT NOT NULL,
  focus              TEXT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_system_days ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tsd_system ON public.training_system_days(training_system_id);
DROP TRIGGER IF EXISTS trg_training_system_days_updated_at ON public.training_system_days;
CREATE TRIGGER trg_training_system_days_updated_at
  BEFORE UPDATE ON public.training_system_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. muscle_groups ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.muscle_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_muscle_groups_updated_at ON public.muscle_groups;
CREATE TRIGGER trg_muscle_groups_updated_at
  BEFORE UPDATE ON public.muscle_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. exercises ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  muscle_group_id   UUID REFERENCES public.muscle_groups(id) ON DELETE SET NULL,
  equipment         TEXT,
  image_url         TEXT,           -- brand artwork (OX comic)
  machine_image_url TEXT,           -- photo of the machine
  demo_url          TEXT,           -- demo image / animation
  file_name         TEXT,           -- slug used to derive paths
  storage_path      TEXT,           -- reserved for future Supabase Storage migration
  instructions      TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON public.exercises(is_active);
DROP TRIGGER IF EXISTS trg_exercises_updated_at ON public.exercises;
CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS policies (uniform across all four tables) ─────────────
-- Read: every authenticated user (so players can render exercise
--   metadata in their assigned plans).
-- Write: manager/head_coach/coach.
-- Delete: manager/head_coach only — coaches deactivate via is_active.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['training_systems','training_system_days','muscle_groups','exercises']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$I_select ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$I_insert ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$I_update ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$I_delete ON public.%1$I', t);

    EXECUTE format(
      'CREATE POLICY %1$I_select ON public.%1$I FOR SELECT TO authenticated USING (TRUE)', t);
    EXECUTE format(
      'CREATE POLICY %1$I_insert ON public.%1$I FOR INSERT TO authenticated WITH CHECK (current_user_role() = ANY (ARRAY[''manager'',''head_coach'',''coach'']))', t);
    EXECUTE format(
      'CREATE POLICY %1$I_update ON public.%1$I FOR UPDATE TO authenticated USING (current_user_role() = ANY (ARRAY[''manager'',''head_coach'',''coach''])) WITH CHECK (current_user_role() = ANY (ARRAY[''manager'',''head_coach'',''coach'']))', t);
    EXECUTE format(
      'CREATE POLICY %1$I_delete ON public.%1$I FOR DELETE TO authenticated USING (current_user_role() = ANY (ARRAY[''manager'',''head_coach'']))', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- All names are English. No sets/reps/rest/tempo.
-- Idempotent — re-running adds nothing.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.training_systems (name, sort_order) VALUES
  ('Classic PPL',                  10),
  ('Upper / Lower',                20),
  ('Advanced Split',               30),
  ('Professional Feminine Focus',  40),
  ('Cardio & Conditioning',        50)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.training_system_days (training_system_id, day_number, title, sort_order)
SELECT s.id, d.day_number, d.title, d.sort_order
FROM public.training_systems s
JOIN (VALUES
  ('Classic PPL',                  1, 'Push',                 10),
  ('Classic PPL',                  2, 'Pull',                 20),
  ('Classic PPL',                  3, 'Legs',                 30),
  ('Upper / Lower',                1, 'Upper Body',           10),
  ('Upper / Lower',                2, 'Lower Body',           20),
  ('Advanced Split',               1, 'Double Split',         10),
  ('Advanced Split',               2, 'Pro Split',            20),
  ('Professional Feminine Focus',  1, 'Glutes + Hamstrings',  10),
  ('Professional Feminine Focus',  2, 'Upper Body',           20),
  ('Professional Feminine Focus',  3, 'Quads + Calves',       30),
  ('Professional Feminine Focus',  4, 'Rest & Recovery',      40),
  ('Professional Feminine Focus',  5, 'Glutes Isolation',     50),
  ('Professional Feminine Focus',  6, 'Upper Body + Cardio',  60),
  ('Professional Feminine Focus',  7, 'OX Flex Day',          70),
  ('Cardio & Conditioning',        1, 'Cardio',               10),
  ('Cardio & Conditioning',        2, 'HIIT',                 20),
  ('Cardio & Conditioning',        3, 'Battle Ropes',         30),
  ('Cardio & Conditioning',        4, 'Resistance Bands',     40)
) AS d(system_name, day_number, title, sort_order)
  ON s.name = d.system_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_system_days x
  WHERE x.training_system_id = s.id AND x.title = d.title
);

INSERT INTO public.muscle_groups (name, sort_order) VALUES
  ('Chest',       10),
  ('Back',        20),
  ('Shoulders',   30),
  ('Biceps',      40),
  ('Triceps',     50),
  ('Forearms',    60),
  ('Core',        70),
  ('Quadriceps',  80),
  ('Hamstrings',  90),
  ('Glutes',     100),
  ('Calves',     110),
  ('Adductors',  120),
  ('Abductors',  130),
  ('Cardio',     140),
  ('Mobility',   150),
  ('Full Body',  160)
ON CONFLICT (name) DO NOTHING;

-- file_name = slug; image paths follow:
--   /exercises/ox-comic/{slug}-ox-comic.png   (image_url, brand artwork)
--   /exercises/machines/{slug}-machine.png    (machine_image_url)
--   /exercises/demos/{slug}-demo.png          (demo_url)
INSERT INTO public.exercises
  (name, muscle_group_id, equipment, image_url, machine_image_url, demo_url, file_name, sort_order)
SELECT
  e.name,
  mg.id,
  e.equipment,
  '/exercises/ox-comic/'  || e.slug || '-ox-comic.png',
  '/exercises/machines/'  || e.slug || '-machine.png',
  '/exercises/demos/'     || e.slug || '-demo.png',
  e.slug,
  e.sort_order
FROM public.muscle_groups mg
JOIN (VALUES
  -- Chest
  ('Chest', 'Chest Press',                'Machine',        'chest-press',                 10),
  ('Chest', 'Incline Chest Press',        'Machine',        'incline-chest-press',         20),
  ('Chest', 'Pec Deck Fly',               'Machine',        'pec-deck-fly',                30),
  ('Chest', 'Cable Crossover',            'Cable',          'cable-crossover',             40),
  ('Chest', 'Push-Up',                    'Bodyweight',     'push-up',                     50),
  -- Back
  ('Back',  'Lat Pulldown',               'Cable',          'lat-pulldown',                10),
  ('Back',  'Seated Cable Row',           'Cable',          'seated-cable-row',            20),
  ('Back',  'T-Bar Row',                  'Machine',        't-bar-row',                   30),
  ('Back',  'Assisted Pull-Up',           'Machine',        'assisted-pull-up',            40),
  ('Back',  'Back Extension',             'Machine',        'back-extension',              50),
  -- Shoulders
  ('Shoulders', 'Shoulder Press',         'Machine',        'shoulder-press',              10),
  ('Shoulders', 'Machine Lateral Raise',  'Machine',        'machine-lateral-raise',       20),
  ('Shoulders', 'Rear Delt Fly',          'Machine',        'rear-delt-fly',               30),
  ('Shoulders', 'Cable Lateral Raise',    'Cable',          'cable-lateral-raise',         40),
  ('Shoulders', 'Face Pull',              'Cable',          'face-pull',                   50),
  -- Biceps
  ('Biceps', 'Machine Biceps Curl',       'Machine',        'machine-biceps-curl',         10),
  ('Biceps', 'Preacher Curl',             'Machine',        'preacher-curl',               20),
  ('Biceps', 'Cable Biceps Curl',         'Cable',          'cable-biceps-curl',           30),
  ('Biceps', 'Dumbbell Curl',             'Dumbbell',       'dumbbell-curl',               40),
  ('Biceps', 'Hammer Curl',               'Dumbbell',       'hammer-curl',                 50),
  -- Triceps
  ('Triceps', 'Cable Triceps Pushdown',   'Cable',          'cable-triceps-pushdown',      10),
  ('Triceps', 'Overhead Triceps Extension','Cable',         'overhead-triceps-extension',  20),
  ('Triceps', 'Machine Triceps Extension','Machine',        'machine-triceps-extension',   30),
  ('Triceps', 'Assisted Dip',             'Machine',        'assisted-dip',                40),
  ('Triceps', 'Rope Pushdown',            'Cable',          'rope-pushdown',               50),
  -- Quadriceps
  ('Quadriceps', 'Leg Press',             'Machine',        'leg-press',                   10),
  ('Quadriceps', 'Hack Squat',            'Machine',        'hack-squat',                  20),
  ('Quadriceps', 'Smith Machine Squat',   'Smith Machine',  'smith-machine-squat',         30),
  ('Quadriceps', 'Leg Extension',         'Machine',        'leg-extension',               40),
  ('Quadriceps', 'Walking Lunges',        'Bodyweight',     'walking-lunges',              50),
  -- Hamstrings
  ('Hamstrings', 'Seated Leg Curl',       'Machine',        'seated-leg-curl',             10),
  ('Hamstrings', 'Lying Leg Curl',        'Machine',        'lying-leg-curl',              20),
  ('Hamstrings', 'Romanian Deadlift',     'Barbell',        'romanian-deadlift',           30),
  ('Hamstrings', 'Cable Pull-Through',    'Cable',          'cable-pull-through',          40),
  -- Glutes
  ('Glutes', 'Hip Thrust Machine',        'Machine',        'hip-thrust-machine',          10),
  ('Glutes', 'Glute Kickback Machine',    'Machine',        'glute-kickback-machine',      20),
  ('Glutes', 'Cable Glute Kickback',      'Cable',          'cable-glute-kickback',        30),
  ('Glutes', 'Hip Abductor',              'Machine',        'hip-abductor',                40),
  ('Glutes', 'Bulgarian Split Squat',     'Dumbbell',       'bulgarian-split-squat',       50),
  -- Calves
  ('Calves', 'Standing Calf Raise',       'Machine',        'standing-calf-raise',         10),
  ('Calves', 'Seated Calf Raise',         'Machine',        'seated-calf-raise',           20),
  ('Calves', 'Leg Press Calf Raise',      'Machine',        'leg-press-calf-raise',        30),
  -- Core
  ('Core', 'Ab Crunch Machine',           'Machine',        'ab-crunch-machine',           10),
  ('Core', 'Hanging Knee Raise',          'Bodyweight',     'hanging-knee-raise',          20),
  ('Core', 'Cable Woodchop',              'Cable',          'cable-woodchop',              30),
  ('Core', 'Plank',                       'Bodyweight',     'plank',                       40),
  ('Core', 'Russian Twist',               'Bodyweight',     'russian-twist',               50),
  -- Cardio / Conditioning
  ('Cardio', 'Treadmill',                 'Cardio Machine', 'treadmill',                   10),
  ('Cardio', 'Stationary Bike',           'Cardio Machine', 'stationary-bike',             20),
  ('Cardio', 'Stairmaster',               'Cardio Machine', 'stairmaster',                 30),
  ('Cardio', 'Rowing Machine',            'Cardio Machine', 'rowing-machine',              40),
  ('Cardio', 'Battle Ropes',              'Conditioning',   'battle-ropes',                50),
  ('Cardio', 'Resistance Bands',          'Bands',          'resistance-bands',            60),
  ('Cardio', 'HIIT Circuit',              'Mixed',          'hiit-circuit',                70)
) AS e(muscle_group, name, equipment, slug, sort_order)
  ON mg.name = e.muscle_group
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises x WHERE x.name = e.name AND x.muscle_group_id = mg.id
);
