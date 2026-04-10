-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 002: Row Level Security Policies
-- Run this in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ── MEMBERS ─────────────────────────────────────────────────────

-- Make sure RLS is enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own member record
CREATE POLICY "Users can read own member record"
  ON members FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow users to update their own record (profile edits)
CREATE POLICY "Users can update own member record"
  ON members FOR UPDATE
  USING (auth.uid() = auth_id);

-- Admins can read ALL member records
CREATE POLICY "Admins can read all members"
  ON members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- Admins can insert members (adding new members from admin panel)
CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- Admins can update any member
CREATE POLICY "Admins can update any member"
  ON members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- Admins can delete members
CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── SUBSCRIPTIONS ───────────────────────────────────────────────

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = subscriptions.member_id AND m.auth_id = auth.uid()
    )
  );

-- Admins full access to subscriptions
CREATE POLICY "Admins full access subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── WORKOUT PLANS ───────────────────────────────────────────────

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read workout plans
CREATE POLICY "Authenticated users can read workout plans"
  ON workout_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can create/update/delete workout plans
CREATE POLICY "Admins manage workout plans"
  ON workout_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── MEAL PLANS ──────────────────────────────────────────────────

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read meal plans
CREATE POLICY "Authenticated users can read meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage meal plans
CREATE POLICY "Admins manage meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── PLAN SENDS ──────────────────────────────────────────────────

ALTER TABLE plan_sends ENABLE ROW LEVEL SECURITY;

-- Users can read their own plan sends
CREATE POLICY "Users can read own plan sends"
  ON plan_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = plan_sends.member_id AND m.auth_id = auth.uid()
    )
  );

-- Admins full access to plan sends
CREATE POLICY "Admins full access plan sends"
  ON plan_sends FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── NOTIFICATIONS ───────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read notifications sent to them
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (
    member_id IS NULL  -- broadcast notifications
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = notifications.member_id AND m.auth_id = auth.uid()
    )
  );

-- Admins full access to notifications
CREATE POLICY "Admins full access notifications"
  ON notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );

-- ── REMINDER LOGS ───────────────────────────────────────────────

ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Admins full access to reminder logs
CREATE POLICY "Admins full access reminder logs"
  ON reminder_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'admin'
    )
  );
