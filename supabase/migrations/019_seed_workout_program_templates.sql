-- OX GYM - Migration 019: seed structured workout program templates
-- Depends on 018_workout_program_assignment_flow.sql.

ALTER TABLE public.workout_program_templates
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.workout_template_days
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.workout_template_sections
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_workout_program_templates_updated_at ON public.workout_program_templates;
CREATE TRIGGER trg_workout_program_templates_updated_at
  BEFORE UPDATE ON public.workout_program_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_days_updated_at ON public.workout_template_days;
CREATE TRIGGER trg_workout_template_days_updated_at
  BEFORE UPDATE ON public.workout_template_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_sections_updated_at ON public.workout_template_sections;
CREATE TRIGGER trg_workout_template_sections_updated_at
  BEFORE UPDATE ON public.workout_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workout_template_exercises_updated_at ON public.workout_template_exercises;
CREATE TRIGGER trg_workout_template_exercises_updated_at
  BEFORE UPDATE ON public.workout_template_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exercise_media_updated_at ON public.exercise_media;
CREATE TRIGGER trg_exercise_media_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  programs JSONB := $seed$
  [
    {
      "key": "pro_split_1",
      "name": "Pro Split 1",
      "category": "Pro Split",
      "gender_focus": "Male",
      "description": "OX structured Pro Split workout program. Version 1.",
      "days": [
        {"name":"Push","sets_reps":"3 x 12-10-8","exercises":["Chest Press","Incline Chest Press","Chest Fly Machine","Dips","Shoulder Press Machine","Lateral Raise","Barbell Skull Crusher","Barbell Overhead Extension"]},
        {"name":"Pull","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown","Seated Row","Cable Seated Row","Lat Pulldown Machine","Cobra Lower Back","Rear Delt Fly Machine","Preacher Curl","Cable Hammer Curl"]},
        {"name":"Legs","sets_reps":"3 x 12-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Romanian Deadlift - RDL","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "pro_split_2",
      "name": "Pro Split 2",
      "category": "Pro Split",
      "gender_focus": "Male",
      "description": "OX structured Pro Split workout program. Version 2.",
      "days": [
        {"name":"Push","sets_reps":"3 x 12-10-8","exercises":["Chest Press - Vertical Grip","Chest Fly Machine","Incline Chest Fly","Cable Lower Chest Fly","Dumbbell Shoulder Press","Dumbbell Lateral Raise","Dumbbell Overhead Extension","Triceps Cable Pushdown"]},
        {"name":"Pull","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown Machine","Seated Row - Wide Grip","Incline Row Machine","T-Bar Row - Upper Back","Cobra Lower Back","Cable Face Pull","Dumbbell Incline Curl","Hammer Curl Machine"]},
        {"name":"Legs","sets_reps":"3 x 12-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Romanian Deadlift - RDL","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "double_split",
      "name": "Double Split",
      "category": "Double Split",
      "gender_focus": "Male",
      "description": "OX structured Double Split workout program.",
      "days": [
        {
          "name": "Shoulders + Biceps",
          "sections": [
            {"name":"Shoulders","sets_reps":"3 x 12-10-10","exercises":["Shoulder Press","Dumbbell Lateral Raise","Shoulder Press Machine","Dumbbell Front Raise","Rear Delt Fly Machine"]},
            {"name":"Biceps","sets_reps":"3 x 12-10-8","exercises":["Dumbbell Incline Curl","Hammer Curl Machine","Cable Biceps Curl"]}
          ]
        },
        {
          "name": "Back + Triceps",
          "sections": [
            {"name":"Back","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown","Seated Row","Incline Row Machine","Lat Pulldown Machine","Cobra Lower Back"]},
            {"name":"Triceps","sets_reps":"3 x 12-10-8","exercises":["Triceps Cable Pushdown","Barbell Skull Crusher","Overhead Cable Extension"]}
          ]
        },
        {
          "name": "Chest + Core",
          "sections": [
            {"name":"Chest","sets_reps":"3 x 12-10-10","exercises":["Chest Press - Vertical Grip","Chest Fly Machine","Incline Chest Press","Split Chest Press","Cable Lower Chest Fly or Dips Machine"]},
            {"name":"Core","exercises":[
              {"name":"Abdominal Crunches","sets_reps":"3 x 10"},
              {"name":"Mountain Climbers","sets_reps":"30 reps","rest":"10 seconds"},
              {"name":"Plank","duration":"30 seconds","rest":"10 seconds"}
            ]}
          ]
        },
        {"name":"Legs","sets_reps":"3 x 15-12-10","exercises":["Leg Extension","Belt Squat - Quadriceps","Leg Curl","Adductor Machine","Abductor Machine","Calf Raises"]}
      ]
    },
    {
      "key": "professional_feminine_focus",
      "name": "Professional Feminine Focus",
      "category": "Feminine Focus",
      "gender_focus": "Female",
      "description": "OX structured Professional Feminine Focus workout program.",
      "days": [
        {"day_number":1,"name":"Glutes + Hamstrings","sets_reps":"3 x 12-10-10","exercises":["Hip Thrust","Belt Squat - Glutes","Adductor Machine","Cable Kickbacks","Romanian Deadlift - RDL"]},
        {"day_number":2,"name":"Upper Body","sets_reps":"3 x 10","exercises":["Lat Pulldown","Seated Row","Dumbbell Lateral Raise","Shoulder Press Machine","Chest Press - Vertical Grip","Chest Fly Machine","Triceps Cable Pushdown","Cable Biceps Curl"]},
        {"day_number":3,"name":"Quadriceps + Calves","sets_reps":"3 x 10","exercises":["Belt Squat - Quadriceps","Leg Press - Quadriceps","Leg Extension","Abductor Machine","Calf Raises"]},
        {"day_number":4,"name":"Rest & Recovery","type":"rest_day","exercises":[]},
        {"day_number":5,"name":"Glutes Focus","sets_reps":"3 x 12-10-10","exercises":["Barbell Hip Thrust","Rear Kick Machine","Belt Squat - Glutes","Banded Kickbacks","Clamshells"]},
        {"day_number":6,"name":"Upper Body + Cardio","sets_reps":"3 x 12-10-10","exercises":["Lat Pulldown Machine","Cable Seated Row","Split Chest Press","Chest Fly Machine","Dumbbell Lateral Raise","Overhead Cable Extension","Rear Delt Fly Machine"],"cardio":[{"name":"Treadmill","duration":"15 minutes"},{"name":"Stair Master","duration":"5 minutes"}]},
        {"day_number":7,"name":"OX Flex Day","type":"flexible_day","options":["Rest","Make-up Session","Advanced Functional Work"],"exercises":[]}
      ]
    }
  ]
  $seed$::JSONB;
  program JSONB;
  day_item JSONB;
  section_item JSONB;
  exercise_item JSONB;
  program_id UUID;
  day_id UUID;
  section_id UUID;
  media_id UUID;
  day_index INTEGER;
  section_index INTEGER;
  exercise_index INTEGER;
  exercise_name TEXT;
  exercise_sets_reps TEXT;
  exercise_rest TEXT;
  exercise_duration TEXT;
  exercise_instructions TEXT;
BEGIN
  UPDATE public.workout_program_templates
  SET
    name = 'Pro Split Legacy',
    description = 'Replaced by Pro Split 1 and Pro Split 2 variants.',
    is_active = FALSE,
    updated_at = now()
  WHERE key = 'pro_split';

  FOR program IN SELECT value FROM jsonb_array_elements(programs)
  LOOP
    INSERT INTO public.workout_program_templates (key, name, category, gender_focus, description, is_active, updated_at)
    VALUES (
      program->>'key',
      program->>'name',
      program->>'category',
      program->>'gender_focus',
      program->>'description',
      TRUE,
      now()
    )
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      gender_focus = EXCLUDED.gender_focus,
      description = EXCLUDED.description,
      is_active = TRUE,
      updated_at = now()
    RETURNING id INTO program_id;

    DELETE FROM public.workout_template_days WHERE template_id = program_id;

    day_index := 0;
    FOR day_item IN SELECT value FROM jsonb_array_elements(program->'days')
    LOOP
      INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        sets_reps,
        day_type,
        notes,
        cardio,
        options,
        sort_order,
        updated_at
      )
      VALUES (
        program_id,
        COALESCE((day_item->>'day_number')::INTEGER, day_index + 1),
        day_item->>'name',
        day_item->>'sets_reps',
        COALESCE(day_item->>'type', 'workout_day'),
        day_item->>'notes',
        COALESCE(day_item->'cardio', '[]'::JSONB),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(day_item->'options')), ARRAY[]::TEXT[]),
        day_index,
        now()
      )
      RETURNING id INTO day_id;

      IF jsonb_typeof(day_item->'sections') = 'array' THEN
        section_index := 0;
        FOR section_item IN SELECT value FROM jsonb_array_elements(day_item->'sections')
        LOOP
          INSERT INTO public.workout_template_sections (
            day_id,
            name,
            muscle_group,
            sets_reps,
            sort_order,
            updated_at
          )
          VALUES (
            day_id,
            section_item->>'name',
            section_item->>'name',
            section_item->>'sets_reps',
            section_index,
            now()
          )
          RETURNING id INTO section_id;

          exercise_index := 0;
          FOR exercise_item IN SELECT value FROM jsonb_array_elements(section_item->'exercises')
          LOOP
            IF jsonb_typeof(exercise_item) = 'object' THEN
              exercise_name := exercise_item->>'name';
              exercise_sets_reps := exercise_item->>'sets_reps';
              exercise_rest := exercise_item->>'rest';
              exercise_duration := exercise_item->>'duration';
            ELSE
              exercise_name := trim(both '"' from exercise_item::TEXT);
              exercise_sets_reps := section_item->>'sets_reps';
              exercise_rest := NULL;
              exercise_duration := NULL;
            END IF;

            exercise_instructions := 'Use controlled form for ' || exercise_name || '. Keep the target muscle engaged and ask your coach if anything feels painful.';

            INSERT INTO public.exercise_media (exercise_name, machine_name, instructions, updated_at)
            VALUES (exercise_name, exercise_name, exercise_instructions, now())
            ON CONFLICT (exercise_name) DO UPDATE SET
              machine_name = COALESCE(public.exercise_media.machine_name, EXCLUDED.machine_name),
              instructions = COALESCE(public.exercise_media.instructions, EXCLUDED.instructions),
              updated_at = now()
            RETURNING id INTO media_id;

            INSERT INTO public.workout_template_exercises (
              template_id,
              day_id,
              section_id,
              exercise_media_id,
              name,
              sets_reps,
              rest,
              duration,
              instructions,
              sort_order,
              updated_at
            )
            VALUES (
              program_id,
              day_id,
              section_id,
              media_id,
              exercise_name,
              exercise_sets_reps,
              exercise_rest,
              exercise_duration,
              exercise_instructions,
              exercise_index,
              now()
            );

            exercise_index := exercise_index + 1;
          END LOOP;

          section_index := section_index + 1;
        END LOOP;
      ELSE
        exercise_index := 0;
        FOR exercise_item IN SELECT value FROM jsonb_array_elements(COALESCE(day_item->'exercises', '[]'::JSONB))
        LOOP
          IF jsonb_typeof(exercise_item) = 'object' THEN
            exercise_name := exercise_item->>'name';
            exercise_sets_reps := COALESCE(exercise_item->>'sets_reps', day_item->>'sets_reps');
            exercise_rest := exercise_item->>'rest';
            exercise_duration := exercise_item->>'duration';
          ELSE
            exercise_name := trim(both '"' from exercise_item::TEXT);
            exercise_sets_reps := day_item->>'sets_reps';
            exercise_rest := NULL;
            exercise_duration := NULL;
          END IF;

          exercise_instructions := 'Use controlled form for ' || exercise_name || '. Keep the target muscle engaged and ask your coach if anything feels painful.';

          INSERT INTO public.exercise_media (exercise_name, machine_name, instructions, updated_at)
          VALUES (exercise_name, exercise_name, exercise_instructions, now())
          ON CONFLICT (exercise_name) DO UPDATE SET
            machine_name = COALESCE(public.exercise_media.machine_name, EXCLUDED.machine_name),
            instructions = COALESCE(public.exercise_media.instructions, EXCLUDED.instructions),
            updated_at = now()
          RETURNING id INTO media_id;

          INSERT INTO public.workout_template_exercises (
            template_id,
            day_id,
            section_id,
            exercise_media_id,
            name,
            sets_reps,
            rest,
            duration,
            instructions,
            sort_order,
            updated_at
          )
          VALUES (
            program_id,
            day_id,
            NULL,
            media_id,
            exercise_name,
            exercise_sets_reps,
            exercise_rest,
            exercise_duration,
            exercise_instructions,
            exercise_index,
            now()
          );

          exercise_index := exercise_index + 1;
        END LOOP;
      END IF;

      day_index := day_index + 1;
    END LOOP;
  END LOOP;
END $$;
