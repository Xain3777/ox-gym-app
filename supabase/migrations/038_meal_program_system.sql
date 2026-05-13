-- OX GYM - Migration 038: structured meal program templates + assignments + consultation requests
-- Mirrors the workout system (migration 018) for meals.

CREATE TABLE IF NOT EXISTS public.meal_program_templates (
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

CREATE TABLE IF NOT EXISTS public.meal_template_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.meal_program_templates(id) ON DELETE CASCADE,
  day_number  INTEGER,
  name        TEXT NOT NULL,
  day_type    TEXT NOT NULL DEFAULT 'training',
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_template_meals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.meal_program_templates(id) ON DELETE CASCADE,
  day_id      UUID NOT NULL REFERENCES public.meal_template_days(id) ON DELETE CASCADE,
  meal_slot   TEXT NOT NULL DEFAULT 'meal',
  name        TEXT NOT NULL,
  description TEXT,
  example     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.member_meal_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.meal_program_templates(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'active',
  notes       TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_consultation_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_template_days_template_idx
  ON public.meal_template_days(template_id, sort_order);
CREATE INDEX IF NOT EXISTS meal_template_meals_day_idx
  ON public.meal_template_meals(day_id, sort_order);
CREATE INDEX IF NOT EXISTS member_meal_programs_member_idx
  ON public.member_meal_programs(member_id, status, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS member_meal_programs_one_active_idx
  ON public.member_meal_programs(member_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS meal_consultation_requests_inbox_idx
  ON public.meal_consultation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS meal_consultation_requests_member_idx
  ON public.meal_consultation_requests(member_id, created_at DESC);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'meal_program_templates',
    'meal_template_days',
    'meal_template_meals',
    'member_meal_programs',
    'meal_consultation_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ── meal_program_templates ────────────────────────────────────
DROP POLICY IF EXISTS meal_program_templates_select ON public.meal_program_templates;
CREATE POLICY meal_program_templates_select ON public.meal_program_templates
FOR SELECT TO authenticated
USING (
  is_active
  AND (
    public.current_user_role() IN ('manager','head_coach','coach','admin')
    OR EXISTS (
      SELECT 1
      FROM public.member_meal_programs mmp
      JOIN public.members m ON m.id = mmp.member_id
      WHERE mmp.template_id = meal_program_templates.id
        AND mmp.status = 'active'
        AND m.auth_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS meal_program_templates_write ON public.meal_program_templates;
CREATE POLICY meal_program_templates_write ON public.meal_program_templates
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

-- ── meal_template_days ────────────────────────────────────────
DROP POLICY IF EXISTS meal_template_days_select ON public.meal_template_days;
CREATE POLICY meal_template_days_select ON public.meal_template_days
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_meal_programs mmp
    JOIN public.members m ON m.id = mmp.member_id
    WHERE mmp.template_id = meal_template_days.template_id
      AND mmp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS meal_template_days_write ON public.meal_template_days;
CREATE POLICY meal_template_days_write ON public.meal_template_days
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

-- ── meal_template_meals ───────────────────────────────────────
DROP POLICY IF EXISTS meal_template_meals_select ON public.meal_template_meals;
CREATE POLICY meal_template_meals_select ON public.meal_template_meals
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1
    FROM public.member_meal_programs mmp
    JOIN public.members m ON m.id = mmp.member_id
    WHERE mmp.template_id = meal_template_meals.template_id
      AND mmp.status = 'active'
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS meal_template_meals_write ON public.meal_template_meals;
CREATE POLICY meal_template_meals_write ON public.meal_template_meals
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

-- ── member_meal_programs ──────────────────────────────────────
DROP POLICY IF EXISTS member_meal_programs_select ON public.member_meal_programs;
CREATE POLICY member_meal_programs_select ON public.member_meal_programs
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_meal_programs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS member_meal_programs_write ON public.member_meal_programs;
CREATE POLICY member_meal_programs_write ON public.member_meal_programs
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

-- ── meal_consultation_requests ────────────────────────────────
-- Player can read + insert their own; coach/manager full access.
DROP POLICY IF EXISTS meal_consultation_requests_select ON public.meal_consultation_requests;
CREATE POLICY meal_consultation_requests_select ON public.meal_consultation_requests
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = meal_consultation_requests.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS meal_consultation_requests_insert ON public.meal_consultation_requests;
CREATE POLICY meal_consultation_requests_insert ON public.meal_consultation_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = meal_consultation_requests.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS meal_consultation_requests_update ON public.meal_consultation_requests;
CREATE POLICY meal_consultation_requests_update ON public.meal_consultation_requests
FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'))
WITH CHECK (public.current_user_role() IN ('manager','head_coach','coach','admin'));

DROP POLICY IF EXISTS meal_consultation_requests_delete ON public.meal_consultation_requests;
CREATE POLICY meal_consultation_requests_delete ON public.meal_consultation_requests
FOR DELETE TO authenticated
USING (public.current_user_role() IN ('manager','head_coach','coach','admin'));
