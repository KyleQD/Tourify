-- Phase 12 S9–S12: governance, incidents, audit, outbox, evidence bucket.

begin;

create table if not exists public.creator_commons_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id) on delete cascade,
  decision_kind text not null,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'approved', 'rejected', 'blocked', 'withdrawn'
  )),
  authority_scope jsonb not null default '{}'::jsonb,
  evidence_manifest_id uuid,
  policy_version text not null default '1.0.0',
  effective_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_kind text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in (
    'open', 'mitigating', 'resolved', 'postmortem'
  )),
  affected_scopes jsonb not null default '[]'::jsonb,
  public_summary text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.creator_commons_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_service text,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_outbox (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
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

create index if not exists creator_commons_outbox_pending_idx
  on public.creator_commons_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commons-evidence',
  'commons-evidence',
  false,
  52428800,
  array['application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg']
)
on conflict (id) do update set public = false;

alter table public.creator_commons_governance_decisions enable row level security;
alter table public.creator_commons_incidents enable row level security;
alter table public.creator_commons_audit_events enable row level security;
alter table public.creator_commons_outbox enable row level security;

revoke all on
  public.creator_commons_governance_decisions,
  public.creator_commons_incidents,
  public.creator_commons_audit_events,
  public.creator_commons_outbox
from anon, authenticated;

grant select on public.creator_commons_governance_decisions to authenticated;
grant select on public.creator_commons_incidents to authenticated;
grant select, insert on public.creator_commons_audit_events to authenticated;

grant all on
  public.creator_commons_governance_decisions,
  public.creator_commons_incidents,
  public.creator_commons_audit_events,
  public.creator_commons_outbox
to service_role;

drop policy if exists cc_gov_read on public.creator_commons_governance_decisions;
create policy cc_gov_read on public.creator_commons_governance_decisions for select to authenticated using (true);

drop policy if exists cc_incidents_read on public.creator_commons_incidents;
create policy cc_incidents_read on public.creator_commons_incidents
for select to authenticated using (public_summary is not null);

drop policy if exists cc_audit_insert on public.creator_commons_audit_events;
create policy cc_audit_insert on public.creator_commons_audit_events
for insert to authenticated with check (actor_user_id = (select auth.uid()));

drop policy if exists cc_audit_read on public.creator_commons_audit_events;
create policy cc_audit_read on public.creator_commons_audit_events
for select to authenticated using (actor_user_id = (select auth.uid()));

drop policy if exists cc_gov_service on public.creator_commons_governance_decisions;
create policy cc_gov_service on public.creator_commons_governance_decisions for all to service_role using (true) with check (true);
drop policy if exists cc_incidents_service on public.creator_commons_incidents;
create policy cc_incidents_service on public.creator_commons_incidents for all to service_role using (true) with check (true);
drop policy if exists cc_audit_service on public.creator_commons_audit_events;
create policy cc_audit_service on public.creator_commons_audit_events for all to service_role using (true) with check (true);
drop policy if exists cc_outbox_service on public.creator_commons_outbox;
create policy cc_outbox_service on public.creator_commons_outbox for all to service_role using (true) with check (true);

comment on table public.creator_commons_outbox is 'Participation withdrawal and transition intents; worker is no-op when flags off.';

commit;
