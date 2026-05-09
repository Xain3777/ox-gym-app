-- OX GYM - Migration 018: structured workout program templates + assignments

CREATE TABLE IF NOT EXISTS public.workout_program_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  gender_focus TEXT,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE CASCADE,
  day_number  INTEGER,
  name        TEXT NOT NULL,
  sets_reps   TEXT,
  day_type    TEXT NOT NULL DEFAULT 'workout_day',
  notes       TEXT,
  cardio      JSONB NOT NULL DEFAULT '[]',
  options     TEXT[] NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id       UUID NOT NULL REFERENCES public.workout_template_days(id) ON DELETE CASCADE,
  name         TEXT,
  muscle_group TEXT,
  sets_reps    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.exercise_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name     TEXT NOT NULL UNIQUE,
  machine_name      TEXT,
  machine_image_url TEXT,
  demo_image_url    TEXT,
  demo_video_url    TEXT,
  instructions      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE CASCADE,
  day_id            UUID NOT NULL REFERENCES public.workout_template_days(id) ON DELETE CASCADE,
  section_id        UUID REFERENCES public.workout_template_sections(id) ON DELETE CASCADE,
  exercise_media_id UUID REFERENCES public.exercise_media(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  sets_reps         TEXT,
  rest              TEXT,
  duration          TEXT,
  notes             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.member_workout_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.workout_program_templates(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  notes       TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_template_days_template_idx
  ON public.workout_template_days(template_id, sort_order);
CREATE INDEX IF NOT EXISTS workout_template_sections_day_idx
  ON public.workout_template_sections(day_id, sort_order);
CREATE INDEX IF NOT EXISTS workout_template_exercises_day_idx
  ON public.workout_template_exercises(day_id, section_id, sort_order);
CREATE INDEX IF NOT EXISTS member_workout_programs_member_idx
  ON public.member_workout_programs(member_id, status, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS member_workout_programs_one_active_idx
  ON public.member_workout_programs(member_id)
  WHERE status = 'active';

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workout_program_templates',
    'workout_template_days',
    'workout_template_sections',
    'exercise_media',
    'workout_template_exercises',
    'member_workout_programs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS workout_program_templates_select ON public.workout_program_templates;
CREATE POLICY workout_program_templates_select ON public.workout_program_templates
FOR SELECT TO authenticated
USING (
  is_active
  AND (
    public.current_user_role() IN ('manager','head_coach','coach','admin')
    OR EXISTS (
      SELECT 1
      FROM public.member_workout_programs mwp
      JOIN public.members m ON m.id = mwp.member_id
      WHERE mwp.template_id = workout_program_templates.id
        AND mwp.status = 'active'
        AND m.auth_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS workout_program_templates_write ON public.workout_program_templates;
CREATE POLICY workout_program_templates_write ON public.workout_program_templates
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_days_select ON public.workout_template_days;
CREATE POLICY workout_template_days_select ON public.workout_template_days
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.members m ON m.id = mwp.member_id
    WHERE mwp.template_id = workout_template_days.template_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_days_write ON public.workout_template_days;
CREATE POLICY workout_template_days_write ON public.workout_template_days
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_sections_select ON public.workout_template_sections;
CREATE POLICY workout_template_sections_select ON public.workout_template_sections
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.workout_template_days d ON d.template_id = mwp.template_id
    JOIN public.members m ON m.id = mwp.member_id
    WHERE d.id = workout_template_sections.day_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_sections_write ON public.workout_template_sections;
CREATE POLICY workout_template_sections_write ON public.workout_template_sections
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS workout_template_exercises_select ON public.workout_template_exercises;
CREATE POLICY workout_template_exercises_select ON public.workout_template_exercises
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_workout_programs mwp
    JOIN public.members m ON m.id = mwp.member_id
    WHERE mwp.template_id = workout_template_exercises.template_id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_template_exercises_write ON public.workout_template_exercises;
CREATE POLICY workout_template_exercises_write ON public.workout_template_exercises
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS exercise_media_select ON public.exercise_media;
CREATE POLICY exercise_media_select ON public.exercise_media
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.workout_template_exercises wte
    JOIN public.member_workout_programs mwp ON mwp.template_id = wte.template_id
    JOIN public.members m ON m.id = mwp.member_id
    WHERE wte.exercise_media_id = exercise_media.id
      AND mwp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS exercise_media_write ON public.exercise_media;
CREATE POLICY exercise_media_write ON public.exercise_media
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS member_workout_programs_select ON public.member_workout_programs;
CREATE POLICY member_workout_programs_select ON public.member_workout_programs
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_workout_programs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS member_workout_programs_write ON public.member_workout_programs;
CREATE POLICY member_workout_programs_write ON public.member_workout_programs
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));
