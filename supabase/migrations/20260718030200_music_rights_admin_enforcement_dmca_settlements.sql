-- Phase 7 S8–S9: enforcement observations, DMCA, disputes, settlements.

begin;

create table if not exists public.music_enforcement_observations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.music_rights_admin_cases(id) on delete set null,
  source_url text,
  capture_path text,
  capture_sha256 text,
  candidate_asset_id uuid references public.artist_music(id) on delete set null,
  confidence numeric,
  triage_status text not null default 'new' check (triage_status in (
    'new', 'manual_review', 'escalated', 'dismissed', 'linked_case', 'closed'
  )),
  human_reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_dmca_cases (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('inbound_sp', 'outbound_rightsholder')),
  notice_version jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in (
    'received', 'validated', 'actioned', 'counter_received', 'restored',
    'rejected', 'escalated', 'closed'
  )),
  material_locations jsonb not null default '[]'::jsonb,
  disabled_at timestamptz,
  counter_received_at timestamptz,
  restore_earliest_at timestamptz,
  restore_latest_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_rights_disputes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete set null,
  claim_id uuid references public.music_rights_claims(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  dispute_type text not null,
  status text not null default 'open' check (status in (
    'open', 'under_review', 'appealed', 'resolved', 'escalated_legal', 'closed'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_settlements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_rights_admin_cases(id) on delete cascade,
  agreement_version_id uuid,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'executed', 'paid', 'partially_paid', 'void', 'disputed'
  )),
  gross_minor bigint,
  currency text default 'USD',
  terms jsonb not null default '{}'::jsonb,
  phase3_handoff_id text,
  counsel_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_reversions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  contract_ref text,
  window_starts_at timestamptz,
  window_ends_at timestamptz,
  status text not null default 'monitoring' check (status in (
    'monitoring', 'notice_due', 'noticed', 'reverted', 'expired', 'closed'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.music_enforcement_observations enable row level security;
alter table public.music_dmca_cases enable row level security;
alter table public.music_rights_disputes enable row level security;
alter table public.music_rights_settlements enable row level security;
alter table public.music_rights_reversions enable row level security;

revoke all on
  public.music_enforcement_observations,
  public.music_dmca_cases,
  public.music_rights_disputes,
  public.music_rights_settlements,
  public.music_rights_reversions
from anon, authenticated;

grant select, insert, update on public.music_enforcement_observations to authenticated;
grant select, insert, update on public.music_dmca_cases to authenticated;
grant select, insert, update on public.music_rights_disputes to authenticated;
grant select, insert, update on public.music_rights_settlements to authenticated;
grant select, insert, update on public.music_rights_reversions to authenticated;

grant all on
  public.music_enforcement_observations,
  public.music_dmca_cases,
  public.music_rights_disputes,
  public.music_rights_settlements,
  public.music_rights_reversions
to service_role;

drop policy if exists mra_obs_access on public.music_enforcement_observations;
create policy mra_obs_access on public.music_enforcement_observations
for all to authenticated using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_dmca_access on public.music_dmca_cases;
create policy mra_dmca_access on public.music_dmca_cases
for all to authenticated using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_disputes_access on public.music_rights_disputes;
create policy mra_disputes_access on public.music_rights_disputes
for all to authenticated using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_settlements_access on public.music_rights_settlements;
create policy mra_settlements_access on public.music_rights_settlements
for all to authenticated using (exists (
  select 1 from public.music_rights_admin_cases c
  where c.id = case_id and c.owner_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mra_reversions_access on public.music_rights_reversions;
create policy mra_reversions_access on public.music_rights_reversions
for all to authenticated using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_obs_service on public.music_enforcement_observations;
create policy mra_obs_service on public.music_enforcement_observations for all to service_role using (true) with check (true);
drop policy if exists mra_dmca_service on public.music_dmca_cases;
create policy mra_dmca_service on public.music_dmca_cases for all to service_role using (true) with check (true);
drop policy if exists mra_disputes_service on public.music_rights_disputes;
create policy mra_disputes_service on public.music_rights_disputes for all to service_role using (true) with check (true);
drop policy if exists mra_settlements_service on public.music_rights_settlements;
create policy mra_settlements_service on public.music_rights_settlements for all to service_role using (true) with check (true);
drop policy if exists mra_reversions_service on public.music_rights_reversions;
create policy mra_reversions_service on public.music_rights_reversions for all to service_role using (true) with check (true);

comment on table public.music_dmca_cases is 'Inbound SP duties separate from outbound rightsholder enforcement.';
comment on table public.music_enforcement_observations is 'Confidence alone never authorizes takedown; human_reviewed required.';

commit;
