-- LOG-101: Add/backfill org keys across logistics children (tasks, equipment,
-- catering, maps, notes, collaborators, comms). Expand-only. Never invent
-- org_id — inherit from parent; quarantine unresolved. Reuses SEC-105 quarantine.

-- ---------------------------------------------------------------------------
-- 1) Additive org_id columns
-- ---------------------------------------------------------------------------
alter table if exists public.logistics_task_equipment
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.logistics_activity
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.catering_headcount_snapshots
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.catering_dietary_summaries
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.backline_fulfillments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.backline_substitution_approvals
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.equipment_instances
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.equipment_setup_workflows
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.equipment_setup_tasks
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.site_map_elements
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.glamping_tents
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.site_map_collaborators
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.site_map_activity_log
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.map_layers
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.map_versions
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.map_measurements
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.map_task_assignments
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.map_issues
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.logistics_comms_channels
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Backfill from parents (never invent)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.logistics_task_equipment') is not null
     and to_regclass('public.logistics_tasks') is not null then
    update public.logistics_task_equipment c
    set org_id = t.org_id
    from public.logistics_tasks t
    where c.org_id is null and c.task_id = t.id and t.org_id is not null;
  end if;

  if to_regclass('public.logistics_activity') is not null
     and to_regclass('public.logistics_tasks') is not null then
    update public.logistics_activity c
    set org_id = t.org_id
    from public.logistics_tasks t
    where c.org_id is null and c.task_id = t.id and t.org_id is not null;
  end if;

  if to_regclass('public.catering_headcount_snapshots') is not null
     and to_regclass('public.catering_services') is not null then
    update public.catering_headcount_snapshots c
    set org_id = p.org_id
    from public.catering_services p
    where c.org_id is null and c.catering_service_id = p.id and p.org_id is not null;
  end if;

  if to_regclass('public.catering_dietary_summaries') is not null
     and to_regclass('public.catering_services') is not null then
    update public.catering_dietary_summaries c
    set org_id = p.org_id
    from public.catering_services p
    where c.org_id is null and c.catering_service_id = p.id and p.org_id is not null;
  end if;

  if to_regclass('public.backline_fulfillments') is not null
     and to_regclass('public.backline_requirements') is not null then
    update public.backline_fulfillments c
    set org_id = p.org_id
    from public.backline_requirements p
    where c.org_id is null and c.requirement_id = p.id and p.org_id is not null;
  end if;

  if to_regclass('public.backline_substitution_approvals') is not null
     and to_regclass('public.backline_requirements') is not null then
    update public.backline_substitution_approvals c
    set org_id = p.org_id
    from public.backline_requirements p
    where c.org_id is null and c.requirement_id = p.id and p.org_id is not null;
  end if;

  if to_regclass('public.equipment_instances') is not null
     and to_regclass('public.site_maps') is not null then
    update public.equipment_instances c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.equipment_setup_workflows') is not null
     and to_regclass('public.site_maps') is not null then
    update public.equipment_setup_workflows c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.equipment_setup_tasks') is not null
     and to_regclass('public.equipment_setup_workflows') is not null then
    update public.equipment_setup_tasks c
    set org_id = w.org_id
    from public.equipment_setup_workflows w
    where c.org_id is null and c.workflow_id = w.id and w.org_id is not null;
  end if;

  if to_regclass('public.site_map_elements') is not null
     and to_regclass('public.site_maps') is not null then
    update public.site_map_elements c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.glamping_tents') is not null
     and to_regclass('public.site_maps') is not null then
    update public.glamping_tents c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.site_map_collaborators') is not null
     and to_regclass('public.site_maps') is not null then
    update public.site_map_collaborators c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.site_map_activity_log') is not null
     and to_regclass('public.site_maps') is not null then
    update public.site_map_activity_log c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.map_layers') is not null
     and to_regclass('public.site_maps') is not null then
    update public.map_layers c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.map_versions') is not null
     and to_regclass('public.site_maps') is not null then
    update public.map_versions c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.map_measurements') is not null
     and to_regclass('public.site_maps') is not null then
    update public.map_measurements c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.map_task_assignments') is not null
     and to_regclass('public.site_maps') is not null then
    update public.map_task_assignments c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.map_issues') is not null
     and to_regclass('public.site_maps') is not null then
    update public.map_issues c
    set org_id = m.org_id
    from public.site_maps m
    where c.org_id is null and c.site_map_id = m.id and m.org_id is not null;
  end if;

  if to_regclass('public.logistics_comms_channels') is not null
     and to_regclass('public.logistics_comms_plans') is not null then
    update public.logistics_comms_channels c
    set org_id = p.org_id
    from public.logistics_comms_plans p
    where c.org_id is null and c.plan_id = p.id and p.org_id is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Quarantine unresolved null org_id rows
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'logistics_task_equipment',
    'logistics_activity',
    'catering_headcount_snapshots',
    'catering_dietary_summaries',
    'backline_fulfillments',
    'backline_substitution_approvals',
    'equipment_instances',
    'equipment_setup_workflows',
    'equipment_setup_tasks',
    'site_map_elements',
    'glamping_tents',
    'site_map_collaborators',
    'site_map_activity_log',
    'map_layers',
    'map_versions',
    'map_measurements',
    'map_task_assignments',
    'map_issues',
    'logistics_comms_channels',
    'catering_services',
    'backline_requirements',
    'equipment_reservations',
    'logistics_comms_plans',
    'logistics_tasks',
    'site_maps'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'org_id'
    ) then
      continue;
    end if;
    execute format(
      $sql$
        insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
        select %L, id, 'unresolvable_org_id_after_parent_backfill'
        from public.%I
        where org_id is null
        on conflict (table_name, record_id) do nothing
      $sql$,
      t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Restrictive null-org deny + indexes
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'logistics_task_equipment',
    'logistics_activity',
    'catering_headcount_snapshots',
    'catering_dietary_summaries',
    'backline_fulfillments',
    'backline_substitution_approvals',
    'equipment_instances',
    'equipment_setup_workflows',
    'equipment_setup_tasks',
    'site_map_elements',
    'glamping_tents',
    'site_map_collaborators',
    'site_map_activity_log',
    'map_layers',
    'map_versions',
    'map_measurements',
    'map_task_assignments',
    'map_issues',
    'logistics_comms_channels',
    'catering_services',
    'backline_requirements',
    'equipment_reservations',
    'logistics_comms_plans'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'org_id'
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists log101_require_org_id on public.%I', t);
    execute format(
      'create policy log101_require_org_id on public.%I as restrictive for all to authenticated using (org_id is not null) with check (org_id is not null)',
      t
    );
    execute format(
      'create index if not exists idx_%s_org_id on public.%I (org_id) where org_id is not null',
      t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Verification RPC
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_logistics_org_keys()
returns table (
  table_name text,
  total_rows bigint,
  keyed_rows bigint,
  null_org_rows bigint,
  quarantine_open bigint,
  parent_mismatch_rows bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
begin
  return query
  with checks as (
    select 'logistics_task_equipment'::text as table_name,
      (select count(*) from public.logistics_task_equipment) as total_rows,
      (select count(*) from public.logistics_task_equipment where org_id is not null) as keyed_rows,
      (select count(*) from public.logistics_task_equipment where org_id is null) as null_org_rows,
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'logistics_task_equipment' and q.resolved_at is null) as quarantine_open,
      (select count(*) from public.logistics_task_equipment c
        join public.logistics_tasks t on t.id = c.task_id
        where c.org_id is not null and t.org_id is not null and c.org_id is distinct from t.org_id) as parent_mismatch_rows
    where to_regclass('public.logistics_task_equipment') is not null

    union all
    select 'logistics_activity',
      (select count(*) from public.logistics_activity),
      (select count(*) from public.logistics_activity where org_id is not null),
      (select count(*) from public.logistics_activity where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'logistics_activity' and q.resolved_at is null),
      (select count(*) from public.logistics_activity c
        join public.logistics_tasks t on t.id = c.task_id
        where c.org_id is not null and t.org_id is not null and c.org_id is distinct from t.org_id)
    where to_regclass('public.logistics_activity') is not null

    union all
    select 'catering_headcount_snapshots',
      (select count(*) from public.catering_headcount_snapshots),
      (select count(*) from public.catering_headcount_snapshots where org_id is not null),
      (select count(*) from public.catering_headcount_snapshots where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'catering_headcount_snapshots' and q.resolved_at is null),
      (select count(*) from public.catering_headcount_snapshots c
        join public.catering_services p on p.id = c.catering_service_id
        where c.org_id is not null and p.org_id is not null and c.org_id is distinct from p.org_id)
    where to_regclass('public.catering_headcount_snapshots') is not null

    union all
    select 'site_map_collaborators',
      (select count(*) from public.site_map_collaborators),
      (select count(*) from public.site_map_collaborators where org_id is not null),
      (select count(*) from public.site_map_collaborators where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'site_map_collaborators' and q.resolved_at is null),
      (select count(*) from public.site_map_collaborators c
        join public.site_maps m on m.id = c.site_map_id
        where c.org_id is not null and m.org_id is not null and c.org_id is distinct from m.org_id)
    where to_regclass('public.site_map_collaborators') is not null

    union all
    select 'site_map_activity_log',
      (select count(*) from public.site_map_activity_log),
      (select count(*) from public.site_map_activity_log where org_id is not null),
      (select count(*) from public.site_map_activity_log where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'site_map_activity_log' and q.resolved_at is null),
      (select count(*) from public.site_map_activity_log c
        join public.site_maps m on m.id = c.site_map_id
        where c.org_id is not null and m.org_id is not null and c.org_id is distinct from m.org_id)
    where to_regclass('public.site_map_activity_log') is not null

    union all
    select 'map_layers',
      (select count(*) from public.map_layers),
      (select count(*) from public.map_layers where org_id is not null),
      (select count(*) from public.map_layers where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'map_layers' and q.resolved_at is null),
      (select count(*) from public.map_layers c
        join public.site_maps m on m.id = c.site_map_id
        where c.org_id is not null and m.org_id is not null and c.org_id is distinct from m.org_id)
    where to_regclass('public.map_layers') is not null

    union all
    select 'logistics_comms_channels',
      (select count(*) from public.logistics_comms_channels),
      (select count(*) from public.logistics_comms_channels where org_id is not null),
      (select count(*) from public.logistics_comms_channels where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'logistics_comms_channels' and q.resolved_at is null),
      (select count(*) from public.logistics_comms_channels c
        join public.logistics_comms_plans p on p.id = c.plan_id
        where c.org_id is not null and p.org_id is not null and c.org_id is distinct from p.org_id)
    where to_regclass('public.logistics_comms_channels') is not null

    union all
    select 'backline_fulfillments',
      (select count(*) from public.backline_fulfillments),
      (select count(*) from public.backline_fulfillments where org_id is not null),
      (select count(*) from public.backline_fulfillments where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'backline_fulfillments' and q.resolved_at is null),
      (select count(*) from public.backline_fulfillments c
        join public.backline_requirements p on p.id = c.requirement_id
        where c.org_id is not null and p.org_id is not null and c.org_id is distinct from p.org_id)
    where to_regclass('public.backline_fulfillments') is not null

    union all
    select 'logistics_tasks',
      (select count(*) from public.logistics_tasks),
      (select count(*) from public.logistics_tasks where org_id is not null),
      (select count(*) from public.logistics_tasks where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'logistics_tasks' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.logistics_tasks') is not null

    union all
    select 'site_maps',
      (select count(*) from public.site_maps),
      (select count(*) from public.site_maps where org_id is not null),
      (select count(*) from public.site_maps where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'site_maps' and q.resolved_at is null),
      0::bigint
    where to_regclass('public.site_maps') is not null
  )
  select c.table_name, c.total_rows, c.keyed_rows, c.null_org_rows, c.quarantine_open, c.parent_mismatch_rows
  from checks c;
end;
$$;

revoke all on function public.admin_verify_logistics_org_keys() from public;
grant execute on function public.admin_verify_logistics_org_keys() to service_role;

comment on function public.admin_verify_logistics_org_keys() is
  'LOG-101 verification: per-table keyed/null/quarantine counts and parent org mismatches.';
