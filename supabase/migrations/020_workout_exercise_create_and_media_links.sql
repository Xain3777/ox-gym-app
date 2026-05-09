-- OX GYM - Migration 020: exercise creation support + real media suggestions
-- Depends on 018 and 019.

ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS workout_template_exercises_media_idx
  ON public.workout_template_exercises(exercise_media_id);

DROP TRIGGER IF EXISTS trg_workout_template_exercises_updated_at ON public.workout_template_exercises;
CREATE TRIGGER trg_workout_template_exercises_updated_at
  BEFORE UPDATE ON public.workout_template_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_media_updated_at ON public.exercise_media;
CREATE TRIGGER trg_exercise_media_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.exercise_media_seed_links (
  exercise_name     TEXT PRIMARY KEY,
  machine_name      TEXT,
  machine_image_url TEXT,
  demo_image_url    TEXT,
  demo_video_url    TEXT,
  instructions      TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.exercise_media_seed_links (
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions
)
VALUES
  ('Abdominal Crunches','Abdominal Crunches','/gym-machines/Abdominal Machine.jpg','/exercises/machines/abdominal.png',NULL,'Use controlled form for Abdominal Crunches. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Abductor Machine','Abductor Machine','/gym-machines/Abductor A.jpg','/exercises/machines/abdactor.png',NULL,'Use controlled form for Abductor Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Adductor Machine','Adductor Machine','/gym-machines/Adductor B.jpg','/exercises/machines/addactor.png',NULL,'Use controlled form for Adductor Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Hip Thrust','Barbell Hip Thrust','/gym-machines/Hip Thrust.jpg','/exercises/machines/hip thrust.png',NULL,'Use controlled form for Barbell Hip Thrust. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Overhead Extension','Barbell Overhead Extension',NULL,'/exercises/machines/Barbell Overhead.png',NULL,'Use controlled form for Barbell Overhead Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Barbell Skull Crusher','Barbell Skull Crusher',NULL,'/exercises/machines/Barbell Skull Crusher.png',NULL,'Use controlled form for Barbell Skull Crusher. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Banded Kickbacks','Banded Kickbacks',NULL,'/exercises/machines/Cable kicbacks.png',NULL,'Use controlled form for Banded Kickbacks. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Belt Squat - Glutes','Belt Squat - Glutes','/gym-machines/Rhino Squat-H.jpg','/exercises/machines/Belt squat _Glutes.png',NULL,'Use controlled form for Belt Squat - Glutes. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Belt Squat - Quadriceps','Belt Squat - Quadriceps','/gym-machines/Rhino Squat-H.jpg','/exercises/machines/Pendulum Squat _Quadriceps.png',NULL,'Use controlled form for Belt Squat - Quadriceps. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Biceps Curl','Cable Biceps Curl',NULL,'/exercises/machines/Cable biceps curl.png',NULL,'Use controlled form for Cable Biceps Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Face Pull','Cable Face Pull','/gym-machines/Functional Trainer.jpg',NULL,NULL,'Use controlled form for Cable Face Pull. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Hammer Curl','Cable Hammer Curl',NULL,'/exercises/machines/Cable Hummer curl.png',NULL,'Use controlled form for Cable Hammer Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Kickbacks','Cable Kickbacks',NULL,'/exercises/machines/Cable kicbacks.png',NULL,'Use controlled form for Cable Kickbacks. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Lower Chest Fly','Cable Lower Chest Fly',NULL,'/exercises/machines/Cable lower cheast fly.png',NULL,'Use controlled form for Cable Lower Chest Fly. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Lower Chest Fly or Dips Machine','Cable Lower Chest Fly or Dips Machine','/gym-machines/Dips Press Dual System.jpg','/exercises/machines/dual dips.png',NULL,'Use controlled form for Cable Lower Chest Fly or Dips Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cable Seated Row','Cable Seated Row','/gym-machines/Seated Row.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Cable Seated Row. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Calf Raises','Calf Raises','/gym-machines/Calf.jpg','/exercises/machines/calf raises.png',NULL,'Use controlled form for Calf Raises. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Fly Machine','Chest Fly Machine','/gym-machines/Super Middle Chest Flight.jpg','/exercises/machines/Fly incline chest.png',NULL,'Use controlled form for Chest Fly Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Press','Chest Press','/gym-machines/Chest Press.jpg','/exercises/machines/Vertical chest press machine.png',NULL,'Use controlled form for Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Chest Press - Vertical Grip','Chest Press - Vertical Grip','/gym-machines/Vertical Press.jpg','/exercises/machines/Vertical chest press machine.png',NULL,'Use controlled form for Chest Press - Vertical Grip. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Cobra Lower Back','Cobra Lower Back',NULL,'/exercises/machines/Cobra lower back.png',NULL,'Use controlled form for Cobra Lower Back. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dips','Dips','/gym-machines/Dips Press Dual System.jpg','/exercises/machines/dual dips.png',NULL,'Use controlled form for Dips. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Front Raise','Dumbbell Front Raise',NULL,'/exercises/machines/Barbell Front Raise.png',NULL,'Use controlled form for Dumbbell Front Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Incline Curl','Dumbbell Incline Curl',NULL,'/exercises/machines/Dumbbell Incline Curl.png',NULL,'Use controlled form for Dumbbell Incline Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Lateral Raise','Dumbbell Lateral Raise',NULL,'/exercises/machines/Dumbbell Lateral Raise.png',NULL,'Use controlled form for Dumbbell Lateral Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Overhead Extension','Dumbbell Overhead Extension',NULL,'/exercises/machines/Dumbbell Overhead Extension.png',NULL,'Use controlled form for Dumbbell Overhead Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Dumbbell Shoulder Press','Dumbbell Shoulder Press',NULL,'/exercises/machines/Dumbbell Shoulder Press.png',NULL,'Use controlled form for Dumbbell Shoulder Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Hammer Curl Machine','Hammer Curl Machine',NULL,'/exercises/machines/hummer curl machine.png',NULL,'Use controlled form for Hammer Curl Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Hip Thrust','Hip Thrust','/gym-machines/Hip Thrust.jpg','/exercises/machines/hip thrust.png',NULL,'Use controlled form for Hip Thrust. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Chest Fly','Incline Chest Fly',NULL,'/exercises/machines/Incline cheast press.png',NULL,'Use controlled form for Incline Chest Fly. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Chest Press','Incline Chest Press','/gym-machines/Incline Chest Press (Plate Loaded).jpg','/exercises/machines/Incline cheast press.png',NULL,'Use controlled form for Incline Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Incline Row Machine','Incline Row Machine','/gym-machines/Incline Lever Row.jpg','/exercises/machines/Incline  Row Machine 2.png',NULL,'Use controlled form for Incline Row Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lat Pulldown','Lat Pulldown','/gym-machines/Pull Down.jpg','/exercises/machines/pull up.png',NULL,'Use controlled form for Lat Pulldown. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lat Pulldown Machine','Lat Pulldown Machine','/gym-machines/Iso-Lateral Lat Pulldown.jpg','/exercises/machines/pull up.png',NULL,'Use controlled form for Lat Pulldown Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Lateral Raise','Lateral Raise','/gym-machines/Standing Lateral Raise.jpg','/exercises/machines/laterial raises.png',NULL,'Use controlled form for Lateral Raise. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Curl','Leg Curl','/gym-machines/Prone Leg Curl.jpg','/exercises/machines/single leg curl.png',NULL,'Use controlled form for Leg Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Extension','Leg Extension','/gym-machines/Leg Extension.jpg','/exercises/machines/leg press.png',NULL,'Use controlled form for Leg Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Leg Press - Quadriceps','Leg Press - Quadriceps','/gym-machines/Leg Press.jpg','/exercises/machines/leg press.png',NULL,'Use controlled form for Leg Press - Quadriceps. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Overhead Cable Extension','Overhead Cable Extension',NULL,'/exercises/machines/Overhead Cable Extension.png',NULL,'Use controlled form for Overhead Cable Extension. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Preacher Curl','Preacher Curl','/gym-machines/Biceps.jpg','/exercises/machines/biceps triceps machine.png',NULL,'Use controlled form for Preacher Curl. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Rear Delt Fly Machine','Rear Delt Fly Machine','/gym-machines/Super Middle Chest Flight.jpg','/exercises/machines/rear kickback.png',NULL,'Use controlled form for Rear Delt Fly Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Rear Kick Machine','Rear Kick Machine','/gym-machines/Rear Kick.jpg','/exercises/machines/rear kickback.png',NULL,'Use controlled form for Rear Kick Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Romanian Deadlift - RDL','Romanian Deadlift - RDL',NULL,'/exercises/machines/Romanian Deadlift - RDL.png',NULL,'Use controlled form for Romanian Deadlift - RDL. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Seated Row','Seated Row','/gym-machines/Seated Row.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Seated Row. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Seated Row - Wide Grip','Seated Row - Wide Grip','/gym-machines/Seated Row Machine.jpg','/exercises/machines/rowing.png',NULL,'Use controlled form for Seated Row - Wide Grip. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Shoulder Press','Shoulder Press','/gym-machines/Shoulder Press.jpg','/exercises/machines/shoulder press.png',NULL,'Use controlled form for Shoulder Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Shoulder Press Machine','Shoulder Press Machine','/gym-machines/Shoulder Press.jpg','/exercises/machines/shoulder press machine.png',NULL,'Use controlled form for Shoulder Press Machine. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Split Chest Press','Split Chest Press','/gym-machines/Split Push Chest Trainer.jpg','/exercises/machines/Split cheast press.png',NULL,'Use controlled form for Split Chest Press. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('T-Bar Row - Upper Back','T-Bar Row - Upper Back','/gym-machines/Incline Lever Row.jpg','/exercises/machines/Incline  Row Machine 2.png',NULL,'Use controlled form for T-Bar Row - Upper Back. Keep the target muscle engaged and ask your coach if anything feels painful.'),
  ('Triceps Cable Pushdown','Triceps Cable Pushdown',NULL,'/exercises/machines/Triceps cable push down.png',NULL,'Use controlled form for Triceps Cable Pushdown. Keep the target muscle engaged and ask your coach if anything feels painful.')
ON CONFLICT (exercise_name) DO UPDATE SET
  machine_name = EXCLUDED.machine_name,
  machine_image_url = EXCLUDED.machine_image_url,
  demo_image_url = EXCLUDED.demo_image_url,
  demo_video_url = EXCLUDED.demo_video_url,
  instructions = EXCLUDED.instructions,
  updated_at = now();

INSERT INTO public.exercise_media (
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions,
  updated_at
)
SELECT
  exercise_name,
  machine_name,
  machine_image_url,
  demo_image_url,
  demo_video_url,
  instructions,
  now()
FROM public.exercise_media_seed_links
ON CONFLICT (exercise_name) DO UPDATE SET
  machine_name = EXCLUDED.machine_name,
  machine_image_url = EXCLUDED.machine_image_url,
  demo_image_url = EXCLUDED.demo_image_url,
  demo_video_url = EXCLUDED.demo_video_url,
  instructions = EXCLUDED.instructions,
  updated_at = now();

UPDATE public.workout_template_exercises wte
SET
  exercise_media_id = em.id,
  instructions = COALESCE(wte.instructions, em.instructions),
  updated_at = now()
FROM public.exercise_media em
WHERE lower(trim(wte.name)) = lower(trim(em.exercise_name));
