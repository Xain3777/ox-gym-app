-- ═══════════════════════════════════════════════════════════════
-- OX GYM — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor (one time, on a fresh project).
-- Tables are created in order of dependency.
-- ═══════════════════════════════════════════════════════════════

-- ── ENUMS ─────────────────────────────────────────────────────

CREATE TYPE member_status   AS ENUM ('active', 'expiring', 'expired');
CREATE TYPE sub_status      AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE sub_plan_type   AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE fitness_level   AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE plan_type       AS ENUM ('workout', 'meal');
CREATE TYPE send_status     AS ENUM ('sent', 'failed');
CREATE TYPE reminder_type   AS ENUM ('7-day', '3-day', 'expired');
CREATE TYPE reminder_status AS ENUM ('sent', 'failed', 'skipped');
CREATE TYPE user_role        AS ENUM ('player', 'coach', 'reception', 'manager');
CREATE TYPE notification_type   AS ENUM ('announcement', 'reminder', 'promotion', 'alert');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'pending');

-- ── MEMBERS ───────────────────────────────────────────────────

CREATE TABLE members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE,                          -- links to Supabase auth.users.id
  role        user_role NOT NULL DEFAULT 'player',  -- player, coach, reception, manager
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  photo_url   TEXT,
  goals       TEXT,
  status      member_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_status  ON members(status);
CREATE INDEX idx_members_email   ON members(email);
CREATE INDEX idx_members_auth_id ON members(auth_id);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────

CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_type   sub_plan_type NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      sub_status NOT NULL DEFAULT 'active',
  price       NUMERIC(10, 2),
  notes       TEXT
);

CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_end_date  ON subscriptions(end_date);

-- ── WORKOUT PLANS ─────────────────────────────────────────────

CREATE TABLE workout_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  level           fitness_level NOT NULL,
  duration_weeks  INTEGER NOT NULL DEFAULT 4,
  content         JSONB NOT NULL DEFAULT '[]',
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_plans_level ON workout_plans(level);

-- ── MEAL PLANS ────────────────────────────────────────────────

CREATE TABLE meal_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  goal            TEXT NOT NULL,
  calories_daily  INTEGER,
  content         JSONB NOT NULL DEFAULT '[]',
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PLAN SENDS ────────────────────────────────────────────────

CREATE TABLE plan_sends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL,
  plan_type   plan_type NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by     TEXT NOT NULL,
  status      send_status NOT NULL DEFAULT 'sent'
);

CREATE INDEX idx_plan_sends_member_id ON plan_sends(member_id);
CREATE INDEX idx_plan_sends_sent_at   ON plan_sends(sent_at);

-- ── REMINDER LOGS ─────────────────────────────────────────────

CREATE TABLE reminder_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type        reminder_type NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      reminder_status NOT NULL DEFAULT 'sent',
  email_to    TEXT NOT NULL
);

CREATE INDEX idx_reminder_logs_member_id ON reminder_logs(member_id);
CREATE INDEX idx_reminder_logs_sent_at   ON reminder_logs(sent_at);

-- ── NOTIFICATIONS ────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE SET NULL,  -- NULL = sent to all
  type        notification_type NOT NULL DEFAULT 'announcement',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT 'all',   -- all, active, expiring, specific
  status      notification_status NOT NULL DEFAULT 'sent',
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT NOT NULL
);

CREATE INDEX idx_notifications_sent_at   ON notifications(sent_at);
CREATE INDEX idx_notifications_member_id ON notifications(member_id);

-- ── SEED DATA (sample members for development) ────────────────

INSERT INTO members (full_name, email, phone, goals, status) VALUES
  ('Ahmed Khalil',    'ahmed@example.com',   '+966501234567', 'Build muscle mass, improve strength', 'expiring'),
  ('Sara Rashid',     'sara@example.com',    '+966507654321', 'Weight loss, cardio endurance',       'active'),
  ('Mohammed Hassan', 'mo@example.com',      '+966509876543', 'Athletic performance, agility',       'expired'),
  ('Layla Al-Amin',   'layla@example.com',   NULL,            'Flexibility, core strength',          'active'),
  ('Omar Farouq',     'omar@example.com',    '+966502345678', 'Powerlifting, bulking',               'active');

-- Add subscriptions for seeded members
INSERT INTO subscriptions (member_id, plan_type, start_date, end_date, status, price)
SELECT
  id,
  'monthly',
  CURRENT_DATE - INTERVAL '23 days',
  CURRENT_DATE + INTERVAL '7 days',
  'active',
  250.00
FROM members WHERE email = 'ahmed@example.com';

INSERT INTO subscriptions (member_id, plan_type, start_date, end_date, status, price)
SELECT
  id,
  'annual',
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE + INTERVAL '305 days',
  'active',
  2200.00
FROM members WHERE email = 'sara@example.com';

INSERT INTO subscriptions (member_id, plan_type, start_date, end_date, status, price)
SELECT
  id,
  'quarterly',
  CURRENT_DATE - INTERVAL '95 days',
  CURRENT_DATE - INTERVAL '5 days',
  'expired',
  650.00
FROM members WHERE email = 'mo@example.com';

-- Sample workout plan
INSERT INTO workout_plans (name, category, level, duration_weeks, content, created_by)
VALUES (
  'PUSH POWER',
  'Chest · Shoulders · Triceps',
  'advanced',
  4,
  '[
    {
      "day": "Day 1 — Heavy Push",
      "exercises": [
        {"name": "Barbell Bench Press",        "sets": 4, "reps": "5",    "notes": "Progressive overload"},
        {"name": "Incline Dumbbell Press",      "sets": 3, "reps": "8-10"},
        {"name": "Overhead Press",              "sets": 4, "reps": "5"},
        {"name": "Lateral Raises",              "sets": 3, "reps": "12-15"},
        {"name": "Tricep Pushdowns",            "sets": 3, "reps": "12"}
      ]
    },
    {
      "day": "Day 2 — Volume Push",
      "exercises": [
        {"name": "Machine Chest Press",         "sets": 4, "reps": "10-12"},
        {"name": "Cable Flyes",                 "sets": 3, "reps": "12-15"},
        {"name": "Arnold Press",                "sets": 3, "reps": "10-12"},
        {"name": "Face Pulls",                  "sets": 3, "reps": "15"},
        {"name": "Overhead Tricep Extension",   "sets": 3, "reps": "10-12"}
      ]
    }
  ]',
  'Coach Tariq'
);
