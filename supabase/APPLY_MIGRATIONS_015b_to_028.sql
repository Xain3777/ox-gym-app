-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Bundle of unapplied migrations  (rev 4 — view-replace fix)
--
-- Apply path A's missing schema in one paste:
--   015b → phone_normalized + signup-link wiring
--   016  → coach training system tables
--   017  → member identity linking (adds members.name_normalized + normalize fns)
--   018  → workout program templates + assignment tables
--   019  → seed 4 workout program templates  [variable rename: exercise_name → v_exercise_name]
--   020  → exercise create + media links
--   021  → coach workout library CRUD hardening
--   025  → app profile + coach eligibility view  [adds missing columns to legacy member_app_profiles]
--   026  → recover legacy app profiles + audit view
--   027  → app registration marker  [drops audit view first to allow column reorder]
--   028  → phone-only member identity
--
-- Single transaction. Failure rolls back; DB unchanged.
-- ═══════════════════════════════════════════════════════════════

BEGIN;


-- ═══════════════════════════════════════════════════════════════
-- 015_phone_normalized_signup_link.sql
-- ═══════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 015: phone_normalized + signup-link wiring
--
-- Purpose: let the player self-signup flow link to a member that
-- reception/dashboard already created, instead of duplicating rows.
-- The match key is the phone number, normalized to its digits-only
-- canonical form (e.g. "+963 91 234 5678" → "963912345678") and
-- compared in a generated/triggered phone_normalized column.
--
-- Profile fields the spec calls out (height_cm, weight_kg, illnesses,
-- injuries, fitness_goal) already exist on members from migration 013;
-- this migration does NOT redefine them. It adds only:
--
--   1. members.phone_normalized TEXT      -- digits-only canonical form
--   2. backfill from existing members.phone
--   3. trigger so any future write of phone keeps phone_normalized in sync
--   4. unique partial index over (phone_normalized) WHERE role='player'
--      AND phone_normalized IS NOT NULL — prevents two player accounts
--      on the same number; staff can share a synthetic phone if needed.
--   5. helper function public.normalize_phone(text) used by the trigger
--      and reusable from any RPC / future seed.
--
-- Idempotent — re-running is safe.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. NORMALIZE HELPER ──────────────────────────────────────────
-- Mirrors src/lib/phone.ts normalizePhone():
--   strip every non-digit, then:
--     "09XXXXXXXX"   (10-digit local Syrian) → "963" + last 9 digits
--     "963XXXXXXXXX" (12-digit international) → unchanged
--     anything else → return digits as-is
CREATE OR REPLACE FUNCTION public.normalize_phone(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_input, '\D', '', 'g');

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  IF length(v_digits) = 10 AND left(v_digits, 2) = '09' THEN
    RETURN '963' || substring(v_digits FROM 2);
  END IF;

  IF length(v_digits) = 12 AND left(v_digits, 3) = '963' THEN
    RETURN v_digits;
  END IF;

  RETURN v_digits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;

-- ── 2. ADD COLUMN ────────────────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

COMMENT ON COLUMN public.members.phone_normalized IS
  'Canonical digits-only form of phone, kept in sync by trg_members_phone_normalized. Primary identity key for matching dashboard-created members against self-signups by phone.';

-- ── 3. BACKFILL ──────────────────────────────────────────────────
UPDATE public.members
   SET phone_normalized = public.normalize_phone(phone)
 WHERE phone IS NOT NULL
   AND (phone_normalized IS NULL OR phone_normalized <> public.normalize_phone(phone));

-- ── 4. TRIGGER — keep phone_normalized in sync on every write ────
-- This way every code path (route handlers, reception form, RPC seeds)
-- writes the canonical value automatically — no app-side discipline
-- needed to prevent drift.
CREATE OR REPLACE FUNCTION public.sync_member_phone_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_phone_normalized ON public.members;
CREATE TRIGGER trg_members_phone_normalized
BEFORE INSERT OR UPDATE OF phone ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_member_phone_normalized();

-- ── 5. UNIQUE PARTIAL INDEX ──────────────────────────────────────
-- Players cannot collide on the same phone. Staff (manager / coach /
-- head_coach / reception) are excluded — they're seeded with synthetic
-- 0922000xx phones today, and we don't want to break that flow.
CREATE UNIQUE INDEX IF NOT EXISTS members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════
-- 016_coach_training_system.sql
-- ═══════════════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════════════
-- 017_member_identity_linking.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 017: member identity linking hardening
--
-- Keeps dashboard-created members and app signups matched by canonical
-- phone + name without exposing member/subscription rows to the app before
-- the match is confirmed.

CREATE OR REPLACE FUNCTION public.normalize_phone(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(
    translate(p_input, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
    '\D',
    '',
    'g'
  );

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  IF length(v_digits) = 10 AND left(v_digits, 2) = '09' THEN
    RETURN '963' || substring(v_digits FROM 2);
  END IF;

  IF length(v_digits) = 12 AND left(v_digits, 3) = '963' THEN
    RETURN v_digits;
  END IF;

  RETURN v_digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_member_name(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_name := trim(translate(p_input, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'));
  v_name := regexp_replace(v_name, '[ًٌٍَُِّْٰـ]', '', 'g');
  v_name := translate(v_name, 'إأآٱىةؤئ', 'اااايهوي');
  v_name := regexp_replace(v_name, '\s+', ' ', 'g');
  v_name := lower(v_name);

  IF v_name = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_member_name(TEXT) TO anon, authenticated, service_role;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS name_normalized TEXT;

COMMENT ON COLUMN public.members.auth_id IS
  'Linked OX App auth.users.id. NULL means this dashboard member has not linked an app account yet.';

COMMENT ON COLUMN public.members.name_normalized IS
  'Canonical normalized member name for safe app-to-dashboard identity matching with phone_normalized.';

CREATE OR REPLACE FUNCTION public.sync_member_identity_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  NEW.name_normalized := public.normalize_member_name(NEW.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_phone_normalized ON public.members;
DROP TRIGGER IF EXISTS trg_members_identity_normalized ON public.members;
CREATE TRIGGER trg_members_identity_normalized
BEFORE INSERT OR UPDATE OF phone, full_name ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_member_identity_normalized();

UPDATE public.members
   SET phone_normalized = public.normalize_phone(phone),
       name_normalized = public.normalize_member_name(full_name)
 WHERE phone_normalized IS DISTINCT FROM public.normalize_phone(phone)
    OR name_normalized IS DISTINCT FROM public.normalize_member_name(full_name);

CREATE INDEX IF NOT EXISTS members_player_identity_match_idx
  ON public.members (phone_normalized, name_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL AND name_normalized IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════
-- 018_workout_program_assignment_flow.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 018: structured workout program templates + assignments

CREATE TABLE IF NOT EXISTS public.workout_program_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  gender_focus TEXT,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE CASCADE,
  day_number  INTEGER,
  name        TEXT NOT NULL,
  sets_reps   TEXT,
  day_type    TEXT NOT NULL DEFAULT 'workout_day',
  notes       TEXT,
  cardio      JSONB NOT NULL DEFAULT '[]',
  options     TEXT[] NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id       UUID NOT NULL REFERENCES public.workout_template_days(id) ON DELETE CASCADE,
  name         TEXT,
  muscle_group TEXT,
  sets_reps    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.exercise_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name     TEXT NOT NULL UNIQUE,
  machine_name      TEXT,
  machine_image_url TEXT,
  demo_image_url    TEXT,
  demo_video_url    TEXT,
  instructions      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE CASCADE,
  day_id            UUID NOT NULL REFERENCES public.workout_template_days(id) ON DELETE CASCADE,
  section_id        UUID REFERENCES public.workout_template_sections(id) ON DELETE CASCADE,
  exercise_media_id UUID REFERENCES public.exercise_media(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  sets_reps         TEXT,
  rest              TEXT,
  duration          TEXT,
  notes             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.member_workout_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  notes       TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_template_days_template_idx
  ON public.workout_template_days(template_id, sort_order);
CREATE INDEX IF NOT EXISTS workout_template_sections_day_idx
  ON public.workout_template_sections(day_id, sort_order);
CREATE INDEX IF NOT EXISTS workout_template_exercises_day_idx
  ON public.workout_template_exercises(day_id, section_id, sort_order);
CREATE INDEX IF NOT EXISTS member_workout_programs_member_idx
  ON public.member_workout_programs(member_id, status, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS member_workout_programs_one_active_idx
  ON public.member_workout_programs(member_id)
  WHERE status = 'active';

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workout_program_templates',
    'workout_template_days',
    'workout_template_sections',
    'exercise_media',
    'workout_template_exercises',
    'member_workout_programs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS workout_program_templates_select ON public.workout_program_templates;
CREATE POLICY workout_program_templates_select ON public.workout_program_templates
FOR SELECT TO authenticated
USING (
  is_active
  AND (
    public.current_user_role() IN ('manager','head_coach','coach','admin')
    OR EXISTS (
      SELECT 1
      FROM public.member_workout_programs mwp
      JOIN public.members m ON m.id = mwp.member_id
      WHERE mwp.template_id = workout_program_templates.id
        AND mwp.status = 'active'
        AND m.auth_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS workout_program_templates_write ON public.workout_program_templates;
CREATE POLICY workout_program_templates_write ON public.workout_program_templates
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_days_select ON public.workout_template_days;
CREATE POLICY workout_template_days_select ON public.workout_template_days
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.members m ON m.id = mwp.member_id
    WHERE mwp.template_id = workout_template_days.template_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_days_write ON public.workout_template_days;
CREATE POLICY workout_template_days_write ON public.workout_template_days
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_sections_select ON public.workout_template_sections;
CREATE POLICY workout_template_sections_select ON public.workout_template_sections
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.workout_template_days d ON d.template_id = mwp.template_id
    JOIN public.members m ON m.id = mwp.member_id
    WHERE d.id = workout_template_sections.day_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_sections_write ON public.workout_template_sections;
CREATE POLICY workout_template_sections_write ON public.workout_template_sections
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_exercises_select ON public.workout_template_exercises;
CREATE POLICY workout_template_exercises_select ON public.workout_template_exercises
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.members m ON m.id = mwp.member_id
    WHERE mwp.template_id = workout_template_exercises.template_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_exercises_write ON public.workout_template_exercises;
CREATE POLICY workout_template_exercises_write ON public.workout_template_exercises
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS exercise_media_select ON public.exercise_media;
CREATE POLICY exercise_media_select ON public.exercise_media
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.workout_template_exercises wte
    JOIN public.member_workout_programs mwp ON mwp.template_id = wte.template_id
    JOIN public.members m ON m.id = mwp.member_id
    WHERE wte.exercise_media_id = exercise_media.id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS exercise_media_write ON public.exercise_media;
CREATE POLICY exercise_media_write ON public.exercise_media
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS member_workout_programs_select ON public.member_workout_programs;
CREATE POLICY member_workout_programs_select ON public.member_workout_programs
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_workout_programs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS member_workout_programs_write ON public.member_workout_programs;
CREATE POLICY member_workout_programs_write ON public.member_workout_programs
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));


-- ═══════════════════════════════════════════════════════════════
-- 019_seed_workout_program_templates.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 019: seed structured workout program templates
-- Depends on 018_workout_program_assignment_flow.sql.

ALTER TABLE public.workout_program_templates
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.workout_template_days
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.workout_template_sections
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_workout_program_templates_updated_at ON public.workout_program_templates;
CREATE TRIGGER trg_workout_program_templates_updated_at
  BEFORE UPDATE ON public.workout_program_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_days_updated_at ON public.workout_template_days;
CREATE TRIGGER trg_workout_template_days_updated_at
  BEFORE UPDATE ON public.workout_template_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_sections_updated_at ON public.workout_template_sections;
CREATE TRIGGER trg_workout_template_sections_updated_at
  BEFORE UPDATE ON public.workout_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_exercises_updated_at ON public.workout_template_exercises;
CREATE TRIGGER trg_workout_template_exercises_updated_at
  BEFORE UPDATE ON public.workout_template_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_media_updated_at ON public.exercise_media;
CREATE TRIGGER trg_exercise_media_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  programs JSONB := $seed$
  [
    {
      "key": "pro_split_1",
      "name": "Pro Split 1",
      "category": "Pro Split",
      "gender_focus": "Male",
      "description": "OX structured Pro Split workout program. Version 1.",
      "days": [
        {"name":"Push","sets_reps":"3 x 12-10-8","exercises":["Chest Press","Incline Chest Press","Chest Fly Machine","Dips","Shoulder Press Machine","Lateral Raise","Barbell Skull Crusher","Barbell Overhead Extension"]},
        {"name":"Pull","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown","Seated Row","Cable Seated Row","Lat Pulldown Machine","Cobra Lower Back","Rear Delt Fly Machine","Preacher Curl","Cable Hammer Curl"]},
        {"name":"Legs","sets_reps":"3 x 12-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Romanian Deadlift - RDL","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "pro_split_2",
      "name": "Pro Split 2",
      "category": "Pro Split",
      "gender_focus": "Male",
      "description": "OX structured Pro Split workout program. Version 2.",
      "days": [
        {"name":"Push","sets_reps":"3 x 12-10-8","exercises":["Chest Press - Vertical Grip","Chest Fly Machine","Incline Chest Fly","Cable Lower Chest Fly","Dumbbell Shoulder Press","Dumbbell Lateral Raise","Dumbbell Overhead Extension","Triceps Cable Pushdown"]},
        {"name":"Pull","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown Machine","Seated Row - Wide Grip","Incline Row Machine","T-Bar Row - Upper Back","Cobra Lower Back","Cable Face Pull","Dumbbell Incline Curl","Hammer Curl Machine"]},
        {"name":"Legs","sets_reps":"3 x 12-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Romanian Deadlift - RDL","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "double_split",
      "name": "Double Split",
      "category": "Double Split",
      "gender_focus": "Male",
      "description": "OX structured Double Split workout program.",
      "days": [
        {
          "name": "Shoulders + Biceps",
          "sections": [
            {"name":"Shoulders","sets_reps":"3 x 12-10-10","exercises":["Shoulder Press","Dumbbell Lateral Raise","Shoulder Press Machine","Dumbbell Front Raise","Rear Delt Fly Machine"]},
            {"name":"Biceps","sets_reps":"3 x 12-10-8","exercises":["Dumbbell Incline Curl","Hammer Curl Machine","Cable Biceps Curl"]}
          ]
        },
        {
          "name": "Back + Triceps",
          "sections": [
            {"name":"Back","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown","Seated Row","Incline Row Machine","Lat Pulldown Machine","Cobra Lower Back"]},
            {"name":"Triceps","sets_reps":"3 x 12-10-8","exercises":["Triceps Cable Pushdown","Barbell Skull Crusher","Overhead Cable Extension"]}
          ]
        },
        {
          "name": "Chest + Core",
          "sections": [
            {"name":"Chest","sets_reps":"3 x 12-10-10","exercises":["Chest Press - Vertical Grip","Chest Fly Machine","Incline Chest Press","Split Chest Press","Cable Lower Chest Fly or Dips Machine"]},
            {"name":"Core","exercises":[
              {"name":"Abdominal Crunches","sets_reps":"3 x 10"},
              {"name":"Mountain Climbers","sets_reps":"30 reps","rest":"10 seconds"},
              {"name":"Plank","duration":"30 seconds","rest":"10 seconds"}
            ]}
          ]
        },
        {"name":"Legs","sets_reps":"3 x 15-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Adductor Machine","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "professional_feminine_focus",
      "name": "Professional Feminine Focus",
      "category": "Feminine Focus",
      "gender_focus": "Female",
      "description": "OX structured Professional Feminine Focus workout program.",
      "days": [
        {"day_number":1,"name":"Glutes + Hamstrings","sets_reps":"3 x 12-10-10","exercises":["Hip Thrust","Belt Squat - Glutes","Adductor Machine","Cable Kickbacks","Romanian Deadlift - RDL"]},
        {"day_number":2,"name":"Upper Body","sets_reps":"3 x 10","exercises":["Lat Pulldown","Seated Row","Dumbbell Lateral Raise","Shoulder Press Machine","Chest Press - Vertical Grip","Chest Fly Machine","Triceps Cable Pushdown","Cable Biceps Curl"]},
        {"day_number":3,"name":"Quadriceps + Calves","sets_reps":"3 x 10","exercises":["Belt Squat - Quadriceps","Leg Press - Quadriceps","Leg Extension","Abductor Machine","Calf Raises"]},
        {"day_number":4,"name":"Rest & Recovery","type":"rest_day","exercises":[]},
        {"day_number":5,"name":"Glutes Focus","sets_reps":"3 x 12-10-10","exercises":["Barbell Hip Thrust","Rear Kick Machine","Belt Squat - Glutes","Banded Kickbacks","Clamshells"]},
        {"day_number":6,"name":"Upper Body + Cardio","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown Machine","Cable Seated Row","Split Chest Press","Chest Fly Machine","Dumbbell Lateral Raise","Overhead Cable Extension","Rear Delt Fly Machine"],"cardio":[{"name":"Treadmill","duration":"15 minutes"},{"name":"Stair Master","duration":"5 minutes"}]},
        {"day_number":7,"name":"OX Flex Day","type":"flexible_day","options":["Rest","Make-up Session","Advanced Functional Work"],"exercises":[]}
      ]
    }
  ]
  $seed$::JSONB;
  program JSONB;
  day_item JSONB;
  section_item JSONB;
  exercise_item JSONB;
  program_id UUID;
  day_id UUID;
  section_id UUID;
  media_id UUID;
  day_index INTEGER;
  section_index INTEGER;
  exercise_index INTEGER;
  v_exercise_name TEXT;
  exercise_sets_reps TEXT;
  exercise_rest TEXT;
  exercise_duration TEXT;
  exercise_instructions TEXT;
BEGIN
  UPDATE public.workout_program_templates
  SET
    name = 'Pro Split Legacy',
    description = 'Replaced by Pro Split 1 and Pro Split 2 variants.',
    is_active = FALSE,
    updated_at = now()
  WHERE key = 'pro_split';

  FOR program IN SELECT value FROM jsonb_array_elements(programs)
  LOOP
    INSERT INTO public.workout_program_templates (key, name, category, gender_focus, description, is_active, updated_at)
    VALUES (
      program->>'key',
      program->>'name',
      program->>'category',
      program->>'gender_focus',
      program->>'description',
      TRUE,
      now()
    )
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      gender_focus = EXCLUDED.gender_focus,
      description = EXCLUDED.description,
      is_active = TRUE,
      updated_at = now()
    RETURNING id INTO program_id;

    DELETE FROM public.workout_template_days WHERE template_id = program_id;

    day_index := 0;
    FOR day_item IN SELECT value FROM jsonb_array_elements(program->'days')
    LOOP
      INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        sets_reps,
        day_type,
        notes,
        cardio,
        options,
        sort_order,
        updated_at
      )
      VALUES (
        program_id,
        COALESCE((day_item->>'day_number')::INTEGER, day_index + 1),
        day_item->>'name',
        day_item->>'sets_reps',
        COALESCE(day_item->>'type', 'workout_day'),
        day_item->>'notes',
        COALESCE(day_item->'cardio', '[]'::JSONB),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(day_item->'options')), ARRAY[]::TEXT[]),
        day_index,
        now()
      )
      RETURNING id INTO day_id;

      IF jsonb_typeof(day_item->'sections') = 'array' THEN
        section_index := 0;
        FOR section_item IN SELECT value FROM jsonb_array_elements(day_item->'sections')
        LOOP
          INSERT INTO public.workout_template_sections (
            day_id,
            name,
            muscle_group,
            sets_reps,
            sort_order,
            updated_at
          )
          VALUES (
            day_id,
            section_item->>'name',
            section_item->>'name',
            section_item->>'sets_reps',
            section_index,
            now()
          )
          RETURNING id INTO section_id;

          exercise_index := 0;
          FOR exercise_item IN SELECT value FROM jsonb_array_elements(section_item->'exercises')
          LOOP
            IF jsonb_typeof(exercise_item) = 'object' THEN
              v_exercise_name := exercise_item->>'name';
              exercise_sets_reps := exercise_item->>'sets_reps';
              exercise_rest := exercise_item->>'rest';
              exercise_duration := exercise_item->>'duration';
            ELSE
              v_exercise_name := trim(both '"' from exercise_item::TEXT);
              exercise_sets_reps := section_item->>'sets_reps';
              exercise_rest := NULL;
              exercise_duration := NULL;
            END IF;

            exercise_instructions := 'Use controlled form for ' || v_exercise_name || '. Keep the target muscle engaged and ask your coach if anything feels painful.';

            INSERT INTO public.exercise_media (exercise_name, machine_name, instructions, updated_at)
            VALUES (v_exercise_name, v_exercise_name, exercise_instructions, now())
            ON CONFLICT (exercise_name) DO UPDATE SET
              machine_name = COALESCE(public.exercise_media.machine_name, EXCLUDED.machine_name),
              instructions = COALESCE(public.exercise_media.instructions, EXCLUDED.instructions),
              updated_at = now()
            RETURNING id INTO media_id;

            INSERT INTO public.workout_template_exercises (
              template_id,
              day_id,
              section_id,
              exercise_media_id,
              name,
              sets_reps,
              rest,
              duration,
              instructions,
              sort_order,
              updated_at
            )
            VALUES (
              program_id,
              day_id,
              section_id,
              media_id,
              v_exercise_name,
              exercise_sets_reps,
              exercise_rest,
              exercise_duration,
              exercise_instructions,
              exercise_index,
              now()
            );

            exercise_index := exercise_index + 1;
          END LOOP;

          section_index := section_index + 1;
        END LOOP;
      ELSE
        exercise_index := 0;
        FOR exercise_item IN SELECT value FROM jsonb_array_elements(COALESCE(day_item->'exercises', '[]'::JSONB))
        LOOP
          IF jsonb_typeof(exercise_item) = 'object' THEN
            v_exercise_name := exercise_item->>'name';
            exercise_sets_reps := COALESCE(exercise_item->>'sets_reps', day_item->>'sets_reps');
            exercise_rest := exercise_item->>'rest';
            exercise_duration := exercise_item->>'duration';
          ELSE
            v_exercise_name := trim(both '"' from exercise_item::TEXT);
            exercise_sets_reps := day_item->>'sets_reps';
            exercise_rest := NULL;
            exercise_duration := NULL;
          END IF;

          exercise_instructions := 'Use controlled form for ' || v_exercise_name || '. Keep the target muscle engaged and ask your coach if anything feels painful.';

          INSERT INTO public.exercise_media (exercise_name, machine_name, instructions, updated_at)
          VALUES (v_exercise_name, v_exercise_name, exercise_instructions, now())
          ON CONFLICT (exercise_name) DO UPDATE SET
            machine_name = COALESCE(public.exercise_media.machine_name, EXCLUDED.machine_name),
            instructions = COALESCE(public.exercise_media.instructions, EXCLUDED.instructions),
            updated_at = now()
          RETURNING id INTO media_id;

          INSERT INTO public.workout_template_exercises (
            template_id,
            day_id,
            section_id,
            exercise_media_id,
            name,
            sets_reps,
            rest,
            duration,
            instructions,
            sort_order,
            updated_at
          )
          VALUES (
            program_id,
            day_id,
            NULL,
            media_id,
            v_exercise_name,
            exercise_sets_reps,
            exercise_rest,
            exercise_duration,
            exercise_instructions,
            exercise_index,
            now()
          );

          exercise_index := exercise_index + 1;
        END LOOP;
      END IF;

      day_index := day_index + 1;
    END LOOP;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 020_workout_exercise_create_and_media_links.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 020: exercise creation support + real media suggestions
-- Depends on 018 and 019.

ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS workout_template_exercises_media_idx
  ON public.workout_template_exercises(exercise_media_id);

DROP TRIGGER IF EXISTS trg_workout_template_exercises_updated_at ON public.workout_template_exercises;
CREATE TRIGGER trg_workout_template_exercises_updated_at
  BEFORE UPDATE ON public.workout_template_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_media_updated_at ON public.exercise_media;
CREATE TRIGGER trg_exercise_media_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.exercise_media_seed_links (
  exercise_name     TEXT PRIMARY KEY,
  machine_name      TEXT,
  machine_image_url TEXT,
  demo_image_url    TEXT,
  demo_video_url    TEXT,
  instructions      TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.exercise_media_seed_links (
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions
)
VALUES
  ('Abdominal Crunches','Abdominal Crunches','/gym-machines/Abdominal Machine.jpg','/exercises/machines/abdominal.png',NULL,'Use controlled form for Abdominal Crunches. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Abductor Machine','Abductor Machine','/gym-machines/Abductor A.jpg','/exercises/machines/abdactor.png',NULL,'Use controlled form for Abductor Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Adductor Machine','Adductor Machine','/gym-machines/Adductor B.jpg','/exercises/machines/addactor.png',NULL,'Use controlled form for Adductor Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Hip Thrust','Barbell Hip Thrust','/gym-machines/Hip Thrust.jpg','/exercises/machines/hip thrust.png',NULL,'Use controlled form for Barbell Hip Thrust. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Overhead Extension','Barbell Overhead Extension',NULL,'/exercises/machines/Barbell Overhead.png',NULL,'Use controlled form for Barbell Overhead Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Skull Crusher','Barbell Skull Crusher',NULL,'/exercises/machines/Barbell Skull Crusher.png',NULL,'Use controlled form for Barbell Skull Crusher. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Banded Kickbacks','Banded Kickbacks',NULL,'/exercises/machines/Cable kicbacks.png',NULL,'Use controlled form for Banded Kickbacks. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Belt Squat - Glutes','Belt Squat - Glutes','/gym-machines/Rhino Squat-H.jpg','/exercises/machines/Belt squat _Glutes.png',NULL,'Use controlled form for Belt Squat - Glutes. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Belt Squat - Quadriceps','Belt Squat - Quadriceps','/gym-machines/Rhino Squat-H.jpg','/exercises/machines/Pendulum Squat _Quadriceps.png',NULL,'Use controlled form for Belt Squat - Quadriceps. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Biceps Curl','Cable Biceps Curl',NULL,'/exercises/machines/Cable biceps curl.png',NULL,'Use controlled form for Cable Biceps Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Face Pull','Cable Face Pull','/gym-machines/Functional Trainer.jpg',NULL,NULL,'Use controlled form for Cable Face Pull. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Hammer Curl','Cable Hammer Curl',NULL,'/exercises/machines/Cable Hummer curl.png',NULL,'Use controlled form for Cable Hammer Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Kickbacks','Cable Kickbacks',NULL,'/exercises/machines/Cable kicbacks.png',NULL,'Use controlled form for Cable Kickbacks. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Lower Chest Fly','Cable Lower Chest Fly',NULL,'/exercises/machines/Cable lower cheast fly.png',NULL,'Use controlled form for Cable Lower Chest Fly. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Lower Chest Fly or Dips Machine','Cable Lower Chest Fly or Dips Machine','/gym-machines/Dips Press Dual System.jpg','/exercises/machines/dual dips.png',NULL,'Use controlled form for Cable Lower Chest Fly or Dips Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Seated Row','Cable Seated Row','/gym-machines/Seated Row.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Cable Seated Row. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Calf Raises','Calf Raises','/gym-machines/Calf.jpg','/exercises/machines/calf raises.png',NULL,'Use controlled form for Calf Raises. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Fly Machine','Chest Fly Machine','/gym-machines/Super Middle Chest Flight.jpg','/exercises/machines/Fly incline chest.png',NULL,'Use controlled form for Chest Fly Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Press','Chest Press','/gym-machines/Chest Press.jpg','/exercises/machines/Vertical chest press machine.png',NULL,'Use controlled form for Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Press - Vertical Grip','Chest Press - Vertical Grip','/gym-machines/Vertical Press.jpg','/exercises/machines/Vertical chest press machine.png',NULL,'Use controlled form for Chest Press - Vertical Grip. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cobra Lower Back','Cobra Lower Back',NULL,'/exercises/machines/Cobra lower back.png',NULL,'Use controlled form for Cobra Lower Back. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dips','Dips','/gym-machines/Dips Press Dual System.jpg','/exercises/machines/dual dips.png',NULL,'Use controlled form for Dips. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Front Raise','Dumbbell Front Raise',NULL,'/exercises/machines/Barbell Front Raise.png',NULL,'Use controlled form for Dumbbell Front Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Incline Curl','Dumbbell Incline Curl',NULL,'/exercises/machines/Dumbbell Incline Curl.png',NULL,'Use controlled form for Dumbbell Incline Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Lateral Raise','Dumbbell Lateral Raise',NULL,'/exercises/machines/Dumbbell Lateral Raise.png',NULL,'Use controlled form for Dumbbell Lateral Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Overhead Extension','Dumbbell Overhead Extension',NULL,'/exercises/machines/Dumbbell Overhead Extension.png',NULL,'Use controlled form for Dumbbell Overhead Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Shoulder Press','Dumbbell Shoulder Press',NULL,'/exercises/machines/Dumbbell Shoulder Press.png',NULL,'Use controlled form for Dumbbell Shoulder Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Hammer Curl Machine','Hammer Curl Machine',NULL,'/exercises/machines/hummer curl machine.png',NULL,'Use controlled form for Hammer Curl Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Hip Thrust','Hip Thrust','/gym-machines/Hip Thrust.jpg','/exercises/machines/hip thrust.png',NULL,'Use controlled form for Hip Thrust. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Chest Fly','Incline Chest Fly',NULL,'/exercises/machines/Incline cheast press.png',NULL,'Use controlled form for Incline Chest Fly. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Chest Press','Incline Chest Press','/gym-machines/Incline Chest Press (Plate Loaded).jpg','/exercises/machines/Incline cheast press.png',NULL,'Use controlled form for Incline Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Row Machine','Incline Row Machine','/gym-machines/Incline Lever Row.jpg','/exercises/machines/Incline  Row Machine 2.png',NULL,'Use controlled form for Incline Row Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lat Pulldown','Lat Pulldown','/gym-machines/Pull Down.jpg','/exercises/machines/pull up.png',NULL,'Use controlled form for Lat Pulldown. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lat Pulldown Machine','Lat Pulldown Machine','/gym-machines/Iso-Lateral Lat Pulldown.jpg','/exercises/machines/pull up.png',NULL,'Use controlled form for Lat Pulldown Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lateral Raise','Lateral Raise','/gym-machines/Standing Lateral Raise.jpg','/exercises/machines/laterial raises.png',NULL,'Use controlled form for Lateral Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Curl','Leg Curl','/gym-machines/Prone Leg Curl.jpg','/exercises/machines/single leg curl.png',NULL,'Use controlled form for Leg Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Extension','Leg Extension','/gym-machines/Leg Extension.jpg','/exercises/machines/leg press.png',NULL,'Use controlled form for Leg Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Press - Quadriceps','Leg Press - Quadriceps','/gym-machines/Leg Press.jpg','/exercises/machines/leg press.png',NULL,'Use controlled form for Leg Press - Quadriceps. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Overhead Cable Extension','Overhead Cable Extension',NULL,'/exercises/machines/Overhead Cable Extension.png',NULL,'Use controlled form for Overhead Cable Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Preacher Curl','Preacher Curl','/gym-machines/Biceps.jpg','/exercises/machines/biceps triceps machine.png',NULL,'Use controlled form for Preacher Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Rear Delt Fly Machine','Rear Delt Fly Machine','/gym-machines/Super Middle Chest Flight.jpg','/exercises/machines/rear kickback.png',NULL,'Use controlled form for Rear Delt Fly Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Rear Kick Machine','Rear Kick Machine','/gym-machines/Rear Kick.jpg','/exercises/machines/rear kickback.png',NULL,'Use controlled form for Rear Kick Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Romanian Deadlift - RDL','Romanian Deadlift - RDL',NULL,'/exercises/machines/Romanian Deadlift - RDL.png',NULL,'Use controlled form for Romanian Deadlift - RDL. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Seated Row','Seated Row','/gym-machines/Seated Row.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Seated Row. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Seated Row - Wide Grip','Seated Row - Wide Grip','/gym-machines/Seated Row Machine.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Seated Row - Wide Grip. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Shoulder Press','Shoulder Press','/gym-machines/Shoulder Press.jpg','/exercises/machines/shoulder press.png',NULL,'Use controlled form for Shoulder Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Shoulder Press Machine','Shoulder Press Machine','/gym-machines/Shoulder Press.jpg','/exercises/machines/shoulder press machine.png',NULL,'Use controlled form for Shoulder Press Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Split Chest Press','Split Chest Press','/gym-machines/Split Push Chest Trainer.jpg','/exercises/machines/Split cheast press.png',NULL,'Use controlled form for Split Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('T-Bar Row - Upper Back','T-Bar Row - Upper Back','/gym-machines/Incline Lever Row.jpg','/exercises/machines/Incline  Row Machine 2.png',NULL,'Use controlled form for T-Bar Row - Upper Back. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Triceps Cable Pushdown','Triceps Cable Pushdown',NULL,'/exercises/machines/Triceps cable push down.png',NULL,'Use controlled form for Triceps Cable Pushdown. Keep the target muscle engaged and ask your coach if anything feels painful.')
ON CONFLICT (exercise_name) DO UPDATE SET
  machine_name = EXCLUDED.machine_name,
  machine_image_url = EXCLUDED.machine_image_url,
  demo_image_url = EXCLUDED.demo_image_url,
  demo_video_url = EXCLUDED.demo_video_url,
  instructions = EXCLUDED.instructions,
  updated_at = now();

INSERT INTO public.exercise_media (
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions,
  updated_at
)
SELECT
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions,
  now()
FROM public.exercise_media_seed_links
ON CONFLICT (exercise_name) DO UPDATE SET
  machine_name = EXCLUDED.machine_name,
  machine_image_url = EXCLUDED.machine_image_url,
  demo_image_url = EXCLUDED.demo_image_url,
  demo_video_url = EXCLUDED.demo_video_url,
  instructions = EXCLUDED.instructions,
  updated_at = now();

UPDATE public.workout_template_exercises wte
SET
  exercise_media_id = em.id,
  instructions = COALESCE(wte.instructions, em.instructions),
  updated_at = now()
FROM public.exercise_media em
WHERE lower(trim(wte.name)) = lower(trim(em.exercise_name));


-- ═══════════════════════════════════════════════════════════════
-- 021_coach_workout_library_crud.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 021: coach workout-library CRUD hardening
-- Depends on 018, 019, and 020.

UPDATE public.workout_template_days
SET day_type = CASE
  WHEN day_type IN ('rest', 'rest_day') THEN 'rest'
  WHEN day_type IN ('flexible', 'flexible_day') THEN 'flexible'
  ELSE 'training'
END;

ALTER TABLE public.workout_template_days
  DROP CONSTRAINT IF EXISTS workout_template_days_day_type_check;

ALTER TABLE public.workout_template_days
  ADD CONSTRAINT workout_template_days_day_type_check
  CHECK (day_type IN ('training', 'rest', 'flexible'));

COMMENT ON COLUMN public.workout_program_templates.description
  IS 'Coach-editable notes for seeded and custom workout programs.';

COMMENT ON COLUMN public.workout_program_templates.is_active
  IS 'Controls assignment availability. Coach/manager/admin can still see inactive templates in the library UI.';

DROP POLICY IF EXISTS workout_program_templates_select ON public.workout_program_templates;
CREATE POLICY workout_program_templates_select ON public.workout_program_templates
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.member_workout_programs mwp
      JOIN public.members m ON m.id = mwp.member_id
      WHERE mwp.template_id = workout_program_templates.id
        AND mwp.status = 'active'
        AND m.auth_id = auth.uid()
    )
  )
);


-- ═══════════════════════════════════════════════════════════════
-- 025_member_app_profiles_and_coach_eligibility.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 025: app profile table + coach eligibility source

CREATE TABLE IF NOT EXISTS public.member_app_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id        UUID NOT NULL UNIQUE,
  linked_member_id   UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  phone              TEXT,
  phone_normalized   TEXT,
  name_normalized    TEXT,
  date_of_birth      DATE,
  gender             TEXT,
  height_cm          INTEGER,
  weight_kg          NUMERIC(5,1),
  fitness_goal       TEXT,
  training_level     TEXT,
  weight_goal        TEXT,
  fitness_outcome    TEXT,
  illnesses          TEXT[] NOT NULL DEFAULT '{}',
  injuries           TEXT[] NOT NULL DEFAULT '{}',
  medical_notes      TEXT,
  limitations        TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill columns for projects where an earlier custom migration created
-- member_app_profiles without phone_normalized / name_normalized /
-- created_at / updated_at. CREATE TABLE IF NOT EXISTS above no-ops on an
-- existing table; these ALTERs make sure the shape matches.
ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;
ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS name_normalized  TEXT;
ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS member_app_profiles_linked_member_idx
  ON public.member_app_profiles(linked_member_id);

CREATE INDEX IF NOT EXISTS member_app_profiles_identity_idx
  ON public.member_app_profiles(phone_normalized, name_normalized)
  WHERE phone_normalized IS NOT NULL AND name_normalized IS NOT NULL;

DROP TRIGGER IF EXISTS trg_member_app_profiles_updated_at ON public.member_app_profiles;
CREATE TRIGGER trg_member_app_profiles_updated_at
  BEFORE UPDATE ON public.member_app_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_member_app_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  NEW.name_normalized := public.normalize_member_name(NEW.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_app_profiles_identity ON public.member_app_profiles;
CREATE TRIGGER trg_member_app_profiles_identity
BEFORE INSERT OR UPDATE OF phone, full_name ON public.member_app_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_member_app_profile_identity();

ALTER TABLE public.member_app_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_app_profiles_select ON public.member_app_profiles;
CREATE POLICY member_app_profiles_select ON public.member_app_profiles
FOR SELECT TO authenticated
USING (
  app_user_id = auth.uid()
  OR public.current_user_role() IN ('manager','admin','head_coach','coach')
);

DROP POLICY IF EXISTS member_app_profiles_insert_own ON public.member_app_profiles;
CREATE POLICY member_app_profiles_insert_own ON public.member_app_profiles
FOR INSERT TO authenticated
WITH CHECK (app_user_id = auth.uid());

DROP POLICY IF EXISTS member_app_profiles_update_own ON public.member_app_profiles;
CREATE POLICY member_app_profiles_update_own ON public.member_app_profiles
FOR UPDATE TO authenticated
USING (app_user_id = auth.uid())
WITH CHECK (app_user_id = auth.uid());

INSERT INTO public.member_app_profiles (
  app_user_id,
  linked_member_id,
  full_name,
  phone,
  date_of_birth,
  gender,
  height_cm,
  weight_kg,
  fitness_goal,
  training_level,
  weight_goal,
  fitness_outcome,
  illnesses,
  injuries,
  onboarding_complete
)
SELECT
  m.auth_id,
  m.id,
  m.full_name,
  m.phone,
  m.date_of_birth,
  m.gender,
  m.height_cm,
  m.weight_kg,
  m.fitness_goal,
  m.training_level,
  m.weight_goal,
  m.fitness_outcome,
  COALESCE(m.illnesses, '{}'),
  COALESCE(m.injuries, '{}'),
  COALESCE(m.onboarding_complete, FALSE)
FROM public.members m
WHERE m.auth_id IS NOT NULL
  AND m.role = 'player'
  AND COALESCE(m.onboarding_complete, FALSE) = TRUE
ON CONFLICT (app_user_id) DO UPDATE SET
  linked_member_id = EXCLUDED.linked_member_id,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  date_of_birth = COALESCE(public.member_app_profiles.date_of_birth, EXCLUDED.date_of_birth),
  gender = COALESCE(public.member_app_profiles.gender, EXCLUDED.gender),
  height_cm = COALESCE(public.member_app_profiles.height_cm, EXCLUDED.height_cm),
  weight_kg = COALESCE(public.member_app_profiles.weight_kg, EXCLUDED.weight_kg),
  fitness_goal = COALESCE(public.member_app_profiles.fitness_goal, EXCLUDED.fitness_goal),
  training_level = COALESCE(public.member_app_profiles.training_level, EXCLUDED.training_level),
  weight_goal = COALESCE(public.member_app_profiles.weight_goal, EXCLUDED.weight_goal),
  fitness_outcome = COALESCE(public.member_app_profiles.fitness_outcome, EXCLUDED.fitness_outcome),
  illnesses = CASE WHEN cardinality(public.member_app_profiles.illnesses) > 0 THEN public.member_app_profiles.illnesses ELSE EXCLUDED.illnesses END,
  injuries = CASE WHEN cardinality(public.member_app_profiles.injuries) > 0 THEN public.member_app_profiles.injuries ELSE EXCLUDED.injuries END,
  onboarding_complete = public.member_app_profiles.onboarding_complete OR EXCLUDED.onboarding_complete,
  updated_at = now();

COMMENT ON TABLE public.member_app_profiles IS
  'Web App onboarding/profile data. Linked to dashboard members by app_user_id and linked_member_id; subscriptions remain in public.subscriptions.';


-- ═══════════════════════════════════════════════════════════════
-- 026_recover_legacy_app_profiles_and_audit_view.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 026: recover legacy app profiles + audit buckets

INSERT INTO public.member_app_profiles (
  app_user_id,
  linked_member_id,
  full_name,
  phone,
  date_of_birth,
  gender,
  height_cm,
  weight_kg,
  fitness_goal,
  training_level,
  weight_goal,
  fitness_outcome,
  illnesses,
  injuries,
  onboarding_complete
)
SELECT
  m.auth_id,
  m.id,
  m.full_name,
  m.phone,
  m.date_of_birth,
  m.gender,
  m.height_cm,
  m.weight_kg,
  m.fitness_goal,
  m.training_level,
  m.weight_goal,
  m.fitness_outcome,
  COALESCE(m.illnesses, '{}'),
  COALESCE(m.injuries, '{}'),
  COALESCE(m.onboarding_complete, FALSE)
FROM public.members m
WHERE m.auth_id IS NOT NULL
  AND m.role = 'player'
  AND (
    COALESCE(m.onboarding_complete, FALSE) = TRUE
    OR m.date_of_birth IS NOT NULL
    OR m.gender IS NOT NULL
    OR m.height_cm IS NOT NULL
    OR m.weight_kg IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.training_level, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.weight_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_outcome, '')), '') IS NOT NULL
    OR cardinality(COALESCE(m.illnesses, '{}')) > 0
    OR cardinality(COALESCE(m.injuries, '{}')) > 0
  )
ON CONFLICT (app_user_id) DO UPDATE SET
  linked_member_id = EXCLUDED.linked_member_id,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  date_of_birth = COALESCE(public.member_app_profiles.date_of_birth, EXCLUDED.date_of_birth),
  gender = COALESCE(public.member_app_profiles.gender, EXCLUDED.gender),
  height_cm = COALESCE(public.member_app_profiles.height_cm, EXCLUDED.height_cm),
  weight_kg = COALESCE(public.member_app_profiles.weight_kg, EXCLUDED.weight_kg),
  fitness_goal = COALESCE(public.member_app_profiles.fitness_goal, EXCLUDED.fitness_goal),
  training_level = COALESCE(public.member_app_profiles.training_level, EXCLUDED.training_level),
  weight_goal = COALESCE(public.member_app_profiles.weight_goal, EXCLUDED.weight_goal),
  fitness_outcome = COALESCE(public.member_app_profiles.fitness_outcome, EXCLUDED.fitness_outcome),
  illnesses = CASE
    WHEN cardinality(public.member_app_profiles.illnesses) > 0 THEN public.member_app_profiles.illnesses
    ELSE EXCLUDED.illnesses
  END,
  injuries = CASE
    WHEN cardinality(public.member_app_profiles.injuries) > 0 THEN public.member_app_profiles.injuries
    ELSE EXCLUDED.injuries
  END,
  onboarding_complete = public.member_app_profiles.onboarding_complete OR EXCLUDED.onboarding_complete,
  updated_at = now();

CREATE OR REPLACE VIEW public.coach_player_profile_audit AS
SELECT
  m.id AS member_id,
  p.id AS app_profile_id,
  m.full_name,
  m.phone,
  m.status AS member_status,
  (m.auth_id IS NOT NULL) AS has_auth_account,
  (p.id IS NOT NULL) AS has_app_profile,
  COALESCE(p.onboarding_complete, FALSE) AS app_onboarding_complete,
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.member_id = m.id
      AND s.status = 'active'
      AND s.end_date >= CURRENT_DATE
  ) AS has_active_subscription,
  (
    COALESCE(m.onboarding_complete, FALSE) = TRUE
    OR m.date_of_birth IS NOT NULL
    OR m.gender IS NOT NULL
    OR m.height_cm IS NOT NULL
    OR m.weight_kg IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.training_level, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.weight_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_outcome, '')), '') IS NOT NULL
    OR cardinality(COALESCE(m.illnesses, '{}')) > 0
    OR cardinality(COALESCE(m.injuries, '{}')) > 0
  ) AS has_legacy_profile_data,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.end_date >= CURRENT_DATE
    ) AND p.id IS NOT NULL THEN 'subscribed_dashboard_and_app'
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.end_date >= CURRENT_DATE
    ) THEN 'subscribed_dashboard_not_app'
    WHEN p.id IS NOT NULL THEN 'not_subscribed_in_dashboard_but_app'
    WHEN m.auth_id IS NOT NULL THEN 'auth_account_without_app_profile'
    ELSE 'dashboard_only_no_auth'
  END AS profile_bucket
FROM public.members m
LEFT JOIN public.member_app_profiles p
  ON p.linked_member_id = m.id
WHERE m.role = 'player';

COMMENT ON VIEW public.coach_player_profile_audit IS
  'Non-medical audit view for coach eligibility buckets and legacy app-profile recovery checks.';


-- ═══════════════════════════════════════════════════════════════
-- 027_mark_app_registered_profiles.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 027: explicit app registration marker
--
-- members.auth_id can be created by reception/dashboard, so it is not a
-- reliable "this person used the Web App" signal. This column marks the
-- moment the app created/touched the app profile.

ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS app_registered_at TIMESTAMPTZ;

UPDATE public.member_app_profiles
SET app_registered_at = COALESCE(app_registered_at, created_at, now())
WHERE app_registered_at IS NULL;

-- 027 inserts app_registered_at mid-column-list versus 026's view shape;
-- CREATE OR REPLACE VIEW won't accept that, so drop and recreate.
DROP VIEW IF EXISTS public.coach_player_profile_audit;
CREATE VIEW public.coach_player_profile_audit AS
SELECT
  m.id AS member_id,
  p.id AS app_profile_id,
  m.full_name,
  m.phone,
  m.status AS member_status,
  (m.auth_id IS NOT NULL) AS has_auth_account,
  (p.id IS NOT NULL) AS has_app_profile,
  p.app_registered_at,
  COALESCE(p.onboarding_complete, FALSE) AS app_onboarding_complete,
  EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.member_id = m.id
      AND s.status = 'active'
      AND s.end_date >= CURRENT_DATE
  ) AS has_active_subscription,
  (
    COALESCE(m.onboarding_complete, FALSE) = TRUE
    OR m.date_of_birth IS NOT NULL
    OR m.gender IS NOT NULL
    OR m.height_cm IS NOT NULL
    OR m.weight_kg IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.training_level, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.weight_goal, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(m.fitness_outcome, '')), '') IS NOT NULL
    OR cardinality(COALESCE(m.illnesses, '{}')) > 0
    OR cardinality(COALESCE(m.injuries, '{}')) > 0
  ) AS has_legacy_profile_data,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.end_date >= CURRENT_DATE
    ) AND p.id IS NOT NULL THEN 'subscribed_dashboard_and_app'
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.member_id = m.id
        AND s.status = 'active'
        AND s.end_date >= CURRENT_DATE
    ) THEN 'subscribed_dashboard_not_app'
    WHEN p.id IS NOT NULL THEN 'not_subscribed_in_dashboard_but_app'
    WHEN m.auth_id IS NOT NULL THEN 'auth_account_without_app_profile'
    ELSE 'dashboard_only_no_auth'
  END AS profile_bucket
FROM public.members m
LEFT JOIN public.member_app_profiles p
  ON p.linked_member_id = m.id
WHERE m.role = 'player';

CREATE OR REPLACE VIEW public.app_registered_players AS
SELECT
  p.id AS app_profile_id,
  p.app_user_id,
  p.linked_member_id AS member_id,
  p.full_name,
  p.phone,
  p.phone_normalized,
  p.height_cm,
  p.weight_kg,
  p.fitness_goal,
  p.training_level,
  p.onboarding_complete,
  p.app_registered_at,
  m.status AS member_status,
  s.plan_type,
  s.start_date,
  s.end_date,
  s.status AS subscription_status,
  GREATEST((s.end_date - CURRENT_DATE), 0) AS subscription_days_left
FROM public.member_app_profiles p
JOIN public.members m ON m.id = p.linked_member_id
LEFT JOIN LATERAL (
  SELECT plan_type, start_date, end_date, status
  FROM public.subscriptions s
  WHERE s.member_id = m.id
    AND s.status = 'active'
  ORDER BY s.end_date DESC
  LIMIT 1
) s ON TRUE;

COMMENT ON COLUMN public.member_app_profiles.app_registered_at IS
  'Set when the player actually enters/registers through the Web App; not inferred from dashboard-created auth_id.';

COMMENT ON VIEW public.app_registered_players IS
  'Non-medical list of players who have a Web App profile row, with current active subscription summary when available.';


-- ═══════════════════════════════════════════════════════════════
-- 028_phone_only_member_identity.sql
-- ═══════════════════════════════════════════════════════════════
-- OX GYM - Migration 028: phone-only member identity
--
-- Phone is the only identity key for linking Web App profiles to
-- dashboard member rows. Names are display/context only: duplicate names
-- are allowed and must not block linking.

COMMENT ON COLUMN public.members.phone_normalized IS
  'Canonical digits-only phone identity key. Used for app-to-dashboard member linking; duplicate player phones are not allowed.';

COMMENT ON COLUMN public.members.name_normalized IS
  'Canonical normalized display name. Kept only for search/context; it is not an identity key and must not be used for app auto-linking.';

DROP INDEX IF EXISTS public.members_player_identity_match_idx;

CREATE UNIQUE INDEX IF NOT EXISTS members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL;


COMMIT;
