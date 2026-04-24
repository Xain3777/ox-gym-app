-- 011: SECURITY DEFINER role lookup.
-- The SELECT policy on public.members contains an EXISTS subquery that
-- self-references the table. When a user's own session tries to read
-- their own role, Postgres' RLS planner bails on the recursive sub-
-- policy, the row comes back empty, and the app defaults them to
-- "player" — sending every staff account to /portal.
--
-- This function bypasses RLS for a single column read. Middleware,
-- login API, and portal pages call it via supabase.rpc() instead of
-- selecting from members directly for the auth check.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.members WHERE auth_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
