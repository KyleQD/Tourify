-- Phase 15: budgets, contributions, oversight, relationships.

begin;

create table if not exists public.creator_interop_org_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.creator_interop_org_organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  currency text not null default 'USD',
  approved_minor bigint not null default 0,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'closed', 'blocked'
  )),
  decision_id uuid references public.creator_interop_org_decisions(id) on delete set null,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_contributions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.creator_interop_org_budgets(id) on delete cascade,
  participant_external_ref text,
  contribution_type text not null check (contribution_type in (
    'assessed', 'voluntary', 'service_fee', 'in_kind'
  )),
  assessed_minor bigint,
  received_minor bigint not null default 0,
  restrictions jsonb not null default '{}'::jsonb,
  conflict_review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_oversight_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.creator_interop_org_organizations(id) on delete cascade,
  function_type text not null,
  case_type text not null,
  status text not null default 'open' check (status in (
    'open', 'investigating', 'remediated', 'closed', 'referred'
  )),
  restricted_payload jsonb not null default '{}'::jsonb,
  public_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_org_relationship_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.creator_interop_org_organizations(id) on delete cascade,
  counterparty_ref text not null,
  relationship_type text not null,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'active', 'suspended', 'terminated'
  )),
  claims_un_affiliation boolean not null default false,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_interop_org_budgets enable row level security;
alter table public.creator_interop_org_contributions enable row level security;
alter table public.creator_interop_org_oversight_cases enable row level security;
alter table public.creator_interop_org_relationship_agreements enable row level security;

revoke all on
  public.creator_interop_org_budgets,
  public.creator_interop_org_contributions,
  public.creator_interop_org_oversight_cases,
  public.creator_interop_org_relationship_agreements
from anon, authenticated;

grant select on public.creator_interop_org_budgets to authenticated;
grant select on public.creator_interop_org_contributions to authenticated;
grant select on public.creator_interop_org_oversight_cases to authenticated;
grant select on public.creator_interop_org_relationship_agreements to authenticated;

grant all on
  public.creator_interop_org_budgets,
  public.creator_interop_org_contributions,
  public.creator_interop_org_oversight_cases,
  public.creator_interop_org_relationship_agreements
to service_role;

drop policy if exists p15_budgets_read on public.creator_interop_org_budgets;
create policy p15_budgets_read on public.creator_interop_org_budgets for select to authenticated using (true);
drop policy if exists p15_contributions_read on public.creator_interop_org_contributions;
create policy p15_contributions_read on public.creator_interop_org_contributions for select to authenticated using (true);
drop policy if exists p15_oversight_read on public.creator_interop_org_oversight_cases;
create policy p15_oversight_read on public.creator_interop_org_oversight_cases for select to authenticated using (true);
drop policy if exists p15_relationships_read on public.creator_interop_org_relationship_agreements;
create policy p15_relationships_read on public.creator_interop_org_relationship_agreements for select to authenticated using (true);

drop policy if exists p15_budgets_service on public.creator_interop_org_budgets;
create policy p15_budgets_service on public.creator_interop_org_budgets for all to service_role using (true) with check (true);
drop policy if exists p15_contributions_service on public.creator_interop_org_contributions;
create policy p15_contributions_service on public.creator_interop_org_contributions for all to service_role using (true) with check (true);
drop policy if exists p15_oversight_service on public.creator_interop_org_oversight_cases;
create policy p15_oversight_service on public.creator_interop_org_oversight_cases for all to service_role using (true) with check (true);
drop policy if exists p15_relationships_service on public.creator_interop_org_relationship_agreements;
create policy p15_relationships_service on public.creator_interop_org_relationship_agreements for all to service_role using (true) with check (true);

commit;
