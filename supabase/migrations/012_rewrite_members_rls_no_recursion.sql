-- 012: Rewrite members RLS policies to avoid self-reference recursion.
-- The previous policies embedded `EXISTS (SELECT 1 FROM members m ...)`
-- in their USING clause. Because that subquery runs under the same
-- policy it was defining, Postgres raised
--   42P17 infinite recursion detected in policy for relation "members"
-- on every query. The app silently fell back to "player" for everyone
-- and routed all staff logins to /portal.
--
-- Solution: delegate the role check to public.current_user_role()
-- (SECURITY DEFINER, migration 011), which reads the caller's role
-- bypassing RLS.
DROP POLICY IF EXISTS "Manager and coach can read all members"   ON public.members;
DROP POLICY IF EXISTS "Manager and reception can update members" ON public.members;
DROP POLICY IF EXISTS "Manager can delete members"               ON public.members;
DROP POLICY IF EXISTS "Manager and reception can insert members" ON public.members;

CREATE POLICY "members_select"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auth_id
    OR public.current_user_role() IN ('manager','coach','reception')
  );

CREATE POLICY "members_update"
  ON public.members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auth_id
    OR public.current_user_role() IN ('manager','reception')
  );

CREATE POLICY "members_delete"
  ON public.members FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'manager');

CREATE POLICY "members_insert"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('manager','reception'));
