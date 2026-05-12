-- ═══════════════════════════════════════════════════════════════
-- 032: member_app_profiles.active + activation_code
--
-- Flatten the activation marker onto member_app_profiles so coach
-- queries and dashboards don't need a JOIN to know "is this person
-- sendable + what code did they use".
--
-- gym_subscriptions remains the source of truth for the code (UNIQUE
-- partial index) and the race-safe claim via activated_user_id.
-- These columns are a convenience mirror written at activation time.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.member_app_profiles
  ADD COLUMN IF NOT EXISTS active          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activation_code TEXT;

CREATE INDEX IF NOT EXISTS member_app_profiles_active_idx
  ON public.member_app_profiles (active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS member_app_profiles_activation_code_idx
  ON public.member_app_profiles (activation_code) WHERE activation_code IS NOT NULL;

-- One-time backfill: any profile whose app_user_id already shows up in
-- gym_subscriptions.activated_user_id gets marked active and inherits
-- that row's code.
UPDATE public.member_app_profiles map
SET active = TRUE,
    activation_code = gs.activation_code
FROM public.gym_subscriptions gs
WHERE gs.activated_user_id = map.app_user_id
  AND gs.activation_code   IS NOT NULL
  AND (map.active = FALSE OR map.activation_code IS NULL);

COMMENT ON COLUMN public.member_app_profiles.active IS
  'True when the user has claimed an activation code. Mirror of gym_subscriptions.activated_user_id existence — set at claim time, NULL/false otherwise.';
COMMENT ON COLUMN public.member_app_profiles.activation_code IS
  'Convenience mirror of the gym_subscriptions.activation_code the user claimed. gym_subscriptions remains the canonical store.';
