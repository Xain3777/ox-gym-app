-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 015: phone_normalized + signup-link wiring
--
-- Purpose: let the player self-signup flow link to a member that
-- reception/dashboard already created, instead of duplicating rows.
-- The match key is the phone number, normalized to its digits-only
-- canonical form (e.g. "+963 91 234 5678" → "963912345678") and
-- compared in a generated/triggered phone_normalized column.
--
-- Profile fields the spec calls out (height_cm, weight_kg, illnesses,
-- injuries, fitness_goal) already exist on members from migration 013;
-- this migration does NOT redefine them. It adds only:
--
--   1. members.phone_normalized TEXT      -- digits-only canonical form
--   2. backfill from existing members.phone
--   3. trigger so any future write of phone keeps phone_normalized in sync
--   4. unique partial index over (phone_normalized) WHERE role='player'
--      AND phone_normalized IS NOT NULL — prevents two player accounts
--      on the same number; staff can share a synthetic phone if needed.
--   5. helper function public.normalize_phone(text) used by the trigger
--      and reusable from any RPC / future seed.
--
-- Idempotent — re-running is safe.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. NORMALIZE HELPER ──────────────────────────────────────────
-- Mirrors src/lib/phone.ts normalizePhone():
--   strip every non-digit, then:
--     "09XXXXXXXX"   (10-digit local Syrian) → "963" + last 9 digits
--     "963XXXXXXXXX" (12-digit international) → unchanged
--     anything else → return digits as-is
CREATE OR REPLACE FUNCTION public.normalize_phone(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_input, '\D', '', 'g');

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  IF length(v_digits) = 10 AND left(v_digits, 2) = '09' THEN
    RETURN '963' || substring(v_digits FROM 2);
  END IF;

  IF length(v_digits) = 12 AND left(v_digits, 3) = '963' THEN
    RETURN v_digits;
  END IF;

  RETURN v_digits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;

-- ── 2. ADD COLUMN ────────────────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

COMMENT ON COLUMN public.members.phone_normalized IS
  'Canonical digits-only form of phone, kept in sync by trg_members_phone_normalized. Primary identity key for matching dashboard-created members against self-signups by phone.';

-- ── 3. BACKFILL ──────────────────────────────────────────────────
UPDATE public.members
   SET phone_normalized = public.normalize_phone(phone)
 WHERE phone IS NOT NULL
   AND (phone_normalized IS NULL OR phone_normalized <> public.normalize_phone(phone));

-- ── 4. TRIGGER — keep phone_normalized in sync on every write ────
-- This way every code path (route handlers, reception form, RPC seeds)
-- writes the canonical value automatically — no app-side discipline
-- needed to prevent drift.
CREATE OR REPLACE FUNCTION public.sync_member_phone_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_phone_normalized ON public.members;
CREATE TRIGGER trg_members_phone_normalized
BEFORE INSERT OR UPDATE OF phone ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_member_phone_normalized();

-- ── 5. UNIQUE PARTIAL INDEX ──────────────────────────────────────
-- Players cannot collide on the same phone. Staff (manager / coach /
-- head_coach / reception) are excluded — they're seeded with synthetic
-- 0922000xx phones today, and we don't want to break that flow.
CREATE UNIQUE INDEX IF NOT EXISTS members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL;
