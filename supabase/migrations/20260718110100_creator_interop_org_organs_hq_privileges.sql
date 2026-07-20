-- Phase 15: organs, decisions, headquarters, privilege schedules.

begin;

create table if not exists public.creator_interop_org_organs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.creator_interop_org_organizations(id) on delete cascade,
  organ_type text not null,
  charter_version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'active', 'suspended', 'retired'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_decisions (
  id uuid primary key default gen_random_uuid(),
  organ_id uuid references public.creator_interop_org_organs(id) on delete set null,
  organization_id uuid references public.creator_interop_org_organizations(id) on delete set null,
  decision_type text not null,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'approved', 'rejected', 'blocked', 'withdrawn'
  )),
  result jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  source_manifest_id uuid,
  idempotency_key text not null unique,
  effective_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_headquarters_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.creator_interop_org_organizations(id) on delete cascade,
  host_jurisdiction text not null,
  status text not null default 'draft' check (status in (
    'draft', 'negotiating', 'executed', 'effective', 'expired', 'terminated'
  )),
  agreement_hash text not null,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_privilege_schedules (
  id uuid primary key default gen_random_uuid(),
  headquarters_agreement_id uuid not null references public.creator_interop_org_headquarters_agreements(id) on delete cascade,
  beneficiary_class text not null,
  functional_scope text not null,
  territory text not null,
  waiver_authority text not null,
  alternative_remedy text not null,
  status text not null default 'not_applicable' check (status in (
    'not_applicable', 'draft', 'effective', 'waived', 'suspended', 'revoked'
  )),
  created_at timestamptz not null default now()
);

alter table public.creator_interop_org_organs enable row level security;
alter table public.creator_interop_org_decisions enable row level security;
alter table public.creator_interop_org_headquarters_agreements enable row level security;
alter table public.creator_interop_org_privilege_schedules enable row level security;

revoke all on
  public.creator_interop_org_organs,
  public.creator_interop_org_decisions,
  public.creator_interop_org_headquarters_agreements,
  public.creator_interop_org_privilege_schedules
from anon, authenticated;

grant select on public.creator_interop_org_organs to authenticated;
grant select on public.creator_interop_org_decisions to authenticated;
grant select on public.creator_interop_org_headquarters_agreements to authenticated;
grant select on public.creator_interop_org_privilege_schedules to authenticated;

grant all on
  public.creator_interop_org_organs,
  public.creator_interop_org_decisions,
  public.creator_interop_org_headquarters_agreements,
  public.creator_interop_org_privilege_schedules
to service_role;

drop policy if exists p15_organs_read on public.creator_interop_org_organs;
create policy p15_organs_read on public.creator_interop_org_organs for select to authenticated using (true);
drop policy if exists p15_org_decisions_read on public.creator_interop_org_decisions;
create policy p15_org_decisions_read on public.creator_interop_org_decisions for select to authenticated using (true);
drop policy if exists p15_hq_read on public.creator_interop_org_headquarters_agreements;
create policy p15_hq_read on public.creator_interop_org_headquarters_agreements for select to authenticated using (true);
drop policy if exists p15_privileges_read on public.creator_interop_org_privilege_schedules;
create policy p15_privileges_read on public.creator_interop_org_privilege_schedules for select to authenticated using (true);

drop policy if exists p15_organs_service on public.creator_interop_org_organs;
create policy p15_organs_service on public.creator_interop_org_organs for all to service_role using (true) with check (true);
drop policy if exists p15_org_decisions_service on public.creator_interop_org_decisions;
create policy p15_org_decisions_service on public.creator_interop_org_decisions for all to service_role using (true) with check (true);
drop policy if exists p15_hq_service on public.creator_interop_org_headquarters_agreements;
create policy p15_hq_service on public.creator_interop_org_headquarters_agreements for all to service_role using (true) with check (true);
drop policy if exists p15_privileges_service on public.creator_interop_org_privilege_schedules;
create policy p15_privileges_service on public.creator_interop_org_privilege_schedules for all to service_role using (true) with check (true);

commit;
