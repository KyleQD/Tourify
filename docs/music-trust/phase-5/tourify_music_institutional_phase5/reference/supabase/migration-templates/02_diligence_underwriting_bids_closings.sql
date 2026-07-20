-- REFERENCE ONLY. Do not apply before auditing Phase 2–4 identifiers and policies.

create table if not exists public.institutional_diligence_requests (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.institutional_transaction_cases(id),
  requester_organization_id uuid not null references public.institutional_organizations(id),
  status text not null default 'open',
  severity text not null default 'normal',
  request_text text not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_underwriting_cases (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.institutional_transaction_cases(id),
  buyer_organization_id uuid not null references public.institutional_organizations(id),
  version integer not null,
  snapshot_id uuid not null,
  status text not null default 'draft',
  model_version text,
  created_at timestamptz not null default now(),
  unique (transaction_case_id, buyer_organization_id, version)
);

create table if not exists public.institutional_bids (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.institutional_transaction_cases(id),
  bidder_organization_id uuid not null references public.institutional_organizations(id),
  version integer not null,
  amount_minor bigint,
  currency text,
  status text not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (transaction_case_id, bidder_organization_id, version)
);

create table if not exists public.institutional_transaction_closings (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.institutional_transaction_cases(id),
  status text not null default 'pending',
  effective_at timestamptz,
  official_provider_reference text,
  created_at timestamptz not null default now()
);
