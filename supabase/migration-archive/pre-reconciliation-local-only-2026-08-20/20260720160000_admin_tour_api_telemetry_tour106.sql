-- TOUR-106: tour access / latency telemetry (expand-only)

create table if not exists public.admin_tour_api_telemetry (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  endpoint text not null,
  org_id uuid null,
  user_id uuid null,
  tour_id uuid null,
  status_code integer null,
  latency_ms integer null,
  correlation_id text null,
  is_legacy boolean not null default false,
  is_stale boolean not null default false,
  fanout_count integer null,
  error_code text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_tour_api_telemetry_created
  on public.admin_tour_api_telemetry (created_at desc);

create index if not exists idx_admin_tour_api_telemetry_event_created
  on public.admin_tour_api_telemetry (event_name, created_at desc);

create index if not exists idx_admin_tour_api_telemetry_org_created
  on public.admin_tour_api_telemetry (org_id, created_at desc)
  where org_id is not null;

alter table public.admin_tour_api_telemetry enable row level security;

drop policy if exists admin_tour_api_telemetry_select_org on public.admin_tour_api_telemetry;
create policy admin_tour_api_telemetry_select_org
  on public.admin_tour_api_telemetry
  for select
  to authenticated
  using (
    org_id is not null
    and exists (
      select 1
      from public.org_members m
      where m.org_id = admin_tour_api_telemetry.org_id
        and m.user_id = auth.uid()
    )
  );

-- Inserts are service-role / server observability only (no authenticated insert policy).

revoke all on public.admin_tour_api_telemetry from anon;
grant select on public.admin_tour_api_telemetry to authenticated;
