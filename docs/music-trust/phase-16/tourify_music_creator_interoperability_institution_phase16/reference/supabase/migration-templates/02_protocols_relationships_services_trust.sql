-- REFERENCE ONLY.
create table if not exists public.creator_interop_protocols (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 code text not null, lifecycle_state text not null, protocol_version text not null, source_manifest_id uuid,
 effective_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_relationship_agreements (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 counterparty_type text not null, counterparty_ref text not null, allowed_claims text[] not null default '{}', lifecycle_state text not null,
 effective_at timestamptz, expires_at timestamptz, source_manifest_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_public_law_services (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 service_code text not null, legal_basis_instrument_id uuid references public.creator_interop_instruments(id), lifecycle_state text not null,
 allowed_jurisdictions text[] not null default '{}', high_impact boolean not null default false, non_adjudicative boolean not null default true,
 policy_version text not null, schema_version text not null, created_at timestamptz not null default now()
);
