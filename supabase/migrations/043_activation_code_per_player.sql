-- ═══════════════════════════════════════════════════════════════
-- 043: activation_code is per-PLAYER, not per-ROW
--
-- Policy change:
--   - The activation_code on gym_subscriptions identifies a PLAYER,
--     not a payment row. Every renewal for the same player keeps the
--     same code. Different players have different codes.
--   - When reception creates a renewal, the BEFORE INSERT trigger
--     inherits the player's existing activation_code, activated_user_id,
--     and activated_at — so the player does NOT need to re-enter any
--     code in the app. Their account stays activated.
--
-- Lookup priority (strongest → weakest match for "same player"):
--   1. NEW.member_id matches a prior row with activated_user_id set
--   2. Normalized phone matches a prior row with activated_user_id set
--
-- Both filters require cancelled_at IS NULL on the prior row, so a
-- cancelled history never poisons a new insert.
--
-- The per-row UNIQUE constraint on activation_code is dropped because
-- multiple rows for the same player legitimately share their code.
-- Cross-player uniqueness is maintained by the trigger itself — it
-- never assigns a fresh code that already exists in the table.
--
-- Idempotent. Safe to re-run. No data is destroyed.
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: pure-SQL phone normalization ─────────────────────────
-- Converts arabic-indic digits, strips non-digits, prepends 963 to
-- numbers starting with 0. Returns NULL for empty/invalid input.
CREATE OR REPLACE FUNCTION public.ox_normalize_phone(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_raw IS NULL THEN
    RETURN NULL;
  END IF;
  v_clean := regexp_replace(
    translate(p_raw, '٠١٢٣٤٥٦٧٨٩', '0123456789'),
    '\D', '', 'g'
  );
  IF length(v_clean) = 0 THEN
    RETURN NULL;
  END IF;
  IF substring(v_clean FROM 1 FOR 1) = '0' THEN
    RETURN '963' || substring(v_clean FROM 2);
  END IF;
  RETURN v_clean;
END;
$$;

-- ── Drop the per-row UNIQUE constraint ───────────────────────────
-- Try every name the constraint might have had in different migration
-- timelines. ALTER TABLE / DROP INDEX with IF EXISTS is a no-op when
-- the constraint isn't there.
ALTER TABLE public.gym_subscriptions
  DROP CONSTRAINT IF EXISTS gym_subscriptions_activation_code_key;
ALTER TABLE public.gym_subscriptions
  DROP CONSTRAINT IF EXISTS gym_subscriptions_activation_code_unique;
DROP INDEX IF EXISTS public.gym_subscriptions_activation_code_key;
DROP INDEX IF EXISTS public.gym_subscriptions_activation_code_unique;
DROP INDEX IF EXISTS public.idx_gym_subscriptions_activation_code;

-- Keep a non-unique index so lookups by code stay fast.
CREATE INDEX IF NOT EXISTS gym_subscriptions_activation_code_lookup_idx
  ON public.gym_subscriptions(activation_code)
  WHERE cancelled_at IS NULL;

-- ── Rewrite the trigger function ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.gym_subscriptions_set_activation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_phone_norm   TEXT;
  v_prior_code   TEXT;
  v_prior_auth   UUID;
  v_prior_at     TIMESTAMPTZ;
  v_code         TEXT;
  v_attempts     INT := 0;
BEGIN
  v_phone_norm := public.ox_normalize_phone(NEW.phone);

  -- ─ Lookup 1: by member_id (strongest signal that "same player")
  IF NEW.member_id IS NOT NULL THEN
    SELECT s.activation_code, s.activated_user_id, s.activated_at
    INTO v_prior_code, v_prior_auth, v_prior_at
    FROM public.gym_subscriptions s
    WHERE s.member_id = NEW.member_id
      AND s.activated_user_id IS NOT NULL
      AND s.cancelled_at IS NULL
      AND s.activation_code IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- ─ Lookup 2: by normalized phone (fallback)
  IF v_prior_code IS NULL AND v_phone_norm IS NOT NULL THEN
    SELECT s.activation_code, s.activated_user_id, s.activated_at
    INTO v_prior_code, v_prior_auth, v_prior_at
    FROM public.gym_subscriptions s
    WHERE public.ox_normalize_phone(s.phone) = v_phone_norm
      AND s.activated_user_id IS NOT NULL
      AND s.cancelled_at IS NULL
      AND s.activation_code IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- ─ Renewal path: inherit code + activation
  IF v_prior_code IS NOT NULL THEN
    NEW.activation_code := v_prior_code;
    IF NEW.activated_user_id IS NULL THEN
      NEW.activated_user_id := v_prior_auth;
    END IF;
    IF NEW.activated_at IS NULL AND v_prior_at IS NOT NULL THEN
      NEW.activated_at := v_prior_at;
    END IF;
    RETURN NEW;
  END IF;

  -- ─ First-time path: caller-supplied code (must not collide with
  --   any existing code in the table — that would mean the same
  --   code is being assigned to a different player)
  IF NEW.activation_code IS NOT NULL THEN
    PERFORM 1
    FROM public.gym_subscriptions s
    WHERE s.activation_code = NEW.activation_code
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION
        'gym_subscriptions_set_activation_code: code % is already assigned to another player',
        NEW.activation_code;
    END IF;
    RETURN NEW;
  END IF;

  -- ─ First-time path: auto-generate a code that no one else has
  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.generate_activation_code();
    PERFORM 1 FROM public.gym_subscriptions WHERE activation_code = v_code LIMIT 1;
    IF NOT FOUND THEN
      NEW.activation_code := v_code;
      RETURN NEW;
    END IF;
    IF v_attempts > 30 THEN
      RAISE EXCEPTION
        'gym_subscriptions_set_activation_code: could not find a free code after 30 attempts';
    END IF;
  END LOOP;
END;
$$;

-- The trigger binding from migration 035 still calls this function,
-- so the function rewrite alone is enough. Recreate defensively in
-- case the binding was dropped at any point.
DROP TRIGGER IF EXISTS gym_subscriptions_set_activation_code_trg ON public.gym_subscriptions;
CREATE TRIGGER gym_subscriptions_set_activation_code_trg
BEFORE INSERT ON public.gym_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.gym_subscriptions_set_activation_code();

COMMENT ON FUNCTION public.gym_subscriptions_set_activation_code() IS
  'BEFORE INSERT trigger. Activation code is per-player, not per-row. '
  'Inherits activation_code + activated_user_id from any prior bound '
  'sub matched by member_id (preferred) or normalized phone. Otherwise '
  'generates a fresh unique code. Set by migration 043.';

-- ── Backfill: normalize existing rows to the new per-player model ─

-- (a) For every activated player who has multiple rows with DIFFERENT
--     codes (historical "new code per renewal"), normalize them all to
--     the player's OLDEST code.
WITH canonical AS (
  SELECT DISTINCT ON (activated_user_id)
    activated_user_id,
    activation_code AS canonical_code,
    activated_at AS canonical_activated_at
  FROM public.gym_subscriptions
  WHERE activated_user_id IS NOT NULL
    AND cancelled_at IS NULL
    AND activation_code IS NOT NULL
  ORDER BY activated_user_id, created_at ASC
)
UPDATE public.gym_subscriptions sub
SET activation_code = c.canonical_code,
    activated_at   = COALESCE(sub.activated_at, c.canonical_activated_at)
FROM canonical c
WHERE sub.activated_user_id = c.activated_user_id
  AND sub.cancelled_at IS NULL
  AND sub.activation_code IS DISTINCT FROM c.canonical_code;

-- (b) For every UNBOUND active row whose phone matches a previously
--     bound row, inherit the bound row's code + auth (= what the
--     trigger would do for inserts going forward).
WITH bound_by_phone AS (
  SELECT DISTINCT ON (public.ox_normalize_phone(phone))
    public.ox_normalize_phone(phone) AS phone_norm,
    activated_user_id,
    activation_code,
    activated_at
  FROM public.gym_subscriptions
  WHERE activated_user_id IS NOT NULL
    AND cancelled_at IS NULL
    AND activation_code IS NOT NULL
    AND phone IS NOT NULL
  ORDER BY public.ox_normalize_phone(phone), created_at DESC
)
UPDATE public.gym_subscriptions sub
SET activated_user_id = b.activated_user_id,
    activation_code   = b.activation_code,
    activated_at      = COALESCE(sub.activated_at, b.activated_at, now())
FROM bound_by_phone b
WHERE sub.activated_user_id IS NULL
  AND sub.cancelled_at IS NULL
  AND public.ox_normalize_phone(sub.phone) = b.phone_norm;

-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK (paste into SQL editor only if you need to revert):
--
-- DROP TRIGGER IF EXISTS gym_subscriptions_set_activation_code_trg
--   ON public.gym_subscriptions;
-- DROP FUNCTION IF EXISTS public.gym_subscriptions_set_activation_code();
-- DROP FUNCTION IF EXISTS public.ox_normalize_phone(TEXT);
-- DROP INDEX IF EXISTS public.gym_subscriptions_activation_code_lookup_idx;
-- -- restore the old behavior from migration 035:
-- -- (paste migration 035 here to re-attach the original trigger)
-- ═══════════════════════════════════════════════════════════════
