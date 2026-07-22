-- 047_wipe_all_exercise_pictures_again.sql
--
-- Second full picture reset, per explicit request — identical wipe to
-- migration 046, run again now that a few pictures have been linked
-- since then (while testing the now-removed "must have a machine
-- picture to send" requirement). The send requirement is gone; the
-- coach can send a plan with or without pictures. This just clears
-- the slate again so every exercise starts blank and the coach picks
-- pictures at their own pace from the new picker.
--
-- Same three places carry picture data — see 046 for the full
-- rationale on each:
--   1. public.exercises            — the library defaults
--   2. public.exercise_media       — live-joined by every structured
--                                    program assignment, past and present
--   3. public.workout_plans.content — legacy plans' inline JSONB snapshot
--
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent).

-- ── 1. Exercise library ──────────────────────────────────────────
UPDATE public.exercises
SET image_url = NULL, machine_image_url = NULL, demo_url = NULL
WHERE image_url IS NOT NULL OR machine_image_url IS NOT NULL OR demo_url IS NOT NULL;

-- ── 2. Shared exercise media (structured programs, live-joined) ───
UPDATE public.exercise_media
SET machine_image_url = NULL, demo_image_url = NULL
WHERE machine_image_url IS NOT NULL OR demo_image_url IS NOT NULL;

-- ── 3. Legacy plans — strip the inline JSONB snapshot ─────────────
CREATE OR REPLACE FUNCTION public.__strip_exercise_image_fields(ex jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned jsonb;
  media   jsonb;
BEGIN
  cleaned := ex - 'image_url' - 'machine_image_url' - 'demo_url';
  IF cleaned ? 'media' AND jsonb_typeof(cleaned->'media') = 'object' THEN
    media := (cleaned->'media') - 'machine_image_url' - 'demo_image_url';
    cleaned := jsonb_set(cleaned, '{media}', media);
  END IF;
  RETURN cleaned;
END;
$$;

DO $$
DECLARE
  r RECORD;
  new_content jsonb;
BEGIN
  FOR r IN SELECT id, content FROM public.workout_plans WHERE content IS NOT NULL LOOP
    SELECT jsonb_agg(
      CASE
        WHEN day ? 'exercises' AND jsonb_typeof(day->'exercises') = 'array' THEN
          jsonb_set(
            day, '{exercises}',
            (SELECT COALESCE(jsonb_agg(public.__strip_exercise_image_fields(ex)), '[]'::jsonb)
             FROM jsonb_array_elements(day->'exercises') AS ex)
          )
        ELSE day
      END
    )
    INTO new_content
    FROM jsonb_array_elements(r.content) AS day;

    UPDATE public.workout_plans
    SET content = COALESCE(new_content, '[]'::jsonb)
    WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.__strip_exercise_image_fields(jsonb);
