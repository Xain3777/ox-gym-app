-- OX GYM - Migration 021: coach workout-library CRUD hardening
-- Depends on 018, 019, and 020.

UPDATE public.workout_template_days
SET day_type = CASE
  WHEN day_type IN ('rest', 'rest_day') THEN 'rest'
  WHEN day_type IN ('flexible', 'flexible_day') THEN 'flexible'
  ELSE 'training'
END;

ALTER TABLE public.workout_template_days
  DROP CONSTRAINT IF EXISTS workout_template_days_day_type_check;

ALTER TABLE public.workout_template_days
  ADD CONSTRAINT workout_template_days_day_type_check
  CHECK (day_type IN ('training', 'rest', 'flexible'));

COMMENT ON COLUMN public.workout_program_templates.description
  IS 'Coach-editable notes for seeded and custom workout programs.';

COMMENT ON COLUMN public.workout_program_templates.is_active
  IS 'Controls assignment availability. Coach/manager/admin can still see inactive templates in the library UI.';

DROP POLICY IF EXISTS workout_program_templates_select ON public.workout_program_templates;
CREATE POLICY workout_program_templates_select ON public.workout_program_templates
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.member_workout_programs mwp
      JOIN public.members m ON m.id = mwp.member_id
      WHERE mwp.template_id = workout_program_templates.id
        AND mwp.status = 'active'
        AND m.auth_id = auth.uid()
    )
  )
);
