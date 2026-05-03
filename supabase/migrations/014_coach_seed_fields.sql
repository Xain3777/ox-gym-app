-- ═══════════════════════════════════════════════════════════════
-- OX GYM — Migration 014: Coach seed fields + head_coach role
--
-- 1. Adds the columns the coach seed needs:
--      members.password_hash         — bcrypt hash mirror (auth lives in auth.users)
--      members.temporary_password    — visible plaintext for manager/admin reference
--      members.must_change_password  — flag for first-login prompts
--    `temporary_password` replaces the older `temp_password` column.
--    Existing data is migrated by copying then dropping the old column.
--
-- 2. Adds 'head_coach' to the user_role enum and updates every RLS
--    policy that grants 'coach' read/write to also grant 'head_coach'
--    the same permissions.
--
-- Idempotent — re-running this migration is safe.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. EXTEND user_role ENUM ──────────────────────────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head_coach' BEFORE 'coach';

-- ── 2. RENAME temp_password → temporary_password (preserve data) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'members'
      AND column_name = 'temp_password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'members'
      AND column_name = 'temporary_password'
  ) THEN
    ALTER TABLE public.members RENAME COLUMN temp_password TO temporary_password;
  END IF;
END $$;

-- ── 3. ADD MISSING COLUMNS ────────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS temporary_password   TEXT,
  ADD COLUMN IF NOT EXISTS password_hash        TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.members.password_hash IS
  'bcrypt hash mirror of the coach''s temporary password. The actual auth verification happens against auth.users.encrypted_password — this column exists so admin tooling and audits can confirm the hash is bcrypt without touching auth.users.';

COMMENT ON COLUMN public.members.temporary_password IS
  'Plaintext temporary password for manager/admin reference only. Not used for authentication. RLS must keep this column hidden from non-staff roles. Set must_change_password = true when populated so the user is prompted to rotate on first login.';

COMMENT ON COLUMN public.members.must_change_password IS
  'When true, the user should be forced to change their password on next login. Set during seeding/admin password reset; cleared once the user picks their own password.';

-- ── 4. RLS — treat head_coach the same as coach ───────────────────
-- Policies below are dropped + recreated with the head_coach role
-- added to every list that previously named 'coach'. Other access
-- rules are unchanged.

-- members
DROP POLICY IF EXISTS members_select ON members;
CREATE POLICY members_select ON members FOR SELECT TO authenticated
  USING (auth.uid() = auth_id OR current_user_role() IN ('manager','head_coach','coach','reception'));

-- subscriptions read
DROP POLICY IF EXISTS subs_select ON subscriptions;
CREATE POLICY subs_select ON subscriptions FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = subscriptions.member_id AND m.auth_id = auth.uid())
  );

-- workout_plans write
DROP POLICY IF EXISTS wp_write ON workout_plans;
CREATE POLICY wp_write ON workout_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

-- meal_plans write
DROP POLICY IF EXISTS mp_write ON meal_plans;
CREATE POLICY mp_write ON meal_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

-- plan_sends read
DROP POLICY IF EXISTS ps_select ON plan_sends;
CREATE POLICY ps_select ON plan_sends FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = plan_sends.member_id AND m.auth_id = auth.uid())
  );

-- plan_sends write
DROP POLICY IF EXISTS ps_write ON plan_sends;
CREATE POLICY ps_write ON plan_sends FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

-- notifications read
DROP POLICY IF EXISTS n_select ON notifications;
CREATE POLICY n_select ON notifications FOR SELECT TO authenticated
  USING (
    member_id IS NULL
    OR current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = notifications.member_id AND m.auth_id = auth.uid())
  );

-- workout_logs (manager+coach read of all)
DROP POLICY IF EXISTS wl_select_mgr ON workout_logs;
CREATE POLICY wl_select_mgr ON workout_logs FOR SELECT TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'));

-- ── 5. SEED HELPER RPC ────────────────────────────────────────────
-- Used by scripts/seed_coaches.mjs to upsert a coach row idempotently.
-- The plaintext password is bcrypt-hashed via pgcrypto's crypt() and
-- mirrored into password_hash. auth.users password is managed by the
-- companion script via the Auth Admin API (which also bcrypts).
--
-- SECURITY DEFINER + restricted GRANT: only the service_role can call
-- this. Coaches and managers cannot invoke it from the client.
CREATE OR REPLACE FUNCTION public.seed_coach_account(
  p_auth_id              UUID,
  p_username             TEXT,
  p_full_name            TEXT,
  p_role                 TEXT,
  p_phone                TEXT,
  p_temporary_password   TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_hash      TEXT := crypt(p_temporary_password, gen_salt('bf'));
BEGIN
  -- Idempotent upsert keyed on case-insensitive username.
  SELECT id INTO v_member_id
    FROM public.members
   WHERE LOWER(username) = LOWER(p_username)
   LIMIT 1;

  IF v_member_id IS NULL THEN
    INSERT INTO public.members (
      auth_id, username, full_name, role, phone, status,
      temporary_password, password_hash, must_change_password
    )
    VALUES (
      p_auth_id, p_username, p_full_name, p_role::user_role, p_phone, 'active'::member_status,
      p_temporary_password, v_hash, TRUE
    )
    RETURNING id INTO v_member_id;
  ELSE
    UPDATE public.members SET
      auth_id              = COALESCE(p_auth_id, auth_id),
      full_name            = p_full_name,
      role                 = p_role::user_role,
      phone                = COALESCE(phone, p_phone),
      temporary_password   = p_temporary_password,
      password_hash        = v_hash,
      must_change_password = TRUE
    WHERE id = v_member_id;
  END IF;

  RETURN v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_coach_account(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_coach_account(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
