-- Phase 18: public projections, incidents, audit, outbox, evidence bucket.

begin;

create table if not exists public.creator_treaty_renewal_public_projections (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  purpose text not null,
  payload jsonb not null default '{}'::jsonb,
  source_version text not null,
  issuer text not null,
  jurisdiction text not null,
  fresh_at timestamptz not null default now(),
  disputed boolean not null default false,
  suspended boolean not null default false,
  revoked boolean not null default false,
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_incidents (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  incident_type text not null,
  status text not null default 'open' check (status in (
    'open', 'mitigating', 'resolved', 'postmortem'
  )),
  public_summary text,
  declared_at timestamptz not null default now(),
  policy_version text not null default '1.0.0'
);

create table if not exists public.creator_treaty_renewal_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_type text not null default 'user',
  actor_id uuid references auth.users(id) on delete set null,
  subject_type text not null,
  subject_id text,
  policy_version text not null default '1.0.0',
  schema_version text not null default '1',
  jurisdiction text,
  source_manifest_id uuid,
  payload jsonb not null default '{}'::jsonb,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
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

create index if not exists creator_treaty_renewal_outbox_pending_idx
  on public.creator_treaty_renewal_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'treaty-renewal-evidence',
  'treaty-renewal-evidence',
  false,
  52428800,
  array['application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg']
)
on conflict (id) do update set public = false;

alter table public.creator_treaty_renewal_public_projections enable row level security;
alter table public.creator_treaty_renewal_incidents enable row level security;
alter table public.creator_treaty_renewal_audit_events enable row level security;
alter table public.creator_treaty_renewal_outbox enable row level security;

revoke all on
  public.creator_treaty_renewal_public_projections,
  public.creator_treaty_renewal_incidents,
  public.creator_treaty_renewal_audit_events,
  public.creator_treaty_renewal_outbox
from anon, authenticated;

grant select on public.creator_treaty_renewal_public_projections to authenticated;
grant select on public.creator_treaty_renewal_incidents to authenticated;
grant select, insert on public.creator_treaty_renewal_audit_events to authenticated;

grant all on
  public.creator_treaty_renewal_public_projections,
  public.creator_treaty_renewal_incidents,
  public.creator_treaty_renewal_audit_events,
  public.creator_treaty_renewal_outbox
to service_role;

drop policy if exists p18_projections_read on public.creator_treaty_renewal_public_projections;
create policy p18_projections_read on public.creator_treaty_renewal_public_projections
for select to authenticated using (not revoked);
drop policy if exists p18_incidents_read on public.creator_treaty_renewal_incidents;
create policy p18_incidents_read on public.creator_treaty_renewal_incidents for select to authenticated using (true);
drop policy if exists p18_audit_read on public.creator_treaty_renewal_audit_events;
create policy p18_audit_read on public.creator_treaty_renewal_audit_events for select to authenticated using (true);
drop policy if exists p18_audit_insert on public.creator_treaty_renewal_audit_events;
create policy p18_audit_insert on public.creator_treaty_renewal_audit_events for insert to authenticated with check (actor_id = auth.uid());

drop policy if exists p18_projections_service on public.creator_treaty_renewal_public_projections;
create policy p18_projections_service on public.creator_treaty_renewal_public_projections for all to service_role using (true) with check (true);
drop policy if exists p18_incidents_service on public.creator_treaty_renewal_incidents;
create policy p18_incidents_service on public.creator_treaty_renewal_incidents for all to service_role using (true) with check (true);
drop policy if exists p18_audit_service on public.creator_treaty_renewal_audit_events;
create policy p18_audit_service on public.creator_treaty_renewal_audit_events for all to service_role using (true) with check (true);
drop policy if exists p18_outbox_service on public.creator_treaty_renewal_outbox;
create policy p18_outbox_service on public.creator_treaty_renewal_outbox for all to service_role using (true) with check (true);

commit;
