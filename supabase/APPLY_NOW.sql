-- ═══════════════════════════════════════════════════════════════
-- OX GYM — APPLY NOW
--
-- One-shot bundle of migrations 014 + 015. Run this once in the
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run.
-- After it succeeds, run scripts/seed_coaches.mjs to actually create
-- the 11 coach accounts.
--
-- Idempotent — safe to run twice if anything hiccups.
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 014  coach seed fields + head_coach role                    │
-- └─────────────────────────────────────────────────────────────┘

-- 1. Extend user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'head_coach' BEFORE 'coach';

-- 2. Rename legacy temp_password → temporary_password (preserve data)
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

-- 3. Add missing columns
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS temporary_password   TEXT,
  ADD COLUMN IF NOT EXISTS password_hash        TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.members.password_hash IS
  'bcrypt hash mirror of the coach''s temporary password.';
COMMENT ON COLUMN public.members.temporary_password IS
  'Plaintext temporary password for manager/admin reference only.';
COMMENT ON COLUMN public.members.must_change_password IS
  'When true, force password change on next login.';

-- 4. RLS — treat head_coach the same as coach
DROP POLICY IF EXISTS members_select ON members;
CREATE POLICY members_select ON members FOR SELECT TO authenticated
  USING (auth.uid() = auth_id OR current_user_role() IN ('manager','head_coach','coach','reception'));

DROP POLICY IF EXISTS subs_select ON subscriptions;
CREATE POLICY subs_select ON subscriptions FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = subscriptions.member_id AND m.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS wp_write ON workout_plans;
CREATE POLICY wp_write ON workout_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

DROP POLICY IF EXISTS mp_write ON meal_plans;
CREATE POLICY mp_write ON meal_plans FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

DROP POLICY IF EXISTS ps_select ON plan_sends;
CREATE POLICY ps_select ON plan_sends FOR SELECT TO authenticated
  USING (
    current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = plan_sends.member_id AND m.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS ps_write ON plan_sends;
CREATE POLICY ps_write ON plan_sends FOR ALL TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'))
  WITH CHECK (current_user_role() IN ('manager','head_coach','coach'));

DROP POLICY IF EXISTS n_select ON notifications;
CREATE POLICY n_select ON notifications FOR SELECT TO authenticated
  USING (
    member_id IS NULL
    OR current_user_role() IN ('manager','head_coach','coach','reception')
    OR EXISTS (SELECT 1 FROM members m WHERE m.id = notifications.member_id AND m.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS wl_select_mgr ON workout_logs;
CREATE POLICY wl_select_mgr ON workout_logs FOR SELECT TO authenticated
  USING (current_user_role() IN ('manager','head_coach','coach'));

-- 5. Seed RPC (used by scripts/seed_coaches.mjs)
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


-- ┌─────────────────────────────────────────────────────────────┐
-- │ 015  phone_normalized + signup-link                          │
-- └─────────────────────────────────────────────────────────────┘

-- 1. Normalize helper
CREATE OR REPLACE FUNCTION public.normalize_phone(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_input IS NULL THEN RETURN NULL; END IF;
  v_digits := regexp_replace(p_input, '\D', '', 'g');
  IF v_digits = '' THEN RETURN NULL; END IF;
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

-- 2. Add column
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

-- 3. Backfill
UPDATE public.members
   SET phone_normalized = public.normalize_phone(phone)
 WHERE phone IS NOT NULL
   AND (phone_normalized IS NULL OR phone_normalized <> public.normalize_phone(phone));

-- 4. Trigger
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

-- 5. Unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS members_player_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- DONE. Now run from your terminal:
--   node --env-file=.env.local scripts/seed_coaches.mjs
-- ═══════════════════════════════════════════════════════════════
