-- REFERENCE ONLY.
create table if not exists public.license_availability (
  id uuid primary key default gen_random_uuid(), asset_kind text not null, asset_id uuid not null,
  right_category text not null, authority_record_id uuid, version integer not null,
  territories text[] not null default '{}', permitted_uses jsonb not null default '[]', exclusions jsonb not null default '[]',
  status text not null default 'not_configured', valid_from timestamptz not null default now(), valid_until timestamptz,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.license_clearance_legs (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.license_requests(id),
  request_version integer not null, asset_kind text not null, asset_id uuid not null, right_category text not null,
  required_approvers jsonb not null, authority_snapshot jsonb not null, status text not null default 'pending', blockers jsonb not null default '[]'
);
create table if not exists public.license_quotes (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.license_requests(id),
  version integer not null, status text not null default 'draft', currency text not null, terms jsonb not null,
  valid_until timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(request_id,version)
);
create table if not exists public.license_approvals (
  id uuid primary key default gen_random_uuid(), clearance_leg_id uuid not null references public.license_clearance_legs(id),
  request_version integer not null, party_id uuid not null, authority_record_id uuid not null, decision text not null,
  conditions jsonb not null default '[]', decided_at timestamptz not null default now(), unique(clearance_leg_id,request_version,party_id)
);
create table if not exists public.license_agreements (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.license_requests(id), current_version integer not null default 1,
  status text not null default 'draft', effective_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
