-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 013: Clean reset to canonical schema
--
-- This wipes the public schema and re-creates the final desired state
-- as if migrations 001–012 had been applied to a fresh project.
--
-- WARNING — this DROPs every table in `public`. Only run when you
-- have agreed that all current data is throwaway test data.
--
-- After running, run `seed_staff.sql` to bootstrap staff accounts.
-- ═══════════════════════════════════════════════════════════════

-- ── 0. WIPE public schema (auth.users is purged separately via Admin API) ──
-- Hosted Supabase doesn't grant table-owner rights on `auth` to the SQL
-- Editor session, so we can't `DELETE FROM auth.users` from here. The
-- companion seeder script (`scripts/seed_staff.mjs`) does that via the
-- Auth Admin API using the service-role key.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.current_user_role()       CASCADE;
DROP FUNCTION IF EXISTS public.enforce_role_immutable()  CASCADE;

DROP TYPE IF EXISTS member_status        CASCADE;
DROP TYPE IF EXISTS sub_status           CASCADE;
DROP TYPE IF EXISTS sub_plan_type        CASCADE;
DROP TYPE IF EXISTS fitness_level        CASCADE;
DROP TYPE IF EXISTS plan_type            CASCADE;
DROP TYPE IF EXISTS send_status          CASCADE;
DROP TYPE IF EXISTS reminder_type        CASCADE;
DROP TYPE IF EXISTS reminder_status      CASCADE;
DROP TYPE IF EXISTS user_role            CASCADE;
DROP TYPE IF EXISTS notification_type    CASCADE;
DROP TYPE IF EXISTS notification_status  CASCADE;

-- ── 1. EXTENSIONS ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2. ENUMS ──────────────────────────────────────────────────────
CREATE TYPE member_status        AS ENUM ('active', 'expiring', 'expired');
CREATE TYPE sub_status           AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE sub_plan_type        AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE fitness_level        AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE plan_type            AS ENUM ('workout', 'meal');
CREATE TYPE send_status          AS ENUM ('sent', 'failed');
CREATE TYPE reminder_type        AS ENUM ('7-day', '3-day', 'expired');
CREATE TYPE reminder_status      AS ENUM ('sent', 'failed', 'skipped');
CREATE TYPE user_role            AS ENUM ('player', 'coach', 'reception', 'manager');
CREATE TYPE notification_type    AS ENUM ('announcement', 'reminder', 'promotion', 'alert');
CREATE TYPE notification_status  AS ENUM ('sent', 'failed', 'pending');

-- ── 3. MEMBERS (final shape, post-migration 012) ──────────────────
CREATE TABLE members (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id              UUID         UNIQUE,
  role                 user_role    NOT NULL DEFAULT 'player',
  full_name            TEXT         NOT NULL,
  username             TEXT,                 -- nullable; unique CI index below
  phone                TEXT,
  photo_url            TEXT,
  goals                TEXT,
  status               member_status NOT NULL DEFAULT 'active',
  -- Profile / onboarding (migrations 004 + 007)
  date_of_birth        DATE,
  gender               TEXT,
  illnesses            TEXT[]       NOT NULL DEFAULT '{}',
  injuries             TEXT[]       NOT NULL DEFAULT '{}',
  training_level       TEXT,
  weight_goal          TEXT,
  fitness_outcome      TEXT,
  wants_meal_plan      BOOLEAN      NOT NULL DEFAULT false,
  takes_supplements    BOOLEAN      NOT NULL DEFAULT false,
  takes_preworkout     BOOLEAN      NOT NULL DEFAULT false,
  onboarding_complete  BOOLEAN      NOT NULL DEFAULT false,
  weight_kg            NUMERIC(5,1),
  height_cm            INTEGER,
  fitness_goal         TEXT,
  -- Plain-text password mirror (admin visibility, intentional per migration 008)
  temp_password        TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_status  ON members(status);
CREATE INDEX idx_members_auth_id ON members(auth_id);
CREATE UNIQUE INDEX idx_members_username_ci
  ON members (LOWER(username)) WHERE username IS NOT NULL;

-- ── 4. SUBSCRIPTIONS ──────────────────────────────────────────────
CREATE TABLE subscriptions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID          NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_type   sub_plan_type NOT NULL,
  start_date  DATE          NOT NULL,
  end_date    DATE          NOT NULL,
  status      sub_status    NOT NULL DEFAULT 'active',
  price       NUMERIC(10,2),
  notes       TEXT,
  CONSTRAINT chk_subscription_price_positive
    CHECK (price IS NULL OR price >= 1)
);

CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_end_date  ON subscriptions(end_date);

-- ── 5. WORKOUT PLANS ──────────────────────────────────────────────
CREATE TABLE workout_plans (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  category        TEXT          NOT NULL,
  level           fitness_level NOT NULL,
  duration_weeks  INTEGER       NOT NULL DEFAULT 4,
  content         JSONB         NOT NULL DEFAULT '[]',
  created_by      TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_workout_plans_level ON workout_plans(level);

-- ── 6. MEAL PLANS ─────────────────────────────────────────────────
CREATE TABLE meal_plans (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  goal            TEXT         NOT NULL,
  calories_daily  INTEGER,
  content         JSONB        NOT NULL DEFAULT '[]',
  created_by      TEXT         NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 7. PLAN SENDS ─────────────────────────────────────────────────
CREATE TABLE plan_sends (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id     UUID         NOT NULL,
  plan_type   plan_type    NOT NULL,
  sent_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sent_by     TEXT         NOT NULL,
  status      send_status  NOT NULL DEFAULT 'sent'
);
CREATE INDEX idx_plan_sends_member_id ON plan_sends(member_id);
CREATE INDEX idx_plan_sends_sent_at   ON plan_sends(sent_at);

-- ── 8. REMINDER LOGS ──────────────────────────────────────────────
CREATE TABLE reminder_logs (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID            NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type        reminder_type   NOT NULL,
  sent_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
  status      reminder_status NOT NULL DEFAULT 'sent',
  email_to    TEXT            NOT NULL
);
CREATE INDEX idx_reminder_logs_member_id ON reminder_logs(member_id);
CREATE INDEX idx_reminder_logs_sent_at   ON reminder_logs(sent_at);

-- ── 9. NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID                REFERENCES members(id) ON DELETE SET NULL,
  type        notification_type   NOT NULL DEFAULT 'announcement',
  title       TEXT                NOT NULL,
  message     TEXT                NOT NULL,
  audience    TEXT                NOT NULL DEFAULT 'all',
  status      notification_status NOT NULL DEFAULT 'sent',
  sent_at     TIMESTAMPTZ         NOT NULL DEFAULT now(),
  created_by  UUID                REFERENCES members(id) ON DELETE SET NULL
);
CREATE INDEX idx_notifications_sent_at   ON notifications(sent_at);
CREATE INDEX idx_notifications_member_id ON notifications(member_id);

-- ── 10. FEEDBACK / MEAL ORDERS / WORKOUT LOGS (migration 004) ─────
CREATE TABLE feedback (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ratings      JSONB        NOT NULL DEFAULT '{}',
  comments     JSONB        NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_member_id    ON feedback(member_id);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at);

CREATE TABLE meal_orders (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID          NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  item_id     TEXT          NOT NULL,                 -- migration 006 (was INTEGER)
  item_name   TEXT          NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  calories    INTEGER       NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'pending',
  ordered_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_orders_member_id  ON meal_orders(member_id);
CREATE INDEX idx_meal_orders_ordered_at ON meal_orders(ordered_at);
CREATE INDEX idx_meal_orders_status     ON meal_orders(status);

CREATE TABLE workout_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID         NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  workout_day      TEXT         NOT NULL,
  exercises_done   INTEGER      NOT NULL DEFAULT 0,
  total_exercises  INTEGER      NOT NULL DEFAULT 0,
  partial          BOOLEAN      NOT NULL DEFAULT false,
  logged_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_workout_logs_member_id ON workout_logs(member_id);
CREATE INDEX idx_workout_logs_logged_at ON workout_logs(logged_at);

-- ── 11. AUDIT LOGS (migration 005, 006) ──────────────────────────
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID         REFERENCES members(id) ON DELETE SET NULL,
  action      TEXT         NOT NULL,
  target_id   UUID,
  target_type TEXT,
  meta        JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_id  ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
COMMENT ON TABLE audit_logs IS
  'Immutable audit trail. Rows must never be updated or deleted.';

-- ── 12. ROLE LOOKUP RPC (migration 011) ──────────────────────────
-- SECURITY DEFINER → bypasses RLS so the caller can read their own role
-- without triggering recursive policies.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.members WHERE auth_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- ── 13. ROLE IMMUTABILITY TRIGGER (migration 010) ────────────────
CREATE OR REPLACE FUNCTION public.enforce_role_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'role can only be changed by the database/service role';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_members_role_immutable
BEFORE UPDATE OF role ON public.members
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_immutable();

-- ── 14. RLS POLICIES (final, recursion-free) ─────────────────────
-- All policies delegate role checks to public.current_user_role() so
-- they don't trigger the self-reference recursion bug fixed by 011/012.

ALTER TABLE members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sends     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- members
CREATE POLICY members_select ON members FOR SELECT TO authenticated
  USING (auth.uid() = auth_id OR current_user_role() IN ('manager','coach','reception'));
CREATE POLICY members_update ON members FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id OR current_user_role() IN ('manager','reception'));
CREATE POLICY members_insert ON members FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('manager','reception'));
CREATE POLICY members_delete ON members FOR DELETE TO authenticated
  USING (current_user_role() = 'manager');

-- subscriptions: own row OR staff
CREATE POLICY subs_select ON subscriptions FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = subscriptions.member_id AND m.auth_id = auth.uid())
  );
CREATE POLICY subs_write ON subscriptions FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','reception'))
  WITH CHECK (current_user_role() IN ('manager','reception'));

-- workout_plans: any auth user reads, manager/coach manages
CREATE POLICY wp_select ON workout_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY wp_write  ON workout_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','coach'))
  WITH CHECK (current_user_role() IN ('manager','coach'));

-- meal_plans: same
CREATE POLICY mp_select ON meal_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY mp_write  ON meal_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','coach'))
  WITH CHECK (current_user_role() IN ('manager','coach'));

-- plan_sends: own rows OR staff manages
CREATE POLICY ps_select ON plan_sends FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = plan_sends.member_id AND m.auth_id = auth.uid())
  );
CREATE POLICY ps_write ON plan_sends FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','coach'))
  WITH CHECK (current_user_role() IN ('manager','coach'));

-- reminder_logs: manager only
CREATE POLICY rl_select ON reminder_logs FOR SELECT TO authenticated
  USING (current_user_role() = 'manager');

-- notifications: broadcast or own + staff
CREATE POLICY n_select ON notifications FOR SELECT TO authenticated
  USING (
    member_id IS NULL
    OR current_user_role() IN ('manager','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = notifications.member_id AND m.auth_id = auth.uid())
  );
CREATE POLICY n_write ON notifications FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','reception'))
  WITH CHECK (current_user_role() IN ('manager','reception'));

-- feedback: own + manager read
CREATE POLICY fb_select_own  ON feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM members m WHERE m.id = feedback.member_id AND m.auth_id = auth.uid()));
CREATE POLICY fb_select_mgr  ON feedback FOR SELECT TO authenticated
  USING (current_user_role() = 'manager');
CREATE POLICY fb_insert_self ON feedback FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members m WHERE m.id = feedback.member_id AND m.auth_id = auth.uid()));

-- meal_orders: own + reception/manager read+write
CREATE POLICY mo_select_own ON meal_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM members m WHERE m.id = meal_orders.member_id AND m.auth_id = auth.uid()));
CREATE POLICY mo_select_staff ON meal_orders FOR SELECT TO authenticated
  USING (current_user_role() IN ('manager','reception'));
CREATE POLICY mo_insert_self ON meal_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members m WHERE m.id = meal_orders.member_id AND m.auth_id = auth.uid()));
CREATE POLICY mo_write_staff ON meal_orders FOR UPDATE TO authenticated
  USING (current_user_role() IN ('manager','reception'));

-- workout_logs: own only (insert + read), manager can read all
CREATE POLICY wl_select_own  ON workout_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM members m WHERE m.id = workout_logs.member_id AND m.auth_id = auth.uid()));
CREATE POLICY wl_select_mgr  ON workout_logs FOR SELECT TO authenticated
  USING (current_user_role() IN ('manager','coach'));
CREATE POLICY wl_insert_self ON workout_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members m WHERE m.id = workout_logs.member_id AND m.auth_id = auth.uid()));

-- audit_logs: manager read only; inserts go through service role
CREATE POLICY al_select_mgr ON audit_logs FOR SELECT TO authenticated
  USING (current_user_role() = 'manager');
