-- Phase 20: deposits, custodians, preservation packages, custody links.

begin;

create table if not exists public.creator_memory_deposits (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references public.creator_memory_trusts(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  depositor_authority_id uuid,
  purposes jsonb not null default '[]'::jsonb,
  access_class text not null default 'mediated',
  restrictions jsonb not null default '{}'::jsonb,
  state text not null default 'draft',
  compulsory boolean not null default false,
  source_manifest_id uuid,
  policy_version text not null default '1.0.0',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_custodians (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid not null references public.creator_memory_trusts(id) on delete cascade,
  legal_name text not null,
  jurisdiction text not null,
  qualification_state text not null default 'under_review',
  independence_evidence jsonb not null default '{}'::jsonb,
  last_restore_test_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_preservation_packages (
  id uuid primary key default gen_random_uuid(),
  deposit_id uuid not null references public.creator_memory_deposits(id) on delete cascade,
  profile_version text not null,
  package_manifest jsonb not null default '{}'::jsonb,
  manifest_digest text not null,
  state text not null default 'draft',
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_package_custody (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.creator_memory_preservation_packages(id) on delete cascade,
  custodian_id uuid not null references public.creator_memory_custodians(id) on delete cascade,
  custody_state text not null default 'proposed',
  accepted_manifest_digest text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(package_id, custodian_id)
);

create table if not exists public.creator_memory_fixity_events (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.creator_memory_preservation_packages(id) on delete cascade,
  expected_digest text not null,
  observed_digest text,
  passed boolean not null default false,
  checked_at timestamptz not null default now()
);

create table if not exists public.creator_memory_restore_exercises (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.creator_memory_preservation_packages(id) on delete set null,
  custodian_id uuid references public.creator_memory_custodians(id) on delete set null,
  status text not null default 'planned',
  tourify_unavailable boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.creator_memory_deposits enable row level security;
alter table public.creator_memory_custodians enable row level security;
alter table public.creator_memory_preservation_packages enable row level security;
alter table public.creator_memory_package_custody enable row level security;
alter table public.creator_memory_fixity_events enable row level security;
alter table public.creator_memory_restore_exercises enable row level security;

revoke all on
  public.creator_memory_deposits,
  public.creator_memory_custodians,
  public.creator_memory_preservation_packages,
  public.creator_memory_package_custody,
  public.creator_memory_fixity_events,
  public.creator_memory_restore_exercises
from anon, authenticated;

grant select on public.creator_memory_deposits to authenticated;
grant select on public.creator_memory_custodians to authenticated;
grant select on public.creator_memory_preservation_packages to authenticated;
grant select on public.creator_memory_package_custody to authenticated;
grant select on public.creator_memory_fixity_events to authenticated;
grant select on public.creator_memory_restore_exercises to authenticated;

grant all on
  public.creator_memory_deposits,
  public.creator_memory_custodians,
  public.creator_memory_preservation_packages,
  public.creator_memory_package_custody,
  public.creator_memory_fixity_events,
  public.creator_memory_restore_exercises
to service_role;

drop policy if exists p20_deposits_read on public.creator_memory_deposits;
create policy p20_deposits_read on public.creator_memory_deposits for select to authenticated using (true);
drop policy if exists p20_custodians_read on public.creator_memory_custodians;
create policy p20_custodians_read on public.creator_memory_custodians for select to authenticated using (true);
drop policy if exists p20_packages_read on public.creator_memory_preservation_packages;
create policy p20_packages_read on public.creator_memory_preservation_packages for select to authenticated using (true);
drop policy if exists p20_custody_read on public.creator_memory_package_custody;
create policy p20_custody_read on public.creator_memory_package_custody for select to authenticated using (true);
drop policy if exists p20_fixity_read on public.creator_memory_fixity_events;
create policy p20_fixity_read on public.creator_memory_fixity_events for select to authenticated using (true);
drop policy if exists p20_restore_read on public.creator_memory_restore_exercises;
create policy p20_restore_read on public.creator_memory_restore_exercises for select to authenticated using (true);

drop policy if exists p20_deposits_service on public.creator_memory_deposits;
create policy p20_deposits_service on public.creator_memory_deposits for all to service_role using (true) with check (true);
drop policy if exists p20_custodians_service on public.creator_memory_custodians;
create policy p20_custodians_service on public.creator_memory_custodians for all to service_role using (true) with check (true);
drop policy if exists p20_packages_service on public.creator_memory_preservation_packages;
create policy p20_packages_service on public.creator_memory_preservation_packages for all to service_role using (true) with check (true);
drop policy if exists p20_custody_service on public.creator_memory_package_custody;
create policy p20_custody_service on public.creator_memory_package_custody for all to service_role using (true) with check (true);
drop policy if exists p20_fixity_service on public.creator_memory_fixity_events;
create policy p20_fixity_service on public.creator_memory_fixity_events for all to service_role using (true) with check (true);
drop policy if exists p20_restore_service on public.creator_memory_restore_exercises;
create policy p20_restore_service on public.creator_memory_restore_exercises for all to service_role using (true) with check (true);

commit;
