begin;

do $$
declare
  missing_columns text[];
  broad_policy_count integer;
begin
  select array_agg(required.column_name order by required.column_name)
  into missing_columns
  from (values
    ('tour_teams', 'team_type'),
    ('tour_teams', 'role'),
    ('tour_team_members', 'tour_id'),
    ('tour_team_members', 'profile'),
    ('tour_team_members', 'status'),
    ('tour_vendors', 'services'),
    ('tour_vendors', 'contract_amount'),
    ('tour_vendors', 'payment_status'),
    ('artist_jobs', 'tour_id'),
    ('artist_jobs', 'tour_name')
  ) as required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = required.table_name
      and column_info.column_name = required.column_name
  );

  if missing_columns is not null then
    raise exception 'Missing collaboration columns: %', missing_columns;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tour_team_members'::regclass
      and conname = 'tour_team_members_status_check'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tour_vendors'::regclass
      and conname = 'tour_vendors_status_check'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tour_vendors'::regclass
      and conname = 'tour_vendors_payment_status_check'
  ) then
    raise exception 'Collaboration lifecycle constraints are missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'tours'
      and indexname = 'idx_tours_calendar_token_unique'
  ) then
    raise exception 'Tour calendar tokens must be unique';
  end if;

  select count(*)
  into broad_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('tour_artists', 'tour_vendors', 'tour_teams', 'tour_team_members')
    and (coalesce(qual, '') ilike '%auth.role()%authenticated%'
      or coalesce(with_check, '') ilike '%auth.role()%authenticated%');

  if broad_policy_count > 0 then
    raise exception 'Found % broad authenticated collaboration policies', broad_policy_count;
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tour_artists') <> 4 then
    raise exception 'tour_artists must have exactly four capability policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tour_vendors') <> 4 then
    raise exception 'tour_vendors must have exactly four capability policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tour_teams') <> 4 then
    raise exception 'tour_teams must have exactly four capability policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tour_team_members') <> 4 then
    raise exception 'tour_team_members must have exactly four capability policies';
  end if;

  if has_table_privilege('anon', 'public.tour_artists', 'SELECT')
    or has_table_privilege('anon', 'public.tour_vendors', 'SELECT')
    or has_table_privilege('anon', 'public.tour_teams', 'SELECT')
    or has_table_privilege('anon', 'public.tour_team_members', 'SELECT') then
    raise exception 'anon retains collaboration table access';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'logistics_tasks') <> 4 then
    raise exception 'logistics_tasks must have exactly four capability policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'logistics_task_equipment') <> 2 then
    raise exception 'logistics_task_equipment must have exactly two capability policies';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'logistics_activity') <> 2 then
    raise exception 'logistics_activity must have exactly two capability policies';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('logistics_tasks', 'logistics_task_equipment', 'logistics_activity')
      and (coalesce(qual, '') ilike '%auth.role()%authenticated%'
        or coalesce(with_check, '') ilike '%auth.role()%authenticated%')
  ) then
    raise exception 'A broad authenticated logistics policy remains';
  end if;

  if has_table_privilege('anon', 'public.logistics_tasks', 'SELECT')
    or has_table_privilege('anon', 'public.logistics_task_equipment', 'SELECT')
    or has_table_privilege('anon', 'public.logistics_activity', 'SELECT') then
    raise exception 'anon retains logistics table access';
  end if;

  if has_function_privilege('anon', 'public.has_admin_logistics_scope(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege(
      'anon',
      'public.reserve_admin_logistics_equipment(uuid,uuid,uuid,timestamptz,timestamptz,integer,uuid)',
      'EXECUTE'
    ) then
    raise exception 'anon can execute an Admin logistics function';
  end if;
end;
$$;

rollback;
