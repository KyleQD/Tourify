-- Phase 18: archives, fixity, custody, migrations, restore, operators, dissolution plans.

begin;

create table if not exists public.creator_treaty_renewal_archive_packages (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete set null,
  package_key text not null unique,
  content_hash text not null,
  provenance jsonb not null default '{}'::jsonb,
  retention_class text not null default 'restricted',
  access_purpose text,
  status text not null default 'draft' check (status in (
    'draft', 'packaged', 'verified', 'transferred', 'retired', 'failed'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_fixity_checks (
  id uuid primary key default gen_random_uuid(),
  archive_package_id uuid not null references public.creator_treaty_renewal_archive_packages(id) on delete cascade,
  expected_hash text not null,
  observed_hash text,
  passed boolean not null default false,
  checked_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_custody_transfers (
  id uuid primary key default gen_random_uuid(),
  archive_package_id uuid not null references public.creator_treaty_renewal_archive_packages(id) on delete cascade,
  from_custodian text not null,
  to_custodian text not null,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'completed', 'rejected'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_restore_exercises (
  id uuid primary key default gen_random_uuid(),
  archive_package_id uuid references public.creator_treaty_renewal_archive_packages(id) on delete set null,
  status text not null default 'planned' check (status in (
    'planned', 'running', 'passed', 'failed'
  )),
  tourify_unavailable boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_operator_successions (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  predecessor_operator text not null,
  successor_operator text not null,
  status text not null default 'draft' check (status in (
    'draft', 'drilled', 'approved', 'effective', 'rejected'
  )),
  continuity_tested boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_dissolution_plans (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  status text not null default 'rehearsal' check (status in (
    'rehearsal', 'draft', 'approved', 'blocked', 'executed'
  )),
  creator_rights_affected boolean not null default false,
  asset_lock_active boolean not null default true,
  public_notice_complete boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_treaty_renewal_archive_packages enable row level security;
alter table public.creator_treaty_renewal_fixity_checks enable row level security;
alter table public.creator_treaty_renewal_custody_transfers enable row level security;
alter table public.creator_treaty_renewal_restore_exercises enable row level security;
alter table public.creator_treaty_renewal_operator_successions enable row level security;
alter table public.creator_treaty_renewal_dissolution_plans enable row level security;

revoke all on
  public.creator_treaty_renewal_archive_packages,
  public.creator_treaty_renewal_fixity_checks,
  public.creator_treaty_renewal_custody_transfers,
  public.creator_treaty_renewal_restore_exercises,
  public.creator_treaty_renewal_operator_successions,
  public.creator_treaty_renewal_dissolution_plans
from anon, authenticated;

grant select on public.creator_treaty_renewal_archive_packages to authenticated;
grant select on public.creator_treaty_renewal_fixity_checks to authenticated;
grant select on public.creator_treaty_renewal_custody_transfers to authenticated;
grant select on public.creator_treaty_renewal_restore_exercises to authenticated;
grant select on public.creator_treaty_renewal_operator_successions to authenticated;
grant select on public.creator_treaty_renewal_dissolution_plans to authenticated;

grant all on
  public.creator_treaty_renewal_archive_packages,
  public.creator_treaty_renewal_fixity_checks,
  public.creator_treaty_renewal_custody_transfers,
  public.creator_treaty_renewal_restore_exercises,
  public.creator_treaty_renewal_operator_successions,
  public.creator_treaty_renewal_dissolution_plans
to service_role;

drop policy if exists p18_archives_read on public.creator_treaty_renewal_archive_packages;
create policy p18_archives_read on public.creator_treaty_renewal_archive_packages for select to authenticated using (true);
drop policy if exists p18_fixity_read on public.creator_treaty_renewal_fixity_checks;
create policy p18_fixity_read on public.creator_treaty_renewal_fixity_checks for select to authenticated using (true);
drop policy if exists p18_custody_read on public.creator_treaty_renewal_custody_transfers;
create policy p18_custody_read on public.creator_treaty_renewal_custody_transfers for select to authenticated using (true);
drop policy if exists p18_restore_read on public.creator_treaty_renewal_restore_exercises;
create policy p18_restore_read on public.creator_treaty_renewal_restore_exercises for select to authenticated using (true);
drop policy if exists p18_opsucc_read on public.creator_treaty_renewal_operator_successions;
create policy p18_opsucc_read on public.creator_treaty_renewal_operator_successions for select to authenticated using (true);
drop policy if exists p18_dissolution_read on public.creator_treaty_renewal_dissolution_plans;
create policy p18_dissolution_read on public.creator_treaty_renewal_dissolution_plans for select to authenticated using (true);

drop policy if exists p18_archives_service on public.creator_treaty_renewal_archive_packages;
create policy p18_archives_service on public.creator_treaty_renewal_archive_packages for all to service_role using (true) with check (true);
drop policy if exists p18_fixity_service on public.creator_treaty_renewal_fixity_checks;
create policy p18_fixity_service on public.creator_treaty_renewal_fixity_checks for all to service_role using (true) with check (true);
drop policy if exists p18_custody_service on public.creator_treaty_renewal_custody_transfers;
create policy p18_custody_service on public.creator_treaty_renewal_custody_transfers for all to service_role using (true) with check (true);
drop policy if exists p18_restore_service on public.creator_treaty_renewal_restore_exercises;
create policy p18_restore_service on public.creator_treaty_renewal_restore_exercises for all to service_role using (true) with check (true);
drop policy if exists p18_opsucc_service on public.creator_treaty_renewal_operator_successions;
create policy p18_opsucc_service on public.creator_treaty_renewal_operator_successions for all to service_role using (true) with check (true);
drop policy if exists p18_dissolution_service on public.creator_treaty_renewal_dissolution_plans;
create policy p18_dissolution_service on public.creator_treaty_renewal_dissolution_plans for all to service_role using (true) with check (true);

commit;
