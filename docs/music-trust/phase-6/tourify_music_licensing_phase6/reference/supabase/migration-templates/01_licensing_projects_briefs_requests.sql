-- REFERENCE ONLY. Create a real migration with the installed Supabase CLI after auditing deployed types.
create table if not exists public.licensing_projects (
  id uuid primary key default gen_random_uuid(),
  buyer_organization_id uuid not null,
  created_by uuid not null references auth.users(id),
  title text not null,
  confidentiality text not null default 'verified_buyer',
  status text not null default 'draft',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.licensing_briefs (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.licensing_projects(id),
  version integer not null, payload jsonb not null, is_current boolean not null default true,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(project_id, version)
);
create table if not exists public.license_requests (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.licensing_projects(id),
  brief_id uuid not null references public.licensing_briefs(id), request_version integer not null default 1,
  classification jsonb not null, status text not null default 'draft', idempotency_key text,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Enable RLS and create audited project-member and scoped-rightsholder policies after inspecting current organization/team functions.
