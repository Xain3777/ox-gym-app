-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Remove email as required field, add body metrics + fitness goal
-- Run in Supabase SQL Editor after migration 006.
-- ═══════════════════════════════════════════════════════════════

-- ── Drop UNIQUE + NOT NULL from email ───────────────────────────
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;
DROP INDEX IF EXISTS idx_members_email;

-- ── Make phone required for new auth-based members ──────────────
-- (enforced at app layer; DB allows NULL for legacy pre-auth records)

-- ── Body metrics ────────────────────────────────────────────────
ALTER TABLE members ADD COLUMN IF NOT EXISTS weight_kg  NUMERIC(5,1);
ALTER TABLE members ADD COLUMN IF NOT EXISTS height_cm  INTEGER;

-- ── Fitness goal (replaces scattered weight_goal field) ─────────
ALTER TABLE members ADD COLUMN IF NOT EXISTS fitness_goal TEXT;
