set client_min_messages = warning;

create table if not exists public.connect_telemetry_events (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  event_name text not null,
  connect_session_id uuid,
  platform text not null default 'unknown',
  session_id text,
  user_id_hash text,
  app_version text,
  os_version text,
  device_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_connect_telemetry_events_event_name
  on public.connect_telemetry_events (event_name);

create index if not exists idx_connect_telemetry_events_connect_session_id
  on public.connect_telemetry_events (connect_session_id);

create index if not exists idx_connect_telemetry_events_created_at
  on public.connect_telemetry_events (created_at desc);

alter table public.connect_telemetry_events enable row level security;

create policy "connect_telemetry_events_insert_authenticated"
  on public.connect_telemetry_events
  for insert
  with check (auth.role() = 'authenticated');
