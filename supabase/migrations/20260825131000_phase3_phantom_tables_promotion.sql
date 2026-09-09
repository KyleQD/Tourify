-- PHASE 3 (ADM-M-010 / P1-07): create the phantom tables that application
-- code queries but which had no DDL in the active chain. Shipped org-scoped
-- and RLS-enabled from day one so they never become the next isolation debt.
--
-- Tables: contracts, vendor_contracts, admin_requests.
-- `tour_plan_quarantine` was already promoted by PLAN-201; this migration
-- deliberately reuses that canonical resolved_at-based contract instead of
-- introducing a second status model.
-- (`catering` is only referenced as an enum value in a CHECK constraint — no
-- table is created; code referencing a catering table uses logistics_tasks.)

set client_min_messages = warning;

create extension if not exists pgcrypto;

-- ============================================================================
-- contracts — W16 admin contracts workspace (api/admin/contracts)
-- ============================================================================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  counterparty text,
  status text not null default 'draft'
    check (status in ('draft','pending_signature','active','completed','terminated')),
  value numeric check (value >= 0),
  currency text not null default 'USD',
  start_date date,
  end_date date,
  obligations jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contracts_org on public.contracts(org_id);

alter table public.contracts enable row level security;
drop policy if exists contracts_org_member_all on public.contracts;
create policy contracts_org_member_all on public.contracts
  for all
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

-- ============================================================================
-- vendor_contracts — procurement linkage between vendors and contracts
-- ============================================================================
create table if not exists public.vendor_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  vendor_name text not null,
  service_category text,
  amount numeric check (amount >= 0),
  status text not null default 'active'
    check (status in ('draft','active','expired','cancelled')),
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_contracts_org on public.vendor_contracts(org_id);
create index if not exists idx_vendor_contracts_contract on public.vendor_contracts(contract_id);

alter table public.vendor_contracts enable row level security;
drop policy if exists vendor_contracts_org_member_all on public.vendor_contracts;
create policy vendor_contracts_org_member_all on public.vendor_contracts
  for all
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

-- ============================================================================
-- tour_plan_quarantine is not phantom in the active chain. PLAN-201 owns its
-- schema, open-state definition (`resolved_at is null`), indexes, and RLS.
-- Keeping one owner prevents incompatible status/open-state representations.
-- ============================================================================

-- ============================================================================
-- admin_requests — legacy self-service admin access request form
-- (/admin/request wrote here via anon client; table never existed).
-- Writes now go through authenticated RLS; the page itself is migrated to the
-- API layer in Phase 7. Rows are visible to platform admins only via
-- service-role reads; requester sees own row.
-- ============================================================================
create table if not exists public.admin_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null,
  contact_email text not null,
  justification text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_requests enable row level security;
drop policy if exists admin_requests_owner_insert on public.admin_requests;
drop policy if exists admin_requests_owner_select on public.admin_requests;
create policy admin_requests_owner_insert on public.admin_requests
  for insert to authenticated with check (auth.uid() = user_id);
create policy admin_requests_owner_select on public.admin_requests
  for select to authenticated using (auth.uid() = user_id);

-- ROLLBACK NOTE
-- ------------
-- drop table admin_requests, vendor_contracts, contracts cascade;
-- (tables are new; no pre-existing data can be lost)
