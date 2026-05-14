-- OX GYM - Migration 042: private training fields on gym_subscriptions
--
-- The reception dashboard's "تدريب خاص" flow creates one coach
-- subscription + one row per player. The player rows reference their
-- coach so the dashboard's existing "الكوتش" column can populate, and
-- the coach app can show a "تحت إشراف <coach>" badge beside each
-- private-training player.
--
-- Coach billing math (computed by reception form, stored in `amount`
-- on the coach's gym_subscriptions row):
--     amount = 18 + (10 * private_group_size)
-- Players: amount = 0 (covered by coach).
--
-- All three columns are nullable so existing rows + normal (non-
-- private) subscriptions stay valid.

ALTER TABLE public.gym_subscriptions
  ADD COLUMN IF NOT EXISTS private_coach_name  TEXT,
  ADD COLUMN IF NOT EXISTS private_coach_phone TEXT,
  ADD COLUMN IF NOT EXISTS private_group_size  INTEGER;

CREATE INDEX IF NOT EXISTS gym_subscriptions_private_coach_phone_idx
  ON public.gym_subscriptions(private_coach_phone)
  WHERE private_coach_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS gym_subscriptions_private_coach_name_idx
  ON public.gym_subscriptions(private_coach_name)
  WHERE private_coach_name IS NOT NULL;
