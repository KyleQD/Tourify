-- Phase 9 S3–S4: contribution licences, lineage manifests, vault access logs.

begin;

create table if not exists public.creator_data_contribution_licenses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.creator_cooperative_members(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'active', 'suspended', 'revoked', 'expired'
  )),
  version integer not null default 1 check (version > 0),
  permitted_purposes text[] not null default '{}',
  prohibited_purposes text[] not null default '{}',
  data_categories text[] not null default '{}',
  source_ids text[] not null default '{}',
  recipient_ids text[] not null default '{}',
  ai_training_allowed boolean not null default false,
  commercial_research_allowed boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  document_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_data_source_manifests (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_record_id text not null,
  snapshot_hash text not null,
  permission_manifest jsonb not null default '{}'::jsonb,
  quality_manifest jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.creator_data_transformation_runs (
  id uuid primary key default gen_random_uuid(),
  input_manifest_ids uuid[] not null default '{}',
  transformation_version text not null,
  output_hash text,
  status text not null default 'pending' check (status in (
    'pending', 'running', 'succeeded', 'failed', 'suppressed'
  )),
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

create table if not exists public.creator_data_vault_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  access_class text not null default 'metadata',
  subject_type text not null,
  subject_id uuid,
  purpose text not null,
  allowed boolean not null default false,
  deny_reason text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('creator-cooperative-vault', 'creator-cooperative-vault', false, 104857600),
  ('creator-cooperative-research', 'creator-cooperative-research', false, 104857600),
  ('creator-cooperative-evidence', 'creator-cooperative-evidence', false, 52428800)
on conflict (id) do nothing;

alter table public.creator_data_contribution_licenses enable row level security;
alter table public.creator_data_source_manifests enable row level security;
alter table public.creator_data_transformation_runs enable row level security;
alter table public.creator_data_vault_access_logs enable row level security;

revoke all on
  public.creator_data_contribution_licenses,
  public.creator_data_source_manifests,
  public.creator_data_transformation_runs,
  public.creator_data_vault_access_logs
from anon, authenticated;

grant select, insert, update on public.creator_data_contribution_licenses to authenticated;
grant select on public.creator_data_source_manifests to authenticated;

grant all on
  public.creator_data_contribution_licenses,
  public.creator_data_source_manifests,
  public.creator_data_transformation_runs,
  public.creator_data_vault_access_logs
to service_role;

drop policy if exists cc_licences_access on public.creator_data_contribution_licenses;
create policy cc_licences_access on public.creator_data_contribution_licenses
for all to authenticated using (exists (
  select 1 from public.creator_cooperative_members m
  where m.id = member_id and m.user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.creator_cooperative_members m
  where m.id = member_id and m.user_id = (select auth.uid())
));

drop policy if exists cc_manifests_read on public.creator_data_source_manifests;
create policy cc_manifests_read on public.creator_data_source_manifests
for select to authenticated using (false);

drop policy if exists cc_licences_service on public.creator_data_contribution_licenses;
create policy cc_licences_service on public.creator_data_contribution_licenses for all to service_role using (true) with check (true);
drop policy if exists cc_manifests_service on public.creator_data_source_manifests;
create policy cc_manifests_service on public.creator_data_source_manifests for all to service_role using (true) with check (true);
drop policy if exists cc_transforms_service on public.creator_data_transformation_runs;
create policy cc_transforms_service on public.creator_data_transformation_runs for all to service_role using (true) with check (true);
drop policy if exists cc_vault_logs_service on public.creator_data_vault_access_logs;
create policy cc_vault_logs_service on public.creator_data_vault_access_logs for all to service_role using (true) with check (true);

comment on table public.creator_data_contribution_licenses is 'Purpose-specific; Phase 8 consent is not a substitute.';

commit;
