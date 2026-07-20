-- Phase 6 S0–S3: projects, briefs, requests, members. Partner-led licensing shell.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_licensing_projects (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  buyer_organization_id uuid,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  confidentiality text not null default 'verified_buyer' check (confidentiality in (
    'verified_buyer', 'nda', 'clean_team', 'internal'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'active', 'closed', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_licensing_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_licensing_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'buyer', 'supervisor', 'viewer', 'counsel')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.music_licensing_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_licensing_projects(id) on delete cascade,
  version integer not null check (version > 0),
  payload jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.music_license_requests (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_licensing_projects(id) on delete cascade,
  brief_id uuid not null references public.music_licensing_briefs(id) on delete restrict,
  request_version integer not null default 1,
  classification jsonb not null default '{}'::jsonb,
  classification_status text not null default 'draft' check (classification_status in (
    'draft', 'needs_information', 'classified', 'counsel_review', 'partner_routed', 'rejected', 'superseded'
  )),
  license_class text,
  workflow_module text not null default 'sync' check (workflow_module in (
    'sync', 'master', 'mechanical', 'derivative', 'ugc', 'live', 'brand', 'media', 'ai', 'other'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'quoting', 'negotiating', 'pending_approvals', 'approved',
    'contracting', 'effective', 'rejected', 'withdrawn', 'expired'
  )),
  artist_music_id uuid references public.artist_music(id) on delete set null,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_license_request_assets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.music_license_requests(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('composition', 'recording', 'artwork', 'likeness', 'other')),
  asset_id uuid,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_licensing_availability_enabled', 'Licensing availability', 'Rights availability inventory.', false, 0),
  ('music_licensing_briefs_enabled', 'Licensing briefs', 'Buyer projects and briefs.', false, 0),
  ('music_licensing_requests_enabled', 'Licensing requests', 'License request workflows.', false, 0),
  ('music_licensing_quotes_enabled', 'Licensing quotes', 'Quote versions and negotiation.', false, 0),
  ('music_licensing_agreements_enabled', 'Licensing agreements', 'Contracts and effectiveness.', false, 0),
  ('music_licensing_delivery_enabled', 'Licensing delivery', 'Controlled delivery after effective agreement.', false, 0),
  ('music_licensing_cues_usage_enabled', 'Licensing cues/usage', 'Cue sheets and usage reporting.', false, 0),
  ('music_licensing_payments_enabled', 'Licensing payments', 'Invoices and payment webhooks.', false, 0),
  ('music_licensing_ai_enabled', 'Licensing AI opt-in', 'Separate AI training/model licenses.', false, 0),
  ('music_licensing_ddex_enabled', 'Licensing DDEX sync', 'DDEX/CISAC partner adapters.', false, 0),
  ('music_licensing_admin_ops_enabled', 'Licensing admin ops', 'Ops queues and kill switches.', false, 0),
  ('music_licensing_automated_pricing_enabled', 'Licensing automated pricing', 'Separately gated automated pricing.', false, 0),
  ('music_licensing_multi_territory_direct_enabled', 'Licensing multi-territory direct', 'Separately gated multi-territory grants.', false, 0),
  ('music_licensing_self_service_enabled', 'Licensing broad self-service', 'Separately gated broad self-service.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.music_licensing_projects enable row level security;
alter table public.music_licensing_project_members enable row level security;
alter table public.music_licensing_briefs enable row level security;
alter table public.music_license_requests enable row level security;
alter table public.music_license_request_assets enable row level security;

revoke all on
  public.music_licensing_projects,
  public.music_licensing_project_members,
  public.music_licensing_briefs,
  public.music_license_requests,
  public.music_license_request_assets
from anon, authenticated;

grant select, insert, update on public.music_licensing_projects to authenticated;
grant select, insert, update on public.music_licensing_project_members to authenticated;
grant select, insert on public.music_licensing_briefs to authenticated;
grant select, insert, update on public.music_license_requests to authenticated;
grant select, insert on public.music_license_request_assets to authenticated;

grant all on
  public.music_licensing_projects,
  public.music_licensing_project_members,
  public.music_licensing_briefs,
  public.music_license_requests,
  public.music_license_request_assets
to service_role;

drop policy if exists ml_projects_access on public.music_licensing_projects;
create policy ml_projects_access on public.music_licensing_projects
for all to authenticated using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.music_licensing_project_members m
    where m.project_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
) with check (created_by = (select auth.uid()));

drop policy if exists ml_members_access on public.music_licensing_project_members;
create policy ml_members_access on public.music_licensing_project_members
for all to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.music_licensing_projects p
    where p.id = project_id and p.created_by = (select auth.uid())
  )
) with check (true);

drop policy if exists ml_briefs_access on public.music_licensing_briefs;
create policy ml_briefs_access on public.music_licensing_briefs
for all to authenticated using (exists (
  select 1 from public.music_licensing_projects p
  where p.id = project_id and (
    p.created_by = (select auth.uid())
    or exists (
      select 1 from public.music_licensing_project_members m
      where m.project_id = p.id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  )
)) with check (created_by = (select auth.uid()));

drop policy if exists ml_requests_access on public.music_license_requests;
create policy ml_requests_access on public.music_license_requests
for all to authenticated using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.music_licensing_projects p
    where p.id = project_id and (
      p.created_by = (select auth.uid())
      or exists (
        select 1 from public.music_licensing_project_members m
        where m.project_id = p.id and m.user_id = (select auth.uid()) and m.status = 'active'
      )
    )
  )
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
) with check (created_by = (select auth.uid()));

drop policy if exists ml_request_assets_access on public.music_license_request_assets;
create policy ml_request_assets_access on public.music_license_request_assets
for all to authenticated using (exists (
  select 1 from public.music_license_requests r
  where r.id = request_id and r.created_by = (select auth.uid())
)) with check (true);

drop policy if exists ml_projects_service on public.music_licensing_projects;
create policy ml_projects_service on public.music_licensing_projects for all to service_role using (true) with check (true);
drop policy if exists ml_members_service on public.music_licensing_project_members;
create policy ml_members_service on public.music_licensing_project_members for all to service_role using (true) with check (true);
drop policy if exists ml_briefs_service on public.music_licensing_briefs;
create policy ml_briefs_service on public.music_licensing_briefs for all to service_role using (true) with check (true);
drop policy if exists ml_requests_service on public.music_license_requests;
create policy ml_requests_service on public.music_license_requests for all to service_role using (true) with check (true);
drop policy if exists ml_request_assets_service on public.music_license_request_assets;
create policy ml_request_assets_service on public.music_license_request_assets for all to service_role using (true) with check (true);

comment on table public.music_license_requests is 'License requests; quotes/approvals/contracts are not licences until agreement effective.';

commit;
