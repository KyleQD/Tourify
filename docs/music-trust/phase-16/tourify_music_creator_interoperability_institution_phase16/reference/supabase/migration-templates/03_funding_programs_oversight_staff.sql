-- REFERENCE ONLY.
create table if not exists public.creator_interop_budgets (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 fiscal_period text not null, lifecycle_state text not null, approved_amount_minor bigint not null default 0,
 currency text not null, appropriation_decision_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_contributions (
 id uuid primary key default gen_random_uuid(), budget_id uuid not null references public.creator_interop_budgets(id),
 participant_id uuid references public.creator_interop_participants(id), contribution_type text not null,
 amount_minor bigint not null, currency text not null, lifecycle_state text not null, legal_basis_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_programs (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 program_type text not null, jurisdiction text not null, lifecycle_state text not null, approved_budget_id uuid references public.creator_interop_budgets(id),
 source_manifest_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.creator_interop_oversight_cases (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.creator_interop_institutions(id),
 oversight_type text not null, lifecycle_state text not null, restricted boolean not null default true,
 source_manifest_id uuid, created_at timestamptz not null default now()
);
