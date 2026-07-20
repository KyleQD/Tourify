set client_min_messages = warning;

-- Security audit remediation:
-- 1) Remove always-true Event HQ write policies
-- 2) Restrict notification_events inserts to service_role
-- 3) Private application-documents storage (no public listing)
-- 4) Revoke anon execute on SECURITY DEFINER RPCs
-- 5) Pin mutable search_path on flagged helpers

create or replace function public.can_manage_event_hq(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.events_v2 e
     where e.id = p_event_id
       and (
         e.created_by = auth.uid()
         or public.is_org_member(auth.uid(), e.org_id)
       )
  );
$$;

revoke all on function public.can_manage_event_hq(uuid) from public, anon;
grant execute on function public.can_manage_event_hq(uuid) to authenticated, service_role;

-- event_bulletins: drop permissive HQ policies; keep service_role + scoped authenticated writes
drop policy if exists "event_bulletins_read" on public.event_bulletins;
drop policy if exists "event_bulletins_insert" on public.event_bulletins;
drop policy if exists "event_bulletins_update" on public.event_bulletins;
drop policy if exists "event_bulletins_delete" on public.event_bulletins;

drop policy if exists "event_bulletins_insert_managers" on public.event_bulletins;
create policy "event_bulletins_insert_managers"
  on public.event_bulletins
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.can_manage_event_hq(event_id)
  );

drop policy if exists "event_bulletins_update_managers" on public.event_bulletins;
create policy "event_bulletins_update_managers"
  on public.event_bulletins
  for update
  to authenticated
  using (
    author_id = auth.uid()
    or public.can_manage_event_hq(event_id)
  )
  with check (
    author_id = auth.uid()
    or public.can_manage_event_hq(event_id)
  );

drop policy if exists "event_bulletins_delete_managers" on public.event_bulletins;
create policy "event_bulletins_delete_managers"
  on public.event_bulletins
  for delete
  to authenticated
  using (
    author_id = auth.uid()
    or public.can_manage_event_hq(event_id)
  );

-- event_resources
drop policy if exists "event_resources_read" on public.event_resources;
drop policy if exists "event_resources_insert" on public.event_resources;
drop policy if exists "event_resources_delete" on public.event_resources;

drop policy if exists "event_resources_select_managers" on public.event_resources;
create policy "event_resources_select_managers"
  on public.event_resources
  for select
  to authenticated
  using (public.can_manage_event_hq(event_id));

drop policy if exists "event_resources_insert_managers" on public.event_resources;
create policy "event_resources_insert_managers"
  on public.event_resources
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_manage_event_hq(event_id)
  );

drop policy if exists "event_resources_delete_managers" on public.event_resources;
create policy "event_resources_delete_managers"
  on public.event_resources
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.can_manage_event_hq(event_id)
  );

-- event_calendar_items
drop policy if exists "event_calendar_items_read" on public.event_calendar_items;
drop policy if exists "event_calendar_items_insert" on public.event_calendar_items;
drop policy if exists "event_calendar_items_delete" on public.event_calendar_items;

drop policy if exists "event_calendar_items_select_managers" on public.event_calendar_items;
create policy "event_calendar_items_select_managers"
  on public.event_calendar_items
  for select
  to authenticated
  using (public.can_manage_event_hq(event_id));

drop policy if exists "event_calendar_items_insert_managers" on public.event_calendar_items;
create policy "event_calendar_items_insert_managers"
  on public.event_calendar_items
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_manage_event_hq(event_id)
  );

drop policy if exists "event_calendar_items_delete_managers" on public.event_calendar_items;
create policy "event_calendar_items_delete_managers"
  on public.event_calendar_items
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.can_manage_event_hq(event_id)
  );

-- notification_events: service_role only inserts
drop policy if exists notification_events_insert_service on public.notification_events;
create policy notification_events_insert_service
  on public.notification_events
  for insert
  to service_role
  with check (true);

-- application-documents: private bucket, no public listing
update storage.buckets
   set public = false,
       file_size_limit = coalesce(file_size_limit, 10485760)
 where id = 'application-documents';

drop policy if exists "application_documents_public_read" on storage.objects;
drop policy if exists application_documents_public_read on storage.objects;

do $application_documents_select_own$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'application_documents_select_own'
  ) then
    create policy "application_documents_select_own"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'application-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $application_documents_select_own$;

-- Revoke anon/PUBLIC execute on all public SECURITY DEFINER functions
do $revoke_anon_security_definer$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef = true
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon',
      r.schema_name,
      r.function_name,
      r.identity_args
    );
  end loop;
end $revoke_anon_security_definer$;

-- Revoke authenticated execute on privileged/admin-only helpers
do $revoke_authenticated_privileged$
declare
  privileged_names text[] := array[
    'approve_verification_request',
    'execute_bulk_operation',
    'cleanup_old_notifications',
    'cleanup_old_venue_image',
    'cleanup_orphaned_artist_files',
    'update_all_user_stats',
    'create_daily_analytics_snapshot',
    'exec_sql',
    'exec'
  ];
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef = true
       and p.proname = any (privileged_names)
  loop
    execute format(
      'revoke all on function %I.%I(%s) from authenticated',
      r.schema_name,
      r.function_name,
      r.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      r.schema_name,
      r.function_name,
      r.identity_args
    );
  end loop;
end $revoke_authenticated_privileged$;

-- Pin search_path on advisor-flagged functions
alter function public.set_employment_assignments_updated_at() set search_path = public;
alter function public._tourify_has_columns(text, text[]) set search_path = public;
alter function public.slugify_org_name(text) set search_path = public;

-- Move pg_net out of public when possible
do $move_pg_net$
begin
  create schema if not exists extensions;
  if exists (
    select 1 from pg_extension where extname = 'pg_net'
  ) and exists (
    select 1
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
     where e.extname = 'pg_net'
       and n.nspname = 'public'
  ) then
    begin
      execute 'alter extension pg_net set schema extensions';
    exception when others then
      raise notice 'Could not move pg_net out of public: %', sqlerrm;
    end;
  end if;
end $move_pg_net$;
