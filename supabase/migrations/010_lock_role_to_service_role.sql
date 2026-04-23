-- 010: Role changes only from database / service-role context.
-- Any session with an auth.uid() (i.e. a logged-in user — player, coach,
-- reception, even manager via anon key) is blocked from changing role.
-- Role switches must come from the Supabase dashboard or a service-role API.
CREATE OR REPLACE FUNCTION public.enforce_role_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'role can only be changed by the database/service role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_role_immutable ON public.members;
CREATE TRIGGER trg_members_role_immutable
BEFORE UPDATE OF role ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_immutable();
