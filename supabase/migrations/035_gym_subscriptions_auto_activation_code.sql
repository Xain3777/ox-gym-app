-- ═══════════════════════════════════════════════════════════════
-- 035: auto-generate activation_code on every gym_subscriptions insert
--
-- Migration 031 added activation_code + backfilled existing rows,
-- but new rows created through paths that didn't call the TS helper
-- (some reception flows, scripts, direct SQL) ended up with NULL
-- codes. This trigger guarantees every future insert gets one,
-- regardless of which path created the row.
--
-- Honours caller-supplied codes (so /api/members and scripts can
-- still issue specific codes when they want). Backfills any
-- historical NULL rows in the same migration so the column is
-- finally consistent.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.gym_subscriptions_set_activation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_code     TEXT;
  v_attempts INT := 0;
BEGIN
  IF NEW.activation_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.generate_activation_code();
    PERFORM 1 FROM public.gym_subscriptions WHERE activation_code = v_code;
    IF NOT FOUND THEN
      NEW.activation_code := v_code;
      RETURN NEW;
    END IF;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'gym_subscriptions_set_activation_code: could not generate unique code after 20 attempts';
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS gym_subscriptions_set_activation_code_trg ON public.gym_subscriptions;
CREATE TRIGGER gym_subscriptions_set_activation_code_trg
BEFORE INSERT ON public.gym_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.gym_subscriptions_set_activation_code();

-- Backfill any row that still has NULL activation_code (5 rows live
-- before this migration ran, all reception inserts that bypassed the
-- TS helper between migration 031 and this one).
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

COMMENT ON FUNCTION public.gym_subscriptions_set_activation_code() IS
  'BEFORE INSERT trigger function. Auto-fills activation_code with a unique 2-letter+6-digit code when the row is inserted without one. Honours caller-supplied codes.';
