-- OX GYM - Migration 041: per-exercise workout tracking
--
-- workout_logs holds the daily summary (X of Y exercises done).
-- This table records WHICH exercises were marked done so the UI can
-- restore checkmarks on revisit and the coach can see exact history.
--
-- One row per (member, calendar-date, workout_day, exercise_name).
-- Re-tapping the same exercise the same day upserts in place.

CREATE TABLE IF NOT EXISTS public.workout_exercise_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_day   TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_exercise_logs_unique_idx
  ON public.workout_exercise_logs(member_id, session_date, workout_day, exercise_name);

CREATE INDEX IF NOT EXISTS workout_exercise_logs_member_date_idx
  ON public.workout_exercise_logs(member_id, session_date DESC);

CREATE INDEX IF NOT EXISTS workout_exercise_logs_day_idx
  ON public.workout_exercise_logs(member_id, workout_day, session_date DESC);

ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_exercise_logs_select_own ON public.workout_exercise_logs;
CREATE POLICY workout_exercise_logs_select_own ON public.workout_exercise_logs
FOR SELECT TO authenticated
USING (
  public.current_user_role() IN ('manager','head_coach','coach','admin')
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = workout_exercise_logs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_exercise_logs_insert_own ON public.workout_exercise_logs;
CREATE POLICY workout_exercise_logs_insert_own ON public.workout_exercise_logs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = workout_exercise_logs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_exercise_logs_update_own ON public.workout_exercise_logs;
CREATE POLICY workout_exercise_logs_update_own ON public.workout_exercise_logs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = workout_exercise_logs.member_id
      AND m.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = workout_exercise_logs.member_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS workout_exercise_logs_staff_write ON public.workout_exercise_logs;
CREATE POLICY workout_exercise_logs_staff_write ON public.workout_exercise_logs
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','admin'))
WITH CHECK (public.current_user_role() IN ('manager','admin'));
