-- OX GYM - Migration 017: member identity linking hardening
--
-- Keeps dashboard-created members and app signups matched by canonical
-- phone + name without exposing member/subscription rows to the app before
-- the match is confirmed.

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

  v_digits := regexp_replace(
    translate(p_input, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
    '\D',
    '',
    'g'
  );

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

CREATE OR REPLACE FUNCTION public.normalize_member_name(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_name := trim(translate(p_input, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'));
  v_name := regexp_replace(v_name, '[ًٌٍَُِّْٰـ]', '', 'g');
  v_name := translate(v_name, 'إأآٱىةؤئ', 'اااايهوي');
  v_name := regexp_replace(v_name, '\s+', ' ', 'g');
  v_name := lower(v_name);

  IF v_name = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_member_name(TEXT) TO anon, authenticated, service_role;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS name_normalized TEXT;

COMMENT ON COLUMN public.members.auth_id IS
  'Linked OX App auth.users.id. NULL means this dashboard member has not linked an app account yet.';

COMMENT ON COLUMN public.members.name_normalized IS
  'Canonical normalized member name for safe app-to-dashboard identity matching with phone_normalized.';

CREATE OR REPLACE FUNCTION public.sync_member_identity_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  NEW.name_normalized := public.normalize_member_name(NEW.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_phone_normalized ON public.members;
DROP TRIGGER IF EXISTS trg_members_identity_normalized ON public.members;
CREATE TRIGGER trg_members_identity_normalized
BEFORE INSERT OR UPDATE OF phone, full_name ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_member_identity_normalized();

UPDATE public.members
   SET phone_normalized = public.normalize_phone(phone),
       name_normalized = public.normalize_member_name(full_name)
 WHERE phone_normalized IS DISTINCT FROM public.normalize_phone(phone)
    OR name_normalized IS DISTINCT FROM public.normalize_member_name(full_name);

CREATE INDEX IF NOT EXISTS members_player_identity_match_idx
  ON public.members (phone_normalized, name_normalized)
  WHERE role = 'player' AND phone_normalized IS NOT NULL AND name_normalized IS NOT NULL;
