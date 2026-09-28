-- Phase 12 S6–S7 / S14: operators, conformance, funding, transition packages.

begin;

create table if not exists public.creator_commons_operators (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default '',
  legal_entity_party_id uuid,
  service_scopes jsonb not null default '[]'::jsonb,
  status text not null default 'applicant' check (status in (
    'applicant', 'diligence', 'accredited', 'suspended', 'retired', 'rejected'
  )),
  jurisdiction_profiles jsonb not null default '[]'::jsonb,
  conformance_expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_commons_conformance_results (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references public.creator_commons_operators(id) on delete set null,
  implementation_id text not null,
  profile_id text not null,
  profile_version text not null,
  status text not null check (status in (
    'queued', 'passed', 'failed', 'expired', 'blocked'
  )),
  evidence_manifest_id uuid,
  tested_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_commons_transition_packages (
  id uuid primary key default gen_random_uuid(),
  provider_party_id uuid,
  package_version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'escrow_pending', 'verified', 'released', 'blocked'
  )),
  manifest_hash text,
  escrow_verified_at timestamptz,
  release_conditions jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(provider_party_id, package_version)
);

create table if not exists public.creator_commons_funding_sources (
  id uuid primary key default gen_random_uuid(),
  steward_id uuid references public.creator_commons_stewards(id) on delete cascade,
  source_party_id uuid,
  source_label text not null default 'undisclosed',
  amount_minor bigint not null,
  currency text not null default 'USD',
  restricted boolean not null default false,
  related_party boolean not null default false,
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);

alter table public.creator_commons_operators enable row level security;
alter table public.creator_commons_conformance_results enable row level security;
alter table public.creator_commons_transition_packages enable row level security;
alter table public.creator_commons_funding_sources enable row level security;

revoke all on
  public.creator_commons_operators,
  public.creator_commons_conformance_results,
  public.creator_commons_transition_packages,
  public.creator_commons_funding_sources
from anon, authenticated;

grant select on public.creator_commons_operators to authenticated;
grant select on public.creator_commons_conformance_results to authenticated;
grant select on public.creator_commons_transition_packages to authenticated;
grant select on public.creator_commons_funding_sources to authenticated;

grant all on
  public.creator_commons_operators,
  public.creator_commons_conformance_results,
  public.creator_commons_transition_packages,
  public.creator_commons_funding_sources
to service_role;

drop policy if exists cc_operators_read on public.creator_commons_operators;
create policy cc_operators_read on public.creator_commons_operators for select to authenticated using (true);
drop policy if exists cc_conformance_read on public.creator_commons_conformance_results;
create policy cc_conformance_read on public.creator_commons_conformance_results for select to authenticated using (true);
drop policy if exists cc_transition_read on public.creator_commons_transition_packages;
create policy cc_transition_read on public.creator_commons_transition_packages for select to authenticated using (true);
drop policy if exists cc_funding_read on public.creator_commons_funding_sources;
create policy cc_funding_read on public.creator_commons_funding_sources for select to authenticated using (true);

drop policy if exists cc_operators_service on public.creator_commons_operators;
create policy cc_operators_service on public.creator_commons_operators for all to service_role using (true) with check (true);
drop policy if exists cc_conformance_service on public.creator_commons_conformance_results;
create policy cc_conformance_service on public.creator_commons_conformance_results for all to service_role using (true) with check (true);
drop policy if exists cc_transition_service on public.creator_commons_transition_packages;
create policy cc_transition_service on public.creator_commons_transition_packages for all to service_role using (true) with check (true);
drop policy if exists cc_funding_service on public.creator_commons_funding_sources;
create policy cc_funding_service on public.creator_commons_funding_sources for all to service_role using (true) with check (true);

comment on table public.creator_commons_transition_packages is 'Tourify-exit / escrow checklists; irreversible release blocked without counsel package.';

commit;
