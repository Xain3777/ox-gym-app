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
