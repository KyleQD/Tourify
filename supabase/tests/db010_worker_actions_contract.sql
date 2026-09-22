-- DB-010 catalog postflight. Run after the reviewed migration on isolated
-- staging; transactional persona inserts are a separate release proof.
do $$
declare
  v_table text;
  v_insert_policy text;
begin
  foreach v_table in array array[
    'work_mode_publication_acknowledgements',
    'work_mode_check_in_events'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table
        and c.relrowsecurity and c.relforcerowsecurity
    ) then
      raise exception '% must have RLS and FORCE RLS', v_table;
    end if;
    if has_table_privilege('anon', 'public.' || v_table, 'select')
      or has_table_privilege('anon', 'public.' || v_table, 'insert')
      or has_table_privilege('authenticated', 'public.' || v_table, 'update')
      or has_table_privilege('authenticated', 'public.' || v_table, 'delete')
      or not has_table_privilege('authenticated', 'public.' || v_table, 'select')
      or not has_table_privilege('authenticated', 'public.' || v_table, 'insert')
    then
      raise exception '% grants violate append-only worker access', v_table;
    end if;
    if (select count(*) from pg_policies
        where schemaname = 'public' and tablename = v_table) <> 2 then
      raise exception '% must have exactly two reviewed policies', v_table;
    end if;
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = v_table
        and roles <> array['authenticated']::name[]
    ) then
      raise exception '% policy has an unexpected role', v_table;
    end if;
  end loop;

  select with_check into v_insert_policy from pg_policies
  where schemaname = 'public'
    and tablename = 'work_mode_publication_acknowledgements'
    and policyname = 'work_mode_publication_ack_worker_insert'
    and cmd = 'INSERT';
  if v_insert_policy is null
    or v_insert_policy not like '%publication.status = ''published''%'
    or v_insert_policy not like '%publication.tour_id%assignment.tour_id%'
    or v_insert_policy not like '%publication_audience_allows%'
    or v_insert_policy not like '%required_permission%'
  then
    raise exception 'acknowledgement scope policy is incomplete';
  end if;

  select with_check into v_insert_policy from pg_policies
  where schemaname = 'public'
    and tablename = 'work_mode_check_in_events'
    and policyname = 'work_mode_check_in_events_worker_insert'
    and cmd = 'INSERT';
  if v_insert_policy is null
    or v_insert_policy not like '%check_in_out%'
    or v_insert_policy not like '%event_v2_id%'
    or v_insert_policy not like '%shift.event_id%'
  then
    raise exception 'check-in scope policy is incomplete';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'work_mode_security'
      and p.proname = 'publication_audience_allows'
      and p.prosecdef
      and exists (
        select 1 from unnest(p.proconfig) setting
        where setting in ('search_path=', 'search_path=""')
      )
  ) then
    raise exception 'audience helper must be private, SECURITY DEFINER, and search-path pinned';
  end if;
  if has_function_privilege('anon', 'work_mode_security.publication_audience_allows(uuid)', 'execute')
    or has_schema_privilege('anon', 'work_mode_security', 'usage') then
    raise exception 'anonymous role must not reach the audience helper';
  end if;
end $$;

select 'db010_worker_actions_catalog_ready' as result;
