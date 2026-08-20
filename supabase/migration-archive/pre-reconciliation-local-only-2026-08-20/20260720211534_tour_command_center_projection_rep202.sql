-- REP-202: Event-driven tour command-center summary projection
-- Expand-only: projections, per-source watermarks, applied-event idempotency.

create table if not exists public.tour_command_center_summary_projections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  contract_version integer not null default 1,
  revision bigint not null default 1,
  access_class text not null default 'capability_projection',
  contract jsonb not null default '{}'::jsonb,
  last_outbox_id uuid null,
  last_event_type text null,
  last_correlation_id text null,
  rebuilt_at timestamptz null,
  projected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, tour_id)
);

create index if not exists idx_tour_cc_summary_proj_org_projected
  on public.tour_command_center_summary_projections (org_id, projected_at desc);

create index if not exists idx_tour_cc_summary_proj_tour
  on public.tour_command_center_summary_projections (tour_id);

create table if not exists public.tour_command_center_source_watermarks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  source_key text not null,
  watermark_at timestamptz not null,
  source_version text null,
  last_outbox_id uuid null,
  updated_at timestamptz not null default now(),
  unique (org_id, tour_id, source_key)
);

create index if not exists idx_tour_cc_watermarks_org_tour
  on public.tour_command_center_source_watermarks (org_id, tour_id);

create table if not exists public.tour_command_center_projection_applied_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  outbox_id uuid not null,
  idempotency_key text not null,
  event_type text not null,
  source_key text not null,
  applied_at timestamptz not null default now(),
  unique (org_id, outbox_id),
  unique (org_id, idempotency_key)
);

create index if not exists idx_tour_cc_applied_events_tour_applied
  on public.tour_command_center_projection_applied_events (tour_id, applied_at desc);

alter table public.tour_command_center_summary_projections enable row level security;
alter table public.tour_command_center_source_watermarks enable row level security;
alter table public.tour_command_center_projection_applied_events enable row level security;

revoke all on public.tour_command_center_summary_projections from anon;
revoke all on public.tour_command_center_source_watermarks from anon;
revoke all on public.tour_command_center_projection_applied_events from anon;

grant select on public.tour_command_center_summary_projections to authenticated;
grant select on public.tour_command_center_source_watermarks to authenticated;
grant select on public.tour_command_center_projection_applied_events to authenticated;

grant all on public.tour_command_center_summary_projections to service_role;
grant all on public.tour_command_center_source_watermarks to service_role;
grant all on public.tour_command_center_projection_applied_events to service_role;

drop policy if exists tour_cc_summary_proj_select_org on public.tour_command_center_summary_projections;
create policy tour_cc_summary_proj_select_org
  on public.tour_command_center_summary_projections
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = tour_command_center_summary_projections.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists tour_cc_watermarks_select_org on public.tour_command_center_source_watermarks;
create policy tour_cc_watermarks_select_org
  on public.tour_command_center_source_watermarks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = tour_command_center_source_watermarks.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists tour_cc_applied_events_select_org on public.tour_command_center_projection_applied_events;
create policy tour_cc_applied_events_select_org
  on public.tour_command_center_projection_applied_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = tour_command_center_projection_applied_events.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists tour_cc_summary_proj_service on public.tour_command_center_summary_projections;
create policy tour_cc_summary_proj_service
  on public.tour_command_center_summary_projections
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists tour_cc_watermarks_service on public.tour_command_center_source_watermarks;
create policy tour_cc_watermarks_service
  on public.tour_command_center_source_watermarks
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists tour_cc_applied_events_service on public.tour_command_center_projection_applied_events;
create policy tour_cc_applied_events_service
  on public.tour_command_center_projection_applied_events
  for all
  to service_role
  using (true)
  with check (true);
