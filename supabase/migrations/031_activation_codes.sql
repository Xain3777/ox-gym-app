-- ═══════════════════════════════════════════════════════════════
-- 031: activation codes on gym_subscriptions
--
-- Adds the activation-code workflow that links a player's app
-- auth account to a reception-managed gym subscription.
--
-- Idempotent — safe to re-run.
-- Touches ONLY gym_subscriptions. Does not modify status, payment,
-- name, or phone columns. Does not regenerate existing codes.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.gym_subscriptions
  ADD COLUMN IF NOT EXISTS activation_code   TEXT,
  ADD COLUMN IF NOT EXISTS activated_user_id UUID NULL,
  ADD COLUMN IF NOT EXISTS activated_at      TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gym_subscriptions_activation_code_unique
  ON public.gym_subscriptions (activation_code)
  WHERE activation_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS gym_subscriptions_activated_user_idx
  ON public.gym_subscriptions (activated_user_id)
  WHERE activated_user_id IS NOT NULL;

-- ── Code generator: 2 uppercase letters + 6 digits (e.g. QK482917) ──
CREATE OR REPLACE FUNCTION public.generate_activation_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_letters CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  RETURN
       substr(v_letters, 1 + floor(random() * 26)::int, 1)
    || substr(v_letters, 1 + floor(random() * 26)::int, 1)
    || lpad(floor(random() * 1000000)::int::text, 6, '0');
END;
$$;

-- ── Backfill any row that still has activation_code IS NULL ──
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  v_attempts INT;
BEGIN
  FOR r IN
    SELECT id FROM public.gym_subscriptions WHERE activation_code IS NULL
  LOOP
    v_attempts := 0;
    LOOP
      v_attempts := v_attempts + 1;
      v_code := public.generate_activation_code();
      BEGIN
        UPDATE public.gym_subscriptions
          SET activation_code = v_code
          WHERE id = r.id AND activation_code IS NULL;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempts > 20 THEN
          RAISE EXCEPTION 'gym_subscriptions backfill: could not generate unique activation_code for row %', r.id;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

COMMENT ON COLUMN public.gym_subscriptions.activation_code IS
  '8-char code (2 uppercase letters + 6 digits) reception hands to the subscriber. Player enters it in the portal to link their auth account to this subscription. Globally unique.';
COMMENT ON COLUMN public.gym_subscriptions.activated_user_id IS
  'auth.users.id of the app user who claimed this subscription via the activation code. NULL means the code is still unclaimed.';
COMMENT ON COLUMN public.gym_subscriptions.activated_at IS
  'Timestamp when activated_user_id was set.';
