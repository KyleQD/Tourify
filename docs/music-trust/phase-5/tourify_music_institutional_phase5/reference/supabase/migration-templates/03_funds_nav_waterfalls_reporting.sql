-- REFERENCE ONLY. Official fund administration/accounting remains external.

create table if not exists public.institutional_fund_vehicles (
  id uuid primary key default gen_random_uuid(),
  sponsor_organization_id uuid references public.institutional_organizations(id),
  legal_name text not null,
  vehicle_type text not null,
  status text not null default 'planning',
  administrator_provider_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_capital_commitments (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.institutional_fund_vehicles(id),
  investor_organization_id uuid not null references public.institutional_organizations(id),
  amount_minor bigint not null,
  currency text not null,
  status text not null,
  official_provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_nav_periods (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.institutional_fund_vehicles(id),
  valuation_date date not null,
  version integer not null,
  status text not null default 'draft',
  total_nav_minor bigint,
  currency text,
  administrator_reference text,
  created_at timestamptz not null default now(),
  unique (fund_vehicle_id, valuation_date, version)
);

create table if not exists public.institutional_distribution_records (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.institutional_fund_vehicles(id),
  distribution_date date not null,
  amount_minor bigint not null,
  currency text not null,
  status text not null,
  official_provider_reference text,
  created_at timestamptz not null default now()
);
