-- Phase 13 S3–S5: reserved powers, amendments, decisions, review cases.

begin;

create table if not exists public.creator_protocol_reserved_powers (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  organization_id uuid not null,
  power_key text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  version text not null default '1.0.0',
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (constitution_id, organization_id, power_key, version)
);

create table if not exists public.creator_protocol_amendments (
  id uuid primary key default gen_random_uuid(),
  constitution_id uuid not null references public.creator_protocol_constitutions(id) on delete cascade,
  amendment_class text not null check (amendment_class in (
    'fundamental', 'charter', 'breaking_protocol', 'operational', 'emergency', 'editorial'
  )),
  title text not null,
  proposal_manifest_id uuid,
  status text not null default 'draft' check (status in (
    'draft', 'comment', 'objection', 'review', 'approved', 'rejected', 'withdrawn', 'blocked'
  )),
  policy_version text not null default '1.0.0',
  idempotency_key text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_decisions (
  id uuid primary key default gen_random_uuid(),
  amendment_id uuid references public.creator_protocol_amendments(id) on delete set null,
  decision_type text not null,
  eligible_snapshot jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in (
    'open', 'quorum_failed', 'approved', 'rejected', 'vetoed', 'blocked'
  )),
  decided_at timestamptz,
  audit_event_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_protocol_review_cases (
  id uuid primary key default gen_random_uuid(),
  challenged_decision_id uuid references public.creator_protocol_decisions(id) on delete set null,
  filer_user_id uuid references auth.users(id) on delete set null,
  filer_party_id uuid,
  status text not null default 'filed' check (status in (
    'filed', 'screening', 'accepted', 'panel_appointed', 'briefing',
    'hearing', 'decided', 'remedy_pending', 'closed', 'dismissed'
  )),
  requested_relief jsonb not null default '[]'::jsonb,
  confidentiality text not null default 'public' check (confidentiality in ('public', 'restricted')),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_protocol_reserved_powers enable row level security;
alter table public.creator_protocol_amendments enable row level security;
alter table public.creator_protocol_decisions enable row level security;
alter table public.creator_protocol_review_cases enable row level security;

revoke all on
  public.creator_protocol_reserved_powers,
  public.creator_protocol_amendments,
  public.creator_protocol_decisions,
  public.creator_protocol_review_cases
from anon, authenticated;

grant select on public.creator_protocol_reserved_powers to authenticated;
grant select, insert on public.creator_protocol_amendments to authenticated;
grant select on public.creator_protocol_decisions to authenticated;
grant select, insert on public.creator_protocol_review_cases to authenticated;

grant all on
  public.creator_protocol_reserved_powers,
  public.creator_protocol_amendments,
  public.creator_protocol_decisions,
  public.creator_protocol_review_cases
to service_role;

drop policy if exists cpc_powers_read on public.creator_protocol_reserved_powers;
create policy cpc_powers_read on public.creator_protocol_reserved_powers for select to authenticated using (true);
drop policy if exists cpc_amendments_read on public.creator_protocol_amendments;
create policy cpc_amendments_read on public.creator_protocol_amendments for select to authenticated using (true);
drop policy if exists cpc_amendments_insert on public.creator_protocol_amendments;
create policy cpc_amendments_insert on public.creator_protocol_amendments
for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists cpc_decisions_read on public.creator_protocol_decisions;
create policy cpc_decisions_read on public.creator_protocol_decisions for select to authenticated using (true);
drop policy if exists cpc_review_read on public.creator_protocol_review_cases;
create policy cpc_review_read on public.creator_protocol_review_cases for select to authenticated using (true);
drop policy if exists cpc_review_insert on public.creator_protocol_review_cases;
create policy cpc_review_insert on public.creator_protocol_review_cases
for insert to authenticated with check (filer_user_id = (select auth.uid()));

drop policy if exists cpc_powers_service on public.creator_protocol_reserved_powers;
create policy cpc_powers_service on public.creator_protocol_reserved_powers for all to service_role using (true) with check (true);
drop policy if exists cpc_amendments_service on public.creator_protocol_amendments;
create policy cpc_amendments_service on public.creator_protocol_amendments for all to service_role using (true) with check (true);
drop policy if exists cpc_decisions_service on public.creator_protocol_decisions;
create policy cpc_decisions_service on public.creator_protocol_decisions for all to service_role using (true) with check (true);
drop policy if exists cpc_review_service on public.creator_protocol_review_cases;
create policy cpc_review_service on public.creator_protocol_review_cases for all to service_role using (true) with check (true);

comment on table public.creator_protocol_amendments is 'Sandbox amendments; fundamental class cannot pass without separate ratification package.';

commit;
