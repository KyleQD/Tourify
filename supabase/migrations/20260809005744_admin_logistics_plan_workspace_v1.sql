-- LOG-PLAN-001 — Tour-backed logistics plan workspace.
-- Expand-only. tours/tour_versions/tour_stops remain canonical; this migration
-- stores only logistics-owned operational state and tightens known broad policies.

insert into public.admin_feature_flag_definitions (
  key, display_name, purpose, owner, environments, safe_default,
  metrics_contract, rollback_instructions, expires_at, removal_issue
) values (
  'admin_logistics_plan_workspace_v1',
  'Logistics plan workspace',
  'Enable the tour-backed logistics plan workspace for a selected organization.',
  'Operations Platform',
  array['staging', 'pilot', 'production'],
  false,
  '{"adoption":"workspace_request_rate","errors":"workspace_error_rate","readiness":"readiness_blocker_count"}'::jsonb,
  'Disable the organization assignment; keep tour and logistics records unchanged and return operators to existing logistics tabs.',
  '2027-12-31T23:59:59Z'::timestamptz,
  'LOG-PLAN-001'
) on conflict (key) do nothing;

create table if not exists public.logistics_plan_state (
  tour_id uuid primary key references public.tours(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  hydrated_tour_version_id uuid references public.tour_versions(id) on delete set null,
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft', 'active', 'ready', 'published', 'archived')),
  operations_version integer not null default 1 check (operations_version > 0),
  hydrated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logistics_plan_state_org_tour_idx
  on public.logistics_plan_state (org_id, tour_id);

create table if not exists public.logistics_hydration_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete cascade,
  tour_version_id uuid references public.tour_versions(id) on delete set null,
  mode text not null check (mode in ('preview', 'apply', 'validate')),
  status text not null default 'completed' check (status in ('completed', 'partial', 'failed')),
  expected_operations_version integer,
  result_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(result_counts) = 'object'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists logistics_hydration_runs_org_tour_created_idx
  on public.logistics_hydration_runs (org_id, tour_id, created_at desc);

create table if not exists public.logistics_stop_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete cascade,
  tour_version_id uuid references public.tour_versions(id) on delete set null,
  tour_stop_id uuid not null references public.tour_stops(id) on delete cascade,
  event_id uuid references public.events_v2(id) on delete set null,
  field_key text not null check (length(btrim(field_key)) between 1 and 120),
  value jsonb not null,
  source_value jsonb,
  source_updated_at timestamptz,
  sync_status text not null default 'overridden'
    check (sync_status in ('synced', 'overridden', 'detached', 'conflict', 'suggested', 'source_missing')),
  last_hydration_run_id uuid references public.logistics_hydration_runs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tour_stop_id, field_key)
);

create index if not exists logistics_stop_overrides_org_tour_stop_idx
  on public.logistics_stop_overrides (org_id, tour_id, tour_stop_id);

create table if not exists public.logistics_issues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tour_id uuid not null references public.tours(id) on delete cascade,
  tour_version_id uuid references public.tour_versions(id) on delete set null,
  tour_stop_id uuid references public.tour_stops(id) on delete set null,
  event_id uuid references public.events_v2(id) on delete set null,
  code text not null check (length(btrim(code)) between 1 and 120),
  title text not null check (length(btrim(title)) between 1 and 240),
  detail text,
  severity text not null check (severity in ('info', 'warning', 'blocking')),
  status text not null default 'open' check (status in ('open', 'waived', 'resolved')),
  source_type text not null default 'validation',
  source_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logistics_issues_org_tour_status_idx
  on public.logistics_issues (org_id, tour_id, status, severity, created_at desc);
create index if not exists logistics_issues_org_stop_idx
  on public.logistics_issues (org_id, tour_stop_id) where status = 'open';

create or replace function public.touch_logistics_plan_workspace_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'logistics_plan_state' and tg_op = 'UPDATE' then
    new.operations_version := old.operations_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists logistics_plan_state_touch on public.logistics_plan_state;
create trigger logistics_plan_state_touch
  before update on public.logistics_plan_state
  for each row execute function public.touch_logistics_plan_workspace_row();

drop trigger if exists logistics_stop_overrides_touch on public.logistics_stop_overrides;
create trigger logistics_stop_overrides_touch
  before update on public.logistics_stop_overrides
  for each row execute function public.touch_logistics_plan_workspace_row();

drop trigger if exists logistics_issues_touch on public.logistics_issues;
create trigger logistics_issues_touch
  before update on public.logistics_issues
  for each row execute function public.touch_logistics_plan_workspace_row();

alter table public.logistics_plan_state enable row level security;
alter table public.logistics_plan_state force row level security;
alter table public.logistics_hydration_runs enable row level security;
alter table public.logistics_hydration_runs force row level security;
alter table public.logistics_stop_overrides enable row level security;
alter table public.logistics_stop_overrides force row level security;
alter table public.logistics_issues enable row level security;
alter table public.logistics_issues force row level security;

create policy logistics_plan_state_org_member on public.logistics_plan_state
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));
create policy logistics_hydration_runs_org_member on public.logistics_hydration_runs
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));
create policy logistics_stop_overrides_org_member on public.logistics_stop_overrides
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));
create policy logistics_issues_org_member on public.logistics_issues
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));

-- The previous logistics foundation used authenticated-wide policies. Retain
-- end-user acknowledgement access while making organization access explicit.
alter table if exists public.logistics_acknowledgements force row level security;
drop policy if exists logistics_acks_select_own_or_admin on public.logistics_acknowledgements;
drop policy if exists logistics_acks_insert_authenticated on public.logistics_acknowledgements;
drop policy if exists logistics_acks_update_own on public.logistics_acknowledgements;
create policy logistics_acks_org_member_or_subject on public.logistics_acknowledgements
  for all to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_org_member((select auth.uid()), org_id)
  )
  with check (
    user_id = (select auth.uid())
    or public.is_org_member((select auth.uid()), org_id)
  );

alter table if exists public.equipment_reservations force row level security;
drop policy if exists equipment_reservations_authenticated_all on public.equipment_reservations;
create policy equipment_reservations_org_member on public.equipment_reservations
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));

alter table if exists public.backline_requirements force row level security;
drop policy if exists backline_requirements_authenticated_all on public.backline_requirements;
create policy backline_requirements_org_member on public.backline_requirements
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));

alter table if exists public.backline_fulfillments force row level security;
drop policy if exists backline_fulfillments_authenticated_all on public.backline_fulfillments;
create policy backline_fulfillments_org_member on public.backline_fulfillments
  for all to authenticated
  using (exists (
    select 1 from public.backline_requirements requirement
    where requirement.id = requirement_id
      and public.is_org_member((select auth.uid()), requirement.org_id)
  ))
  with check (exists (
    select 1 from public.backline_requirements requirement
    where requirement.id = requirement_id
      and public.is_org_member((select auth.uid()), requirement.org_id)
  ));

alter table if exists public.backline_substitution_approvals force row level security;
drop policy if exists backline_subs_authenticated_all on public.backline_substitution_approvals;
create policy backline_substitution_approvals_org_member on public.backline_substitution_approvals
  for all to authenticated
  using (exists (
    select 1 from public.backline_requirements requirement
    where requirement.id = requirement_id
      and public.is_org_member((select auth.uid()), requirement.org_id)
  ))
  with check (exists (
    select 1 from public.backline_requirements requirement
    where requirement.id = requirement_id
      and public.is_org_member((select auth.uid()), requirement.org_id)
  ));

alter table if exists public.catering_services force row level security;
drop policy if exists catering_services_authenticated_all on public.catering_services;
create policy catering_services_org_member on public.catering_services
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));

alter table if exists public.catering_headcount_snapshots force row level security;
drop policy if exists catering_snapshots_authenticated_all on public.catering_headcount_snapshots;
create policy catering_headcount_snapshots_org_member on public.catering_headcount_snapshots
  for all to authenticated
  using (exists (
    select 1 from public.catering_services service
    where service.id = catering_service_id
      and public.is_org_member((select auth.uid()), service.org_id)
  ))
  with check (exists (
    select 1 from public.catering_services service
    where service.id = catering_service_id
      and public.is_org_member((select auth.uid()), service.org_id)
  ));

alter table if exists public.catering_dietary_summaries force row level security;
drop policy if exists catering_dietary_authenticated_all on public.catering_dietary_summaries;
create policy catering_dietary_summaries_org_member on public.catering_dietary_summaries
  for all to authenticated
  using (exists (
    select 1 from public.catering_services service
    where service.id = catering_service_id
      and public.is_org_member((select auth.uid()), service.org_id)
  ))
  with check (exists (
    select 1 from public.catering_services service
    where service.id = catering_service_id
      and public.is_org_member((select auth.uid()), service.org_id)
  ));

alter table if exists public.logistics_comms_plans force row level security;
drop policy if exists comms_plans_authenticated_all on public.logistics_comms_plans;
create policy logistics_comms_plans_org_member on public.logistics_comms_plans
  for all to authenticated
  using (public.is_org_member((select auth.uid()), org_id))
  with check (public.is_org_member((select auth.uid()), org_id));

alter table if exists public.logistics_comms_channels force row level security;
drop policy if exists comms_channels_authenticated_all on public.logistics_comms_channels;
create policy logistics_comms_channels_org_member on public.logistics_comms_channels
  for all to authenticated
  using (exists (
    select 1 from public.logistics_comms_plans plan
    where plan.id = plan_id
      and public.is_org_member((select auth.uid()), plan.org_id)
  ))
  with check (exists (
    select 1 from public.logistics_comms_plans plan
    where plan.id = plan_id
      and public.is_org_member((select auth.uid()), plan.org_id)
  ));
