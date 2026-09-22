-- AUDIT M20 — Tighten Event HQ RLS (event_resources, event_calendar_items, event_bulletins).
--
-- Original policies (20260413120000_event_hq_tables.sql) had no `to` clause
-- (applying to anon too) and fully open INSERT/UPDATE/DELETE:
--   event_resources_delete    USING (true)
--   event_calendar_items_*    WITH CHECK / USING (true)
--   event_bulletins_update    USING (true)
--   event_bulletins_delete    USING (true)
--
-- New contract:
--   * READS: authenticated-only (HQ content is internal; visibility slices
--     like visible_to[] remain enforced application-side as today).
--   * WRITES: creator-scoped — users may insert rows they own and
--     modify/delete only their own rows; platform admins retain full access.
--
-- Behavior change note: anonymous readers lose access to these three tables.
-- They power authenticated Event-HQ surfaces only.

begin;

do $$
declare
  v_is_admin text := $admin$
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin is true
    )
  $admin$;
begin
  if to_regclass('public.event_resources') is not null then
    execute 'drop policy if exists "event_resources_read" on public.event_resources';
    execute 'drop policy if exists "event_resources_insert" on public.event_resources';
    execute 'drop policy if exists "event_resources_delete" on public.event_resources';
    execute 'drop policy if exists event_resources_update on public.event_resources';

    execute 'create policy "event_resources_read" on public.event_resources
      for select to authenticated using (true)';
    execute format('create policy "event_resources_insert" on public.event_resources
      for insert to authenticated with check (created_by = auth.uid() or %s)', v_is_admin);
    execute 'create policy event_resources_update on public.event_resources
      for update to authenticated
      using (created_by = auth.uid()) with check (created_by = auth.uid())';
    execute format('create policy "event_resources_delete" on public.event_resources
      for delete to authenticated using (created_by = auth.uid() or %s)', v_is_admin);
  end if;

  if to_regclass('public.event_calendar_items') is not null then
    execute 'drop policy if exists "event_calendar_items_read" on public.event_calendar_items';
    execute 'drop policy if exists "event_calendar_items_insert" on public.event_calendar_items';
    execute 'drop policy if exists "event_calendar_items_delete" on public.event_calendar_items';
    execute 'drop policy if exists event_calendar_items_update on public.event_calendar_items';

    execute 'create policy "event_calendar_items_read" on public.event_calendar_items
      for select to authenticated using (true)';
    execute format('create policy "event_calendar_items_insert" on public.event_calendar_items
      for insert to authenticated with check (created_by = auth.uid() or %s)', v_is_admin);
    execute 'create policy event_calendar_items_update on public.event_calendar_items
      for update to authenticated
      using (created_by = auth.uid()) with check (created_by = auth.uid())';
    execute format('create policy "event_calendar_items_delete" on public.event_calendar_items
      for delete to authenticated using (created_by = auth.uid() or %s)', v_is_admin);
  end if;

  if to_regclass('public.event_bulletins') is not null then
    execute 'drop policy if exists "event_bulletins_read" on public.event_bulletins';
    execute 'drop policy if exists "event_bulletins_insert" on public.event_bulletins';
    execute 'drop policy if exists "event_bulletins_update" on public.event_bulletins';
    execute 'drop policy if exists "event_bulletins_delete" on public.event_bulletins';

    execute 'create policy "event_bulletins_read" on public.event_bulletins
      for select to authenticated using (true)';
    execute format('create policy "event_bulletins_insert" on public.event_bulletins
      for insert to authenticated with check (author_id = auth.uid() or %s)', v_is_admin);
    execute 'create policy "event_bulletins_update" on public.event_bulletins
      for update to authenticated
      using (author_id = auth.uid()) with check (author_id = auth.uid())';
    execute format('create policy "event_bulletins_delete" on public.event_bulletins
      for delete to authenticated using (author_id = auth.uid() or %s)', v_is_admin);
  end if;
end $$;

commit;
