-- Phase 20: access, reuse, repatriation, remediation (default-deny execution).

begin;

create table if not exists public.creator_memory_access_requests (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.creator_memory_preservation_packages(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  purpose text not null,
  requested_fields jsonb not null default '[]'::jsonb,
  state text not null default 'draft',
  decision_reason text,
  expires_at timestamptz,
  policy_version text not null default '1.0.0',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_reuse_permissions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.creator_memory_preservation_packages(id) on delete cascade,
  reuse_type text not null,
  exact_scope jsonb not null default '{}'::jsonb,
  recipient_id uuid,
  state text not null default 'draft',
  effective_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_repatriation_cases (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.creator_memory_preservation_packages(id) on delete cascade,
  requester_authority_id uuid,
  requested_remedy text not null,
  state text not null default 'draft',
  evidence_manifest_id uuid,
  decision_id uuid,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_memory_remediation_actions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  action_type text not null,
  prior_projection jsonb,
  replacement_projection jsonb,
  state text not null default 'proposed',
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_memory_access_requests enable row level security;
alter table public.creator_memory_reuse_permissions enable row level security;
alter table public.creator_memory_repatriation_cases enable row level security;
alter table public.creator_memory_remediation_actions enable row level security;

revoke all on
  public.creator_memory_access_requests,
  public.creator_memory_reuse_permissions,
  public.creator_memory_repatriation_cases,
  public.creator_memory_remediation_actions
from anon, authenticated;

grant select on public.creator_memory_access_requests to authenticated;
grant select on public.creator_memory_reuse_permissions to authenticated;
grant select on public.creator_memory_repatriation_cases to authenticated;
grant select on public.creator_memory_remediation_actions to authenticated;

grant all on
  public.creator_memory_access_requests,
  public.creator_memory_reuse_permissions,
  public.creator_memory_repatriation_cases,
  public.creator_memory_remediation_actions
to service_role;

drop policy if exists p20_access_read on public.creator_memory_access_requests;
create policy p20_access_read on public.creator_memory_access_requests for select to authenticated using (true);
drop policy if exists p20_reuse_read on public.creator_memory_reuse_permissions;
create policy p20_reuse_read on public.creator_memory_reuse_permissions for select to authenticated using (true);
drop policy if exists p20_repatriation_read on public.creator_memory_repatriation_cases;
create policy p20_repatriation_read on public.creator_memory_repatriation_cases for select to authenticated using (true);
drop policy if exists p20_remediation_read on public.creator_memory_remediation_actions;
create policy p20_remediation_read on public.creator_memory_remediation_actions for select to authenticated using (true);

drop policy if exists p20_access_service on public.creator_memory_access_requests;
create policy p20_access_service on public.creator_memory_access_requests for all to service_role using (true) with check (true);
drop policy if exists p20_reuse_service on public.creator_memory_reuse_permissions;
create policy p20_reuse_service on public.creator_memory_reuse_permissions for all to service_role using (true) with check (true);
drop policy if exists p20_repatriation_service on public.creator_memory_repatriation_cases;
create policy p20_repatriation_service on public.creator_memory_repatriation_cases for all to service_role using (true) with check (true);
drop policy if exists p20_remediation_service on public.creator_memory_remediation_actions;
create policy p20_remediation_service on public.creator_memory_remediation_actions for all to service_role using (true) with check (true);

commit;
