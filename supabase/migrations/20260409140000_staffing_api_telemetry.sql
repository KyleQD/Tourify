set client_min_messages = warning;

create table if not exists staffing_api_telemetry (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  request_id text not null,
  venue_id uuid,
  user_id uuid,
  status_code integer not null,
  latency_ms integer not null,
  data_source text,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_staffing_api_telemetry_created
  on staffing_api_telemetry(created_at desc);

create index if not exists idx_staffing_api_telemetry_venue_created
  on staffing_api_telemetry(venue_id, created_at desc);

create index if not exists idx_staffing_api_telemetry_endpoint_created
  on staffing_api_telemetry(endpoint, created_at desc);
