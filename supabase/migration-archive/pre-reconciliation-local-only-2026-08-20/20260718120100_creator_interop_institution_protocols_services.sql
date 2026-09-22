-- Phase 16: protocols, relationship agreements, public-law service definitions.

begin;

create table if not exists public.creator_interop_institution_protocols (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  protocol_key text not null,
  lifecycle_state text not null default 'draft' check (lifecycle_state in (
    'draft', 'proposed', 'approved', 'sandbox', 'effective', 'suspended', 'terminated', 'superseded', 'rejected'
  )),
  version text not null default '0.1.0',
  content_hash text not null,
  policy_version text not null default '1.0.0',
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique(institution_id, protocol_key, version)
);

create table if not exists public.creator_interop_institution_relationship_agreements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  counterparty_ref text not null,
  relationship_type text not null,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'proposed', 'approved', 'effective', 'suspended', 'terminated'
  )),
  approved_claims text[] not null default '{}',
  claims_un_affiliation boolean not null default false,
  claims_specialized_agency boolean not null default false,
  effective_at timestamptz,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_institution_public_law_services (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.creator_interop_institution_institutions(id) on delete cascade,
  service_key text not null,
  display_name text not null,
  status text not null default 'sandbox' check (status in (
    'sandbox', 'defined', 'proposed', 'approved', 'effective', 'suspended', 'retired'
  )),
  legal_basis_ref text,
  jurisdiction_list text[] not null default '{}',
  definition jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(institution_id, service_key)
);

alter table public.creator_interop_institution_protocols enable row level security;
alter table public.creator_interop_institution_relationship_agreements enable row level security;
alter table public.creator_interop_institution_public_law_services enable row level security;

revoke all on
  public.creator_interop_institution_protocols,
  public.creator_interop_institution_relationship_agreements,
  public.creator_interop_institution_public_law_services
from anon, authenticated;

grant select on public.creator_interop_institution_protocols to authenticated;
grant select on public.creator_interop_institution_relationship_agreements to authenticated;
grant select on public.creator_interop_institution_public_law_services to authenticated;

grant all on
  public.creator_interop_institution_protocols,
  public.creator_interop_institution_relationship_agreements,
  public.creator_interop_institution_public_law_services
to service_role;

drop policy if exists p16_protocols_read on public.creator_interop_institution_protocols;
create policy p16_protocols_read on public.creator_interop_institution_protocols for select to authenticated using (true);
drop policy if exists p16_rel_read on public.creator_interop_institution_relationship_agreements;
create policy p16_rel_read on public.creator_interop_institution_relationship_agreements for select to authenticated using (true);
drop policy if exists p16_services_read on public.creator_interop_institution_public_law_services;
create policy p16_services_read on public.creator_interop_institution_public_law_services for select to authenticated using (true);

drop policy if exists p16_protocols_service on public.creator_interop_institution_protocols;
create policy p16_protocols_service on public.creator_interop_institution_protocols for all to service_role using (true) with check (true);
drop policy if exists p16_rel_service on public.creator_interop_institution_relationship_agreements;
create policy p16_rel_service on public.creator_interop_institution_relationship_agreements for all to service_role using (true) with check (true);
drop policy if exists p16_services_service on public.creator_interop_institution_public_law_services;
create policy p16_services_service on public.creator_interop_institution_public_law_services for all to service_role using (true) with check (true);

commit;
