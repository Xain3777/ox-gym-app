-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 005: Audit Logs + Security Hardening
-- Run in Supabase SQL Editor after migration 004.
-- ═══════════════════════════════════════════════════════════════

-- ── AUDIT LOGS ────────────────────────────────────────────────
-- Immutable record of who did what. Never delete rows.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        NOT NULL,           -- members.id of the user who acted
  action      TEXT        NOT NULL,           -- e.g. "member.create", "plan.send"
  target_id   UUID,                           -- ID of the affected resource (nullable)
  target_type TEXT,                           -- e.g. "member", "plan", "subscription"
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common lookup patterns
CREATE INDEX idx_audit_logs_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_id  ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ── RLS: audit_logs ───────────────────────────────────────────
-- Only managers can read. Nobody can update or delete.

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.auth_id = auth.uid()
        AND m.role = 'manager'
    )
  );

-- Inserts are only allowed via service role (API layer) — no client insert policy.

-- ── ENFORCE MIN PRICE ON SUBSCRIPTIONS ───────────────────────
-- Prevent $0 subscriptions from being inserted directly.

ALTER TABLE subscriptions
  ADD CONSTRAINT chk_subscription_price_positive
  CHECK (price IS NULL OR price >= 1);

-- ── STAFF ACCOUNTS: drop pin column if it exists ─────────────
-- PINs were previously stored in code (not DB), but guard against
-- any schema that may have added it.
-- (No-op if column doesn't exist — Postgres 9.6+ IF EXISTS for column drop)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'pin'
  ) THEN
    ALTER TABLE members DROP COLUMN pin;
  END IF;
END $$;

-- ── SESSION EXPIRY NOTE ───────────────────────────────────────
-- Supabase JWT expiry is configured in the Supabase Dashboard:
--   Authentication → Settings → JWT Expiry → set to 86400 (24h)
-- This cannot be set via SQL migration.

COMMENT ON TABLE audit_logs IS
  'Immutable audit trail. Rows must never be updated or deleted.';
