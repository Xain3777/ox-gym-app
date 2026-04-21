-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Feedback, meal_orders, workout_logs + profile columns
-- Run in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ── MEMBER PROFILE COLUMNS (safe to add if missing) ────────────
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth   DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS illnesses       TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE members ADD COLUMN IF NOT EXISTS injuries        TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE members ADD COLUMN IF NOT EXISTS training_level  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS weight_goal     TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS fitness_outcome TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS wants_meal_plan BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS takes_supplements   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS takes_preworkout    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- ── FEEDBACK ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ratings      JSONB       NOT NULL DEFAULT '{}',
  comments     JSONB       NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_member_id    ON feedback(member_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at ON feedback(submitted_at);

-- ── MEAL ORDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_orders (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  item_id     INTEGER      NOT NULL,
  item_name   TEXT         NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  calories    INTEGER      NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'pending',
  ordered_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_orders_member_id  ON meal_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_meal_orders_ordered_at ON meal_orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_meal_orders_status     ON meal_orders(status);

-- ── WORKOUT LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  workout_day      TEXT        NOT NULL,
  exercises_done   INTEGER     NOT NULL DEFAULT 0,
  total_exercises  INTEGER     NOT NULL DEFAULT 0,
  partial          BOOLEAN     NOT NULL DEFAULT false,
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_member_id ON workout_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_logged_at ON workout_logs(logged_at);
