-- Phase 9 S5–S6: research exchange, ethics gates, outputs.

begin;

create table if not exists public.creator_research_projects (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  applicant_entity_name text not null,
  purpose text not null,
  classification text not null default 'internal_aggregate',
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'active', 'closed', 'suspended'
  )),
  protocol_version text not null default '1.0.0',
  ethics_status text not null default 'pending' check (ethics_status in (
    'pending', 'approved', 'rejected', 'waived_blocked'
  )),
  privacy_status text not null default 'pending',
  competition_status text not null default 'pending',
  security_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_research_licenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.creator_research_projects(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'active', 'suspended', 'revoked', 'expired'
  )),
  data_product_ids uuid[] not null default '{}',
  permitted_analyses jsonb not null default '{}'::jsonb,
  output_policy jsonb not null default '{"outputOnly":true}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  document_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_research_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.creator_research_projects(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in (
    'draft', 'privacy_review', 'competition_review', 'editorial_review', 'approved', 'published', 'rejected', 'revoked'
  )),
  artifact_path text,
  artifact_hash text,
  privacy_review jsonb,
  competition_review jsonb,
  editorial_review jsonb,
  contains_recommendation boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.creator_research_projects enable row level security;
alter table public.creator_research_licenses enable row level security;
alter table public.creator_research_outputs enable row level security;

revoke all on
  public.creator_research_projects,
  public.creator_research_licenses,
  public.creator_research_outputs
from anon, authenticated;

grant select, insert, update on public.creator_research_projects to authenticated;
grant select on public.creator_research_licenses to authenticated;
grant select on public.creator_research_outputs to authenticated;

grant all on
  public.creator_research_projects,
  public.creator_research_licenses,
  public.creator_research_outputs
to service_role;

drop policy if exists cc_research_projects_access on public.creator_research_projects;
create policy cc_research_projects_access on public.creator_research_projects
for all to authenticated using (applicant_user_id = (select auth.uid()))
with check (applicant_user_id = (select auth.uid()));

drop policy if exists cc_research_licences_read on public.creator_research_licenses;
create policy cc_research_licences_read on public.creator_research_licenses
for select to authenticated using (exists (
  select 1 from public.creator_research_projects p
  where p.id = project_id and p.applicant_user_id = (select auth.uid())
));

drop policy if exists cc_research_outputs_read on public.creator_research_outputs;
create policy cc_research_outputs_read on public.creator_research_outputs
for select to authenticated using (
  status = 'published'
  or exists (
    select 1 from public.creator_research_projects p
    where p.id = project_id and p.applicant_user_id = (select auth.uid())
  )
);

drop policy if exists cc_research_projects_service on public.creator_research_projects;
create policy cc_research_projects_service on public.creator_research_projects for all to service_role using (true) with check (true);
drop policy if exists cc_research_licences_service on public.creator_research_licenses;
create policy cc_research_licences_service on public.creator_research_licenses for all to service_role using (true) with check (true);
drop policy if exists cc_research_outputs_service on public.creator_research_outputs;
create policy cc_research_outputs_service on public.creator_research_outputs for all to service_role using (true) with check (true);

comment on table public.creator_research_projects is 'External researchers never receive broad table access; access is default-deny.';

commit;
