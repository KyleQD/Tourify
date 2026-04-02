create extension if not exists pgcrypto;

create table if not exists hiring_audit_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  job_id uuid,
  venue_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_status text not null,
  to_status text not null,
  title text,
  content text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hiring_audit_events_application on hiring_audit_events(application_id, created_at desc);
create index if not exists idx_hiring_audit_events_actor on hiring_audit_events(actor_user_id, created_at desc);
create index if not exists idx_hiring_audit_events_venue on hiring_audit_events(venue_id, created_at desc);

alter table hiring_audit_events enable row level security;

drop policy if exists hiring_audit_events_read on hiring_audit_events;
create policy hiring_audit_events_read
  on hiring_audit_events
  for select
  using (auth.role() = 'authenticated');

drop policy if exists hiring_audit_events_insert on hiring_audit_events;
create policy hiring_audit_events_insert
  on hiring_audit_events
  for insert
  with check (auth.role() = 'authenticated');
