create table if not exists staffing_alert_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  event_key text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  trigger_count integer not null default 1,
  last_triggered_at timestamptz not null default now(),
  last_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, event_key)
);

create index if not exists idx_staffing_alert_events_venue_time
  on staffing_alert_events(venue_id, last_triggered_at desc);

drop trigger if exists trg_staffing_alert_events_touch on staffing_alert_events;
create trigger trg_staffing_alert_events_touch
  before update on staffing_alert_events
  for each row execute function touch_updated_at();
