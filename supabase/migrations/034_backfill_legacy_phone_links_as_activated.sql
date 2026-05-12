-- ═══════════════════════════════════════════════════════════════
-- 034: backfill legacy phone-linked accounts as activated
--
-- Accounts that linked to a dashboard subscription via the legacy
-- phone-match path (members.id ↔ gym_subscriptions.member_id) were
-- showing up as "has profile, no code" in the coach diagnostics even
-- though the coach page already lists them as eligible.
--
-- This migration makes the link explicit:
--   • Sets gym_subscriptions.activated_user_id + activated_at on the
--     canonical store, so any future code-first lookup recognises
--     them as already claimed.
--   • Flips member_app_profiles.active = TRUE and copies the
--     activation_code, so the flat marker the coach reads is right.
--
-- Idempotent — only touches rows that need updating. Applied live
-- after 033 lands. Verified live: 19 gym rows claimed, 18 profiles
-- activated (the 1 difference is two gym rows sharing one app
-- profile via phone duplicate).
-- ═══════════════════════════════════════════════════════════════

-- Step 1: claim the gym row.
UPDATE public.gym_subscriptions gs
SET activated_user_id = map.app_user_id,
    activated_at      = COALESCE(map.app_registered_at, NOW())
FROM public.member_app_profiles map
WHERE map.linked_member_id  = gs.member_id
  AND gs.cancelled_at       IS NULL
  AND gs.activated_user_id  IS NULL
  AND gs.activation_code    IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = map.app_user_id);

-- Step 2: flip active + copy the code on the profile side. When an
-- app user matches multiple subscriptions (renewals, accidental
-- duplicates), pick the row with the latest end_date.
UPDATE public.member_app_profiles map
SET active          = TRUE,
    activation_code = (
      SELECT gs.activation_code
      FROM public.gym_subscriptions gs
      WHERE gs.activated_user_id = map.app_user_id
        AND gs.cancelled_at      IS NULL
        AND gs.activation_code   IS NOT NULL
      ORDER BY gs.end_date DESC NULLS LAST, gs.created_at DESC
      LIMIT 1
    )
WHERE map.active = FALSE
  AND EXISTS (
    SELECT 1 FROM public.gym_subscriptions gs
    WHERE gs.activated_user_id = map.app_user_id
      AND gs.cancelled_at      IS NULL
      AND gs.activation_code   IS NOT NULL
  );
