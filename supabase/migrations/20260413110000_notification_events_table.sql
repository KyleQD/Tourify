set client_min_messages = warning;

-- Notification events audit table for analytics (getMetrics, logNotificationEvent)
create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  event_type text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_events_notification_id
  on notification_events(notification_id);
create index if not exists idx_notification_events_user_id
  on notification_events(user_id, created_at desc);
create index if not exists idx_notification_events_event_type
  on notification_events(event_type);

alter table notification_events enable row level security;

drop policy if exists notification_events_select_own on notification_events;
create policy notification_events_select_own on notification_events
  for select using (user_id = auth.uid());

drop policy if exists notification_events_insert_service on notification_events
  ;
create policy notification_events_insert_service on notification_events
  for insert with check (true);
