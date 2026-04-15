set client_min_messages = warning;

-- Incidents logging
create extension if not exists pgcrypto;

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  severity text not null check (severity in ('info','minor','major','critical')) default 'info',
  title text not null,
  notes text,
  reported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_incidents_event_created on incidents(event_id, created_at desc);

alter table incidents enable row level security;

drop policy if exists incidents_select on incidents;
create policy incidents_select on incidents for select using (public.is_org_member(auth.uid(), org_id));

drop policy if exists incidents_cud on incidents;
create policy incidents_cud on incidents for all using (public.has_perm(auth.uid(), org_id, 'event.manage'))
  with check (public.has_perm(auth.uid(), org_id, 'event.manage'));


