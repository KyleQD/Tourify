-- =====================================================================
-- P4 — Canonical Location Capture: unresolved-place flow storage.
-- When a user cannot find or ambiguously matches a canonical place, the
-- query becomes an internal resolution candidate for editors. No public
-- reads; no auto-creation of geo_places from this table.
-- =====================================================================

create table if not exists public.world_place_resolution_candidates (
  id uuid primary key default gen_random_uuid(),
  query_text text not null check (length(btrim(query_text)) between 1 and 200),
  country_hint text,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved','rejected')),
  resolved_place_id uuid references public.geo_places(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists world_prc_status_idx
  on public.world_place_resolution_candidates (status, created_at);

alter table public.world_place_resolution_candidates enable row level security;

-- Authenticated users may open candidates and see only their own.
create policy world_prc_insert_authenticated
  on public.world_place_resolution_candidates
  for insert to authenticated
  with check (requested_by = auth.uid());

create policy world_prc_select_own
  on public.world_place_resolution_candidates
  for select to authenticated
  using (requested_by = auth.uid() or exists (
    select 1 from public.rbac_user_entity_roles ur
    join public.rbac_roles r on r.id = ur.role_id
    join public.rbac_role_permissions rp on rp.role_id = r.id
    join public.rbac_permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.entity_type = 'Global'
      and ur.entity_id = ur.role_id
      and ur.is_active = true
      and p.name = 'world.knowledge.review'
  ));

-- Updates belong to reviewers (global review permission) only.
create policy world_prc_update_reviewer
  on public.world_place_resolution_candidates
  for update to authenticated
  using (exists (
    select 1 from public.rbac_user_entity_roles ur
    join public.rbac_roles r on r.id = ur.role_id
    join public.rbac_role_permissions rp on rp.role_id = r.id
    join public.rbac_permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.entity_type = 'Global'
      and ur.entity_id = ur.role_id
      and ur.is_active = true
      and p.name in ('world.knowledge.review','world.knowledge.publish')
  ));

drop trigger if exists world_prc_updated_at on public.world_place_resolution_candidates;
create trigger world_prc_updated_at
  before update on public.world_place_resolution_candidates
  for each row execute procedure public.update_updated_at_column();
