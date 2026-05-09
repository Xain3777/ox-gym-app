-- ═══════════════════════════════════════════════════════════════
-- 015: member_app_profiles
--
-- Side-table that stores the player-supplied profile data captured at
-- signup + completed during the onboarding wizard. Kept separate from
-- `members` so the dashboard's source-of-truth member record stays
-- canonical even when players re-register or edit their profile in the
-- app.
--
-- One row per app_user_id (auth.users.id). Linked back to members via
-- linked_member_id. Writes happen exclusively from API routes that use
-- the service-role client (createServiceClient), so RLS is enabled but
-- intentionally has no permissive policies for `authenticated` — anon
-- and player JWTs cannot read or write directly.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.member_app_profiles (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id         UUID         NOT NULL UNIQUE,                            -- == auth.users.id
  linked_member_id    UUID         NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

  -- Display + contact (mirrored from members at signup)
  full_name           TEXT         NOT NULL,
  phone               TEXT,

  -- Onboarding wizard fields
  date_of_birth       DATE,
  gender              TEXT,
  height_cm           INTEGER,
  weight_kg           NUMERIC(5,1),
  fitness_goal        TEXT,
  training_level      TEXT,
  weight_goal         TEXT,
  fitness_outcome     TEXT,
  illnesses           TEXT[]       NOT NULL DEFAULT '{}',
  injuries            TEXT[]       NOT NULL DEFAULT '{}',
  medical_notes       TEXT,
  limitations         TEXT,

  onboarding_complete BOOLEAN      NOT NULL DEFAULT false,
  app_registered_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_member_app_profiles_member_id ON public.member_app_profiles(linked_member_id);

ALTER TABLE public.member_app_profiles ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies. Service role bypasses RLS; nothing else
-- needs direct access. Add a SELECT policy later if a portal page ever
-- queries this table client-side.
