-- Phase 17: relationship reviews, public-service obligations, capacity fund, host/privilege reviews.

begin;

create table if not exists public.creator_treaty_ops_relationship_agreement_reviews (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  counterparty_ref text not null,
  relationship_type text not null,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'proposed', 'approved', 'effective', 'suspended', 'terminated'
  )),
  scope jsonb not null default '{}'::jsonb,
  approved_claims text[] not null default '{}',
  claims_un_affiliation boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_public_service_obligations (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  service_key text not null,
  status text not null default 'sandbox' check (status in (
    'sandbox', 'defined', 'proposed', 'approved', 'active', 'suspended', 'retired'
  )),
  mandate_ref text,
  appropriation_ref text,
  accessibility_approved boolean not null default false,
  continuity_tested boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(operation_cycle_id, service_key)
);

create table if not exists public.creator_treaty_ops_capacity_fund_replenishments (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  period_label text not null,
  currency text not null default 'USD',
  target_minor bigint not null default 0,
  received_minor bigint not null default 0,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'closed', 'blocked'
  )),
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_host_privilege_reviews (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  host_jurisdiction text not null,
  status text not null default 'not_applicable' check (status in (
    'not_applicable', 'draft', 'review', 'approved', 'effective', 'suspended', 'revoked'
  )),
  privilege_scope text,
  waiver_authority text,
  alternative_remedy text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_treaty_ops_relationship_agreement_reviews enable row level security;
alter table public.creator_treaty_ops_public_service_obligations enable row level security;
alter table public.creator_treaty_ops_capacity_fund_replenishments enable row level security;
alter table public.creator_treaty_ops_host_privilege_reviews enable row level security;

revoke all on
  public.creator_treaty_ops_relationship_agreement_reviews,
  public.creator_treaty_ops_public_service_obligations,
  public.creator_treaty_ops_capacity_fund_replenishments,
  public.creator_treaty_ops_host_privilege_reviews
from anon, authenticated;

grant select on public.creator_treaty_ops_relationship_agreement_reviews to authenticated;
grant select on public.creator_treaty_ops_public_service_obligations to authenticated;
grant select on public.creator_treaty_ops_capacity_fund_replenishments to authenticated;
grant select on public.creator_treaty_ops_host_privilege_reviews to authenticated;

grant all on
  public.creator_treaty_ops_relationship_agreement_reviews,
  public.creator_treaty_ops_public_service_obligations,
  public.creator_treaty_ops_capacity_fund_replenishments,
  public.creator_treaty_ops_host_privilege_reviews
to service_role;

drop policy if exists p17_rel_reviews_read on public.creator_treaty_ops_relationship_agreement_reviews;
create policy p17_rel_reviews_read on public.creator_treaty_ops_relationship_agreement_reviews for select to authenticated using (true);
drop policy if exists p17_pso_read on public.creator_treaty_ops_public_service_obligations;
create policy p17_pso_read on public.creator_treaty_ops_public_service_obligations for select to authenticated using (true);
drop policy if exists p17_fund_read on public.creator_treaty_ops_capacity_fund_replenishments;
create policy p17_fund_read on public.creator_treaty_ops_capacity_fund_replenishments for select to authenticated using (true);
drop policy if exists p17_host_priv_read on public.creator_treaty_ops_host_privilege_reviews;
create policy p17_host_priv_read on public.creator_treaty_ops_host_privilege_reviews for select to authenticated using (true);

drop policy if exists p17_rel_reviews_service on public.creator_treaty_ops_relationship_agreement_reviews;
create policy p17_rel_reviews_service on public.creator_treaty_ops_relationship_agreement_reviews for all to service_role using (true) with check (true);
drop policy if exists p17_pso_service on public.creator_treaty_ops_public_service_obligations;
create policy p17_pso_service on public.creator_treaty_ops_public_service_obligations for all to service_role using (true) with check (true);
drop policy if exists p17_fund_service on public.creator_treaty_ops_capacity_fund_replenishments;
create policy p17_fund_service on public.creator_treaty_ops_capacity_fund_replenishments for all to service_role using (true) with check (true);
drop policy if exists p17_host_priv_service on public.creator_treaty_ops_host_privilege_reviews;
create policy p17_host_priv_service on public.creator_treaty_ops_host_privilege_reviews for all to service_role using (true) with check (true);

commit;
