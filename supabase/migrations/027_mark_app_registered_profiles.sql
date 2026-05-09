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
