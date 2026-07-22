-- 046_wipe_all_exercise_pictures.sql
--
-- Full picture reset, per explicit request: every exercise/machine
-- picture — right or wrong, matched or not — is removed everywhere,
-- INCLUDING plans already sent to players. From now on a coach must
-- pick a picture by hand (via the media picker) for each exercise on
-- each plan; nothing is auto-attached (see workout-programs.ts, which
-- this migration's sibling code change stops from re-seeding images).
--
-- Three places carry picture data:
--   1. public.exercises            — the library defaults
--   2. public.exercise_media       — LIVE-JOINED by every structured
--                                    program (workout_template_exercises
--                                    .exercise_media_id). Clearing this
--                                    table instantly clears pictures on
--                                    every past AND present assignment
--                                    of a structured plan — no separate
--                                    per-assignment copy exists.
--   3. public.workout_plans.content — legacy plans store a SNAPSHOT of
--                                    each exercise's picture inline in
--                                    JSONB at creation time, so clearing
--                                    (1)/(2) does NOT reach these. Every
--                                    day's exercise list is rewritten
--                                    below to drop the picture keys.
--
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent — a
-- second run just finds nothing left to strip).

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
