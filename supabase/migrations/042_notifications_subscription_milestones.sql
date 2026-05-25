-- OX GYM - Migration 042: subscription milestone notifications
--
-- Adds a milestone_key column to the existing notifications table so the
-- daily cron can insert idempotent rows for subscription reminders (T-2,
-- T-1, T-0, T+1, T+2). Re-running the cron the same day cannot create
-- a duplicate row for the same milestone.
--
-- The notification_type enum already has a 'reminder' value (migration
-- 001), which is what these inserts will use. No enum change needed.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS milestone_key TEXT;

-- Idempotency: one row per (member, milestone). Partial index only
-- applies where milestone_key is set, so existing announcement/alert
-- rows that don't use it stay untouched.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_milestone_unique_idx
  ON public.notifications(member_id, milestone_key)
  WHERE milestone_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_member_sent_idx
  ON public.notifications(member_id, sent_at DESC);
