-- DB-010 contract checks for worker action append-only tables.
-- Run after 20260922155356_worker_actions_scope_reconciliation.sql.
-- Every violation query should return zero rows; the final query should return
-- one row with worker_actions_scope_ready = true.

select 'work_mode_publication_acknowledgements table missing' as violation
where to_regclass('public.work_mode_publication_acknowledgements') is null;

select 'work_mode_check_in_events table missing' as violation
where to_regclass('public.work_mode_check_in_events') is null;

select format('%s missing RLS', c.relname) as violation
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('work_mode_publication_acknowledgements', 'work_mode_check_in_events')
  and (not c.relrowsecurity or not c.relforcerowsecurity);

select format('%s grants unexpected %s to %s', table_name, privilege_type, grantee) as violation
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('work_mode_publication_acknowledgements', 'work_mode_check_in_events')
  and (
    grantee = 'anon'
    or (grantee = 'authenticated' and privilege_type not in ('SELECT', 'INSERT'))
  );

select format('%s missing authenticated SELECT/INSERT grants', table_name) as violation
from (
  values
    ('work_mode_publication_acknowledgements'),
    ('work_mode_check_in_events')
) as expected(table_name)
where not exists (
  select 1
  from information_schema.role_table_grants grants
  where grants.table_schema = 'public'
    and grants.table_name = expected.table_name
    and grants.grantee = 'authenticated'
    and grants.privilege_type = 'SELECT'
)
or not exists (
  select 1
  from information_schema.role_table_grants grants
  where grants.table_schema = 'public'
    and grants.table_name = expected.table_name
    and grants.grantee = 'authenticated'
    and grants.privilege_type = 'INSERT'
);

select 'acknowledgement policy missing event/tour/audience assignment scope' as violation
where not exists (
  select 1
  from pg_policies
  where schemaname = 'public'
    and tablename = 'work_mode_publication_acknowledgements'
    and policyname = 'work_mode_publication_ack_worker_insert'
    and cmd = 'INSERT'
    and roles @> array['authenticated']::name[]
    and with_check ilike '%assignment.status%'
    and with_check ilike '%confirmed%'
    and with_check ilike '%active%'
    and with_check ilike '%publication.status = ''published''%'
    and with_check ilike '%publication.event_id%'
    and with_check ilike '%coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id)%'
    and with_check ilike '%publication.tour_id = assignment.tour_id%'
    and with_check ilike '%work_mode_security.publication_audience_allows%'
    and with_check ilike '%publication.visible_to%'
    and with_check ilike '%required_permission%'
    and with_check ilike '%auth.uid%'
);

select 'acknowledgement audience helper missing or exposed too broadly' as violation
where not exists (
  select 1
  from information_schema.routines
  where specific_schema = 'work_mode_security'
    and routine_name = 'publication_audience_allows'
)
or exists (
  select 1
  from information_schema.routine_privileges
  where specific_schema = 'work_mode_security'
    and routine_name = 'publication_audience_allows'
    and grantee in ('PUBLIC', 'anon')
);

select 'check-in policy missing worker permission or event identity scope' as violation
where not exists (
  select 1
  from pg_policies
  where schemaname = 'public'
    and tablename = 'work_mode_check_in_events'
    and policyname = 'work_mode_check_in_events_worker_insert'
    and cmd = 'INSERT'
    and roles @> array['authenticated']::name[]
    and with_check ilike '%assignment.status%'
    and with_check ilike '%confirmed%'
    and with_check ilike '%active%'
    and with_check ilike '%assignment.permissions%'
    and with_check ilike '%check_in_out%'
    and with_check ilike '%work_mode_check_in_events.event_id%'
    and with_check ilike '%coalesce(assignment.event_v2_id, assignment.event_id, shift.event_id)%'
);

select 'acknowledgement uniqueness constraints missing' as violation
where not exists (
  select 1
  from pg_constraint
  where conrelid = 'public.work_mode_publication_acknowledgements'::regclass
    and contype = 'u'
    and conname = 'work_mode_publication_ack_assignment_publication_key'
)
or not exists (
  select 1
  from pg_constraint
  where conrelid = 'public.work_mode_publication_acknowledgements'::regclass
    and contype = 'u'
    and conname = 'work_mode_publication_ack_user_request_key'
);

select 'check-in constraints missing' as violation
where not exists (
  select 1
  from pg_constraint
  where conrelid = 'public.work_mode_check_in_events'::regclass
    and contype = 'u'
    and conname = 'work_mode_check_in_user_request_key'
)
or not exists (
  select 1
  from pg_constraint
  where conrelid = 'public.work_mode_check_in_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%check_in%check_out%'
);

select 'audience helper must be security definer in work_mode_security' as violation
where not exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'work_mode_security'
    and p.proname = 'publication_audience_allows'
    and p.prosecdef
);

select 'DB-010 worker actions scope contract' as contract,
       exists (
         select 1
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = 'work_mode_publication_acknowledgements'
           and c.relrowsecurity
           and c.relforcerowsecurity
       )
       and exists (
         select 1
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = 'work_mode_check_in_events'
           and c.relrowsecurity
           and c.relforcerowsecurity
       ) as worker_actions_scope_ready;
