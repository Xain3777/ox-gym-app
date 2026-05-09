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
