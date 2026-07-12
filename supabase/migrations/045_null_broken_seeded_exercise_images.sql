-- 045_null_broken_seeded_exercise_images.sql
--
-- Migration 016 seeded the exercises library with slug-derived image
-- URLs that never matched real files on disk:
--   /exercises/ox-comic/{slug}-ox-comic.png   (folder is empty)
--   /exercises/machines/{slug}-machine.png    (real files are named
--                                              like "abdominal.png")
--   /exercises/demos/{slug}-demo.png          (folder is empty)
--
-- Every URL matching those patterns is therefore broken and renders as
-- a placeholder icon. Null them out so the library is honest — coaches
-- attach real pictures via the media picker from now on.
--
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent).

UPDATE public.exercises
SET image_url = NULL
WHERE image_url LIKE '/exercises/ox-comic/%-ox-comic.png';

UPDATE public.exercises
SET machine_image_url = NULL
WHERE machine_image_url LIKE '/exercises/machines/%-machine.png';

UPDATE public.exercises
SET demo_url = NULL
WHERE demo_url LIKE '/exercises/demos/%-demo.png';
