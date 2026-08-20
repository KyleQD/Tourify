-- SEC-204 — Delegated / external entity grants (venue/vendor/contractor).
-- Named resources + actions only; required expiry; no org-wide enumeration via grants.
-- Additive only. Never reset the database.

set client_min_messages = warning;

-- Capability catalog defaults (SEC-203 companion)
update public.org_role_permissions
set perms = (
  select array_agg(distinct p order by p)
  from unnest(coalesce(perms, '{}'::text[]) || array['logistics.sensitive']::text[]) as p
)
where role in ('owner', 'admin', 'tour_manager')
  and not ('logistics.sensitive' = any (coalesce(perms, '{}'::text[])));

create table if not exists public.entity_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  grantee_type text not null
    check (grantee_type in ('user', 'venue', 'vendor', 'contractor', 'external_email')),
  grantee_user_id uuid references auth.users (id) on delete cascade,
  grantee_venue_id uuid,
  grantee_vendor_id uuid,
  grantee_email text,
  resource_type text not null
    check (resource_type in ('tour', 'event', 'site_map', 'document', 'publication')),
  resource_id uuid not null,
  capabilities text[] not null default '{}'::text[],
  protected_data_classes text[] not null default '{}'::text[],
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_grants_grantee_present check (
    grantee_user_id is not null
    or grantee_venue_id is not null
    or grantee_vendor_id is not null
    or (grantee_email is not null and char_length(trim(grantee_email)) > 0)
  ),
  constraint entity_grants_expires_after_create check (expires_at > created_at)
);

create index if not exists idx_entity_grants_org_resource
  on public.entity_grants (org_id, resource_type, resource_id)
  where status = 'active';

create index if not exists idx_entity_grants_grantee_user
  on public.entity_grants (grantee_user_id)
  where status = 'active' and grantee_user_id is not null;

create index if not exists idx_entity_grants_expires
  on public.entity_grants (expires_at)
  where status = 'active';

create index if not exists idx_entity_grants_vendor
  on public.entity_grants (grantee_vendor_id)
  where grantee_vendor_id is not null;

alter table public.entity_grants enable row level security;
alter table public.entity_grants force row level security;

drop policy if exists entity_grants_select_org on public.entity_grants;
create policy entity_grants_select_org on public.entity_grants
  for select to authenticated
  using (
    public.is_org_member(auth.uid(), org_id)
    or grantee_user_id = auth.uid()
  );

drop policy if exists entity_grants_insert_org on public.entity_grants;
create policy entity_grants_insert_org on public.entity_grants
  for insert to authenticated
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists entity_grants_update_org on public.entity_grants;
create policy entity_grants_update_org on public.entity_grants
  for update to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists entity_grants_delete_org on public.entity_grants;
create policy entity_grants_delete_org on public.entity_grants
  for delete to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists entity_grants_service on public.entity_grants;
create policy entity_grants_service on public.entity_grants
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on public.entity_grants to authenticated;
grant all on public.entity_grants to service_role;

comment on table public.entity_grants is
  'SEC-204 delegated/external access: named resource + capabilities + required expiry; never org-wide enumerate.';
