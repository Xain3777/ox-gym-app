-- ═══════════════════════════════════════════════════════════════
-- Migration 008: Username login + admin-visible password field
-- Run in Supabase SQL Editor after migration 007.
-- ═══════════════════════════════════════════════════════════════

-- ── Username (unique login identifier, alternative to phone) ────
ALTER TABLE members ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_username ON members(username) WHERE username IS NOT NULL;

-- ── Temp password (plain-text copy for admin visibility) ─────────
-- NOTE: This is intentionally plain-text for admin management purposes.
ALTER TABLE members ADD COLUMN IF NOT EXISTS temp_password TEXT;
