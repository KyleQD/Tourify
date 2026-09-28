-- Phase 16: budgets, contributions, programs, oversight.

begin;

create table if not exists public.creator_interop_institution_budgets (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  currency text not null default 'USD',
  approved_minor bigint not null default 0,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'closed', 'blocked'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_institution_contributions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.creator_interop_institution_budgets(id) on delete cascade,
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

create table if not exists public.creator_interop_institution_programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  program_key text not null,
  program_type text not null default 'capacity_building',
  status text not null default 'sandbox' check (status in (
    'sandbox', 'proposed', 'approved', 'active', 'suspended', 'closed'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(institution_id, program_key)
);

create table if not exists public.creator_interop_institution_oversight_cases (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  function_type text not null,
  case_type text not null,
  status text not null default 'open' check (status in (
    'open', 'investigating', 'remediated', 'closed', 'referred'
  )),
  restricted_payload jsonb not null default '{}'::jsonb,
  public_summary text,
  created_at timestamptz not null default now()
);

alter table public.creator_interop_institution_budgets enable row level security;
alter table public.creator_interop_institution_contributions enable row level security;
alter table public.creator_interop_institution_programs enable row level security;
alter table public.creator_interop_institution_oversight_cases enable row level security;

revoke all on
  public.creator_interop_institution_budgets,
  public.creator_interop_institution_contributions,
  public.creator_interop_institution_programs,
  public.creator_interop_institution_oversight_cases
from anon, authenticated;

grant select on public.creator_interop_institution_budgets to authenticated;
grant select on public.creator_interop_institution_contributions to authenticated;
grant select on public.creator_interop_institution_programs to authenticated;
grant select on public.creator_interop_institution_oversight_cases to authenticated;

grant all on
  public.creator_interop_institution_budgets,
  public.creator_interop_institution_contributions,
  public.creator_interop_institution_programs,
  public.creator_interop_institution_oversight_cases
to service_role;

drop policy if exists p16_budgets_read on public.creator_interop_institution_budgets;
create policy p16_budgets_read on public.creator_interop_institution_budgets for select to authenticated using (true);
drop policy if exists p16_contrib_read on public.creator_interop_institution_contributions;
create policy p16_contrib_read on public.creator_interop_institution_contributions for select to authenticated using (true);
drop policy if exists p16_programs_read on public.creator_interop_institution_programs;
create policy p16_programs_read on public.creator_interop_institution_programs for select to authenticated using (true);
drop policy if exists p16_oversight_read on public.creator_interop_institution_oversight_cases;
create policy p16_oversight_read on public.creator_interop_institution_oversight_cases for select to authenticated using (true);

drop policy if exists p16_budgets_service on public.creator_interop_institution_budgets;
create policy p16_budgets_service on public.creator_interop_institution_budgets for all to service_role using (true) with check (true);
drop policy if exists p16_contrib_service on public.creator_interop_institution_contributions;
create policy p16_contrib_service on public.creator_interop_institution_contributions for all to service_role using (true) with check (true);
drop policy if exists p16_programs_service on public.creator_interop_institution_programs;
create policy p16_programs_service on public.creator_interop_institution_programs for all to service_role using (true) with check (true);
drop policy if exists p16_oversight_service on public.creator_interop_institution_oversight_cases;
create policy p16_oversight_service on public.creator_interop_institution_oversight_cases for all to service_role using (true) with check (true);

commit;
