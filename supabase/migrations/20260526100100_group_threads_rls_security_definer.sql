-- Replaces the self-referential `thread_members` RLS policies with a SECURITY DEFINER
-- helper so Postgres does not recurse on `thread_members` while evaluating policies
-- on `thread_members`. The helper bypasses RLS internally (DEFINER) so it is safe to
-- call from RLS USING/WITH CHECK clauses on any of the group tables.
set client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.is_thread_member(p_thread_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM thread_members tm
    WHERE tm.thread_id = p_thread_id
      AND tm.user_id = p_user_id
      AND tm.left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_thread_admin(p_thread_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM thread_members tm
    WHERE tm.thread_id = p_thread_id
      AND tm.user_id = p_user_id
      AND tm.left_at IS NULL
      AND tm.role IN ('owner','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_thread_admin(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS group_threads_select_members ON group_threads;
CREATE POLICY group_threads_select_members ON group_threads
FOR SELECT USING (public.is_thread_member(id, auth.uid()));

DROP POLICY IF EXISTS group_threads_update_admin ON group_threads;
CREATE POLICY group_threads_update_admin ON group_threads
FOR UPDATE
USING (public.is_thread_admin(id, auth.uid()))
WITH CHECK (public.is_thread_admin(id, auth.uid()));

DROP POLICY IF EXISTS thread_members_select_members ON thread_members;
CREATE POLICY thread_members_select_members ON thread_members
FOR SELECT USING (public.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS thread_members_manage_admin ON thread_members;
CREATE POLICY thread_members_manage_admin ON thread_members
FOR ALL
USING (public.is_thread_admin(thread_id, auth.uid()))
WITH CHECK (public.is_thread_admin(thread_id, auth.uid()));

DROP POLICY IF EXISTS thread_members_self_leave ON thread_members;
CREATE POLICY thread_members_self_leave ON thread_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS group_messages_select_members ON group_messages;
CREATE POLICY group_messages_select_members ON group_messages
FOR SELECT USING (public.is_thread_member(thread_id, auth.uid()));

DROP POLICY IF EXISTS group_messages_insert_members ON group_messages;
CREATE POLICY group_messages_insert_members ON group_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND public.is_thread_member(thread_id, auth.uid())
);
