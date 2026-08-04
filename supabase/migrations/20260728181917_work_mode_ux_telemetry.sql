-- Manual application only. Do not reset or restore the database.
-- Additive UX funnel evidence for P0 Work Mode flows.

set lock_timeout = '5s';
set statement_timeout = '60s';

create extension if not exists pgcrypto;

create table if not exists public.ux_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null
    check (event_name in (
      'viewed',
      'started',
      'validation_failed',
      'submitted',
      'succeeded',
      'failed',
      'recovered',
      'abandoned'
    )),
  flow text not null check (char_length(flow) between 2 and 80),
  route text not null check (char_length(route) between 1 and 200),
  step text check (step is null or char_length(step) between 1 and 80),
  source text check (source is null or char_length(source) between 1 and 80),
  latency_bucket text check (
    latency_bucket is null
    or latency_bucket in ('under_100ms', '100_300ms', '300_1000ms', 'over_1000ms')
  ),
  error_category text check (
    error_category is null
    or error_category in (
      'connection',
      'expired_session',
      'permission',
      'validation',
      'conflict',
      'rate_limit',
      'unavailable',
      'removed',
      'unknown'
    )
  ),
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists ux_telemetry_events_created_at_idx
  on public.ux_telemetry_events (created_at desc);

create index if not exists ux_telemetry_events_flow_event_idx
  on public.ux_telemetry_events (flow, event_name, created_at desc);

create index if not exists ux_telemetry_events_user_created_idx
  on public.ux_telemetry_events (user_id, created_at desc);

alter table public.ux_telemetry_events enable row level security;
alter table public.ux_telemetry_events force row level security;

revoke all on table public.ux_telemetry_events from anon, authenticated;
grant insert on table public.ux_telemetry_events to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ux_telemetry_events'
      and policyname = 'ux_telemetry_events_insert_own'
  ) then
    create policy ux_telemetry_events_insert_own
      on public.ux_telemetry_events
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;

comment on table public.ux_telemetry_events is
  'Non-sensitive UX funnel evidence. No client read/update/delete grants.';
