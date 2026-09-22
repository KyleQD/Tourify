-- Phase 7 S9–S11: partners, deadlines, audit, outbox, storage.

begin;

create table if not exists public.music_rights_admin_partners (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  roles text[] not null default '{}',
  territories text[] not null default '{}',
  capabilities jsonb not null default '{}'::jsonb,
  status text not null default 'candidate' check (status in (
    'candidate', 'sandbox', 'selected', 'unresolved', 'disabled'
  )),
  config_secret_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete cascade,
  dmca_case_id uuid references public.music_dmca_cases(id) on delete cascade,
  deadline_type text not null,
  due_at timestamptz not null,
  source_rule_version text not null default '1',
  status text not null default 'open' check (status in (
    'open', 'met', 'missed', 'extended', 'cancelled'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_admin_audit_events (
  id bigint generated always as identity primary key,
  case_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_admin_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique not null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'delivered', 'failed', 'dead'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.music_rights_admin_partner_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in (
    'received', 'verified', 'processed', 'rejected', 'duplicate'
  )),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create index if not exists music_rights_admin_outbox_pending_idx
  on public.music_rights_admin_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('music-rights-admin-evidence', 'music-rights-admin-evidence', false, 104857600),
  ('music-rights-admin-legal', 'music-rights-admin-legal', false, 104857600),
  ('music-rights-admin-holds', 'music-rights-admin-holds', false, 104857600)
on conflict (id) do nothing;

alter table public.music_rights_admin_partners enable row level security;
alter table public.music_rights_deadlines enable row level security;
alter table public.music_rights_admin_audit_events enable row level security;
alter table public.music_rights_admin_outbox enable row level security;
alter table public.music_rights_admin_partner_events enable row level security;

revoke all on
  public.music_rights_admin_partners,
  public.music_rights_deadlines,
  public.music_rights_admin_audit_events,
  public.music_rights_admin_outbox,
  public.music_rights_admin_partner_events
from anon, authenticated;

grant select on public.music_rights_admin_partners to authenticated;
grant select on public.music_rights_deadlines to authenticated;

grant all on
  public.music_rights_admin_partners,
  public.music_rights_deadlines,
  public.music_rights_admin_audit_events,
  public.music_rights_admin_outbox,
  public.music_rights_admin_partner_events
to service_role;

drop policy if exists mra_partners_read on public.music_rights_admin_partners;
create policy mra_partners_read on public.music_rights_admin_partners
for select to authenticated using (status in ('sandbox', 'selected'));

drop policy if exists mra_deadlines_access on public.music_rights_deadlines;
create policy mra_deadlines_access on public.music_rights_deadlines
for select to authenticated using (
  exists (
    select 1 from public.music_rights_admin_cases c
    where c.id = case_id and c.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.music_dmca_cases d
    where d.id = dmca_case_id and d.owner_user_id = (select auth.uid())
  )
);

drop policy if exists mra_partners_service on public.music_rights_admin_partners;
create policy mra_partners_service on public.music_rights_admin_partners for all to service_role using (true) with check (true);
drop policy if exists mra_deadlines_service on public.music_rights_deadlines;
create policy mra_deadlines_service on public.music_rights_deadlines for all to service_role using (true) with check (true);
drop policy if exists mra_audit_service on public.music_rights_admin_audit_events;
create policy mra_audit_service on public.music_rights_admin_audit_events for all to service_role using (true) with check (true);
drop policy if exists mra_outbox_service on public.music_rights_admin_outbox;
create policy mra_outbox_service on public.music_rights_admin_outbox for all to service_role using (true) with check (true);
drop policy if exists mra_partner_events_service on public.music_rights_admin_partner_events;
create policy mra_partner_events_service on public.music_rights_admin_partner_events for all to service_role using (true) with check (true);

comment on table public.music_rights_admin_outbox is 'Idempotent partner submissions; kill switches stop new work without deleting evidence.';

commit;
