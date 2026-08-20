-- Phase 6 S9/S11: conflicts, partners, audit, AI policies, mandates.

begin;

create table if not exists public.music_license_conflicts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.music_license_requests(id) on delete set null,
  asset_kind text,
  asset_id uuid,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  conflict_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in (
    'open', 'investigating', 'resolved', 'escalated', 'closed'
  )),
  restricted_details jsonb not null default '{}'::jsonb,
  opened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.music_licensing_partner_events (
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

create table if not exists public.music_licensing_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  prior_version integer,
  new_version integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_licensing_ai_policies (
  id uuid primary key default gen_random_uuid(),
  artist_music_id uuid not null references public.artist_music(id) on delete cascade,
  opted_in boolean not null default false,
  permitted_purposes text[] not null default '{}',
  permits_voice_model boolean not null default false,
  permits_dataset_redistribution boolean not null default false,
  requires_output_attribution boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_music_id)
);

create table if not exists public.music_licensing_mandates (
  id uuid primary key default gen_random_uuid(),
  party_kind text not null check (party_kind in (
    'publisher', 'label', 'cmo', 'pro', 'artist', 'administrator', 'other'
  )),
  party_name text not null,
  authority_scope jsonb not null default '{}'::jsonb,
  territories text[] not null default '{}',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  status text not null default 'draft' check (status in (
    'draft', 'active', 'suspended', 'expired', 'revoked'
  )),
  written_mandate_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_licensing_shortlists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_licensing_projects(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  notes text,
  availability_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.music_license_conflicts enable row level security;
alter table public.music_licensing_partner_events enable row level security;
alter table public.music_licensing_audit_events enable row level security;
alter table public.music_licensing_ai_policies enable row level security;
alter table public.music_licensing_mandates enable row level security;
alter table public.music_licensing_shortlists enable row level security;

revoke all on
  public.music_license_conflicts,
  public.music_licensing_partner_events,
  public.music_licensing_audit_events,
  public.music_licensing_ai_policies,
  public.music_licensing_mandates,
  public.music_licensing_shortlists
from anon, authenticated;

grant select on public.music_license_conflicts to authenticated;
grant select, insert, update on public.music_licensing_ai_policies to authenticated;
grant select on public.music_licensing_mandates to authenticated;
grant select, insert, delete on public.music_licensing_shortlists to authenticated;

grant all on
  public.music_license_conflicts,
  public.music_licensing_partner_events,
  public.music_licensing_audit_events,
  public.music_licensing_ai_policies,
  public.music_licensing_mandates,
  public.music_licensing_shortlists
to service_role;

drop policy if exists ml_conflicts_access on public.music_license_conflicts;
create policy ml_conflicts_access on public.music_license_conflicts
for select to authenticated using (
  opened_by = (select auth.uid())
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
);

drop policy if exists ml_ai_policy_access on public.music_licensing_ai_policies;
create policy ml_ai_policy_access on public.music_licensing_ai_policies
for all to authenticated using (exists (
  select 1 from public.artist_music am
  where am.id = artist_music_id and am.user_id = (select auth.uid())
)) with check (created_by = (select auth.uid()));

drop policy if exists ml_mandates_read on public.music_licensing_mandates;
create policy ml_mandates_read on public.music_licensing_mandates
for select to authenticated using (status = 'active');

drop policy if exists ml_shortlists_access on public.music_licensing_shortlists;
create policy ml_shortlists_access on public.music_licensing_shortlists
for all to authenticated using (exists (
  select 1 from public.music_licensing_projects p
  where p.id = project_id and (
    p.created_by = (select auth.uid())
    or exists (
      select 1 from public.music_licensing_project_members m
      where m.project_id = p.id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  )
)) with check (created_by = (select auth.uid()));

drop policy if exists ml_conflicts_service on public.music_license_conflicts;
create policy ml_conflicts_service on public.music_license_conflicts for all to service_role using (true) with check (true);
drop policy if exists ml_partner_events_service on public.music_licensing_partner_events;
create policy ml_partner_events_service on public.music_licensing_partner_events for all to service_role using (true) with check (true);
drop policy if exists ml_audit_service on public.music_licensing_audit_events;
create policy ml_audit_service on public.music_licensing_audit_events for all to service_role using (true) with check (true);
drop policy if exists ml_ai_service on public.music_licensing_ai_policies;
create policy ml_ai_service on public.music_licensing_ai_policies for all to service_role using (true) with check (true);
drop policy if exists ml_mandates_service on public.music_licensing_mandates;
create policy ml_mandates_service on public.music_licensing_mandates for all to service_role using (true) with check (true);
drop policy if exists ml_shortlists_service on public.music_licensing_shortlists;
create policy ml_shortlists_service on public.music_licensing_shortlists for all to service_role using (true) with check (true);

comment on table public.music_licensing_ai_policies is 'AI licensing requires explicit opt-in; never bundled into ordinary license terms.';
comment on table public.music_licensing_mandates is 'Written mandates required before Tourify-mediated grants; Tourify is not a CMO/PRO.';

commit;
