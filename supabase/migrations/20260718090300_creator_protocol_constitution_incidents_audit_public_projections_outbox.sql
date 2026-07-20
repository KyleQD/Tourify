-- Phase 13 S11–S13: incidents, public projections, audit, outbox, evidence bucket.

begin;

create table if not exists public.creator_protocol_incidents (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid references public.creator_protocol_constitutions(id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  incident_type text not null,
  status text not null default 'open' check (status in (
    'open', 'mitigating', 'resolved', 'postmortem'
  )),
  public_summary text,
  declared_at timestamptz not null default now(),
  expires_at timestamptz,
  policy_version text not null default '1.0.0'
);

create table if not exists public.creator_protocol_public_projections (
  id uuid primary key default gen_random_uuid(),
  projection_type text not null,
  source_type text not null,
  source_id uuid not null,
  source_version text not null,
  public_payload jsonb not null default '{}'::jsonb,
  disputed boolean not null default false,
  suspended boolean not null default false,
  revoked boolean not null default false,
  fresh_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_type text not null default 'user',
  actor_id uuid references auth.users(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'delivered', 'failed', 'dead'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists creator_protocol_outbox_pending_idx
  on public.creator_protocol_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'constitution-evidence',
  'constitution-evidence',
  false,
  52428800,
  array['application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg']
)
on conflict (id) do update set public = false;

alter table public.creator_protocol_incidents enable row level security;
alter table public.creator_protocol_public_projections enable row level security;
alter table public.creator_protocol_audit_events enable row level security;
alter table public.creator_protocol_outbox enable row level security;

revoke all on
  public.creator_protocol_incidents,
  public.creator_protocol_public_projections,
  public.creator_protocol_audit_events,
  public.creator_protocol_outbox
from anon, authenticated;

grant select on public.creator_protocol_incidents to authenticated;
grant select on public.creator_protocol_public_projections to authenticated;
grant select, insert on public.creator_protocol_audit_events to authenticated;

grant all on
  public.creator_protocol_incidents,
  public.creator_protocol_public_projections,
  public.creator_protocol_audit_events,
  public.creator_protocol_outbox
to service_role;

drop policy if exists cpc_incidents_read on public.creator_protocol_incidents;
create policy cpc_incidents_read on public.creator_protocol_incidents
for select to authenticated using (public_summary is not null);

drop policy if exists cpc_projections_read on public.creator_protocol_public_projections;
create policy cpc_projections_read on public.creator_protocol_public_projections
for select to authenticated using (not revoked);

drop policy if exists cpc_audit_insert on public.creator_protocol_audit_events;
create policy cpc_audit_insert on public.creator_protocol_audit_events
for insert to authenticated with check (actor_id = (select auth.uid()));

drop policy if exists cpc_audit_read on public.creator_protocol_audit_events;
create policy cpc_audit_read on public.creator_protocol_audit_events
for select to authenticated using (actor_id = (select auth.uid()));

drop policy if exists cpc_incidents_service on public.creator_protocol_incidents;
create policy cpc_incidents_service on public.creator_protocol_incidents for all to service_role using (true) with check (true);
drop policy if exists cpc_projections_service on public.creator_protocol_public_projections;
create policy cpc_projections_service on public.creator_protocol_public_projections for all to service_role using (true) with check (true);
drop policy if exists cpc_audit_service on public.creator_protocol_audit_events;
create policy cpc_audit_service on public.creator_protocol_audit_events for all to service_role using (true) with check (true);
drop policy if exists cpc_outbox_service on public.creator_protocol_outbox;
create policy cpc_outbox_service on public.creator_protocol_outbox for all to service_role using (true) with check (true);

comment on table public.creator_protocol_public_projections is 'Approved minimal projections only; never query confidential Phase 1–12 operational tables.';

commit;
