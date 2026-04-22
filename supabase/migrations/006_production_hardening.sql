-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 006: Production Hardening
-- Run in Supabase SQL Editor after migration 005.
-- ═══════════════════════════════════════════════════════════════

-- ── C3: Enable RLS on feedback table (was created without it) ──
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = feedback.member_id AND m.auth_id = auth.uid()
    )
  );

CREATE POLICY "Managers read all feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'manager'
    )
  );

-- ── H2: Fix plan_sends RLS (old policies checked role='admin') ──
DROP POLICY IF EXISTS "Admins full access plan sends"   ON plan_sends;
DROP POLICY IF EXISTS "Users can read own plan sends"   ON plan_sends;

CREATE POLICY "Members read own plan sends"
  ON plan_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = plan_sends.member_id AND m.auth_id = auth.uid()
    )
  );

CREATE POLICY "Managers and coaches manage plan sends"
  ON plan_sends FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role IN ('manager', 'coach')
    )
  );

-- ── H2: Fix reminder_logs RLS (old policy checked role='admin') ─
DROP POLICY IF EXISTS "Admins full access reminder logs" ON reminder_logs;

CREATE POLICY "Managers read reminder logs"
  ON reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid() AND m.role = 'manager'
    )
  );

-- ── H1: Fix meal_orders.item_id type (INTEGER → TEXT) ──────────
-- The API accepts string item IDs (e.g. "chicken_bowl"); DB had INTEGER.
ALTER TABLE meal_orders ALTER COLUMN item_id TYPE TEXT USING item_id::TEXT;

-- ── M1: Fix notifications.created_by (TEXT → UUID with FK) ──────
-- Cast existing values, add referential integrity.
ALTER TABLE notifications ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_created_by
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE notifications ALTER COLUMN created_by DROP NOT NULL;

-- ── M6: Add FK to audit_logs.actor_id ───────────────────────────
-- Allow NULL so system-generated entries (cron) don't require a member row.
ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_actor
  FOREIGN KEY (actor_id) REFERENCES members(id) ON DELETE SET NULL;

-- ── Index: speed up daily cron query ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

COMMENT ON TABLE feedback IS
  'Member satisfaction ratings. RLS enforced — members see own, managers see all.';
