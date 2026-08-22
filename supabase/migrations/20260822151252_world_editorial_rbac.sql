-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/world_editorial_rbac_preview.sql
-- Converted per docs/24_G1_to_Detroit_Activation_Runbook.md A1-A4.
-- Preview wrapper lines (begin;/rollback;) removed so migration
-- governance owns atomicity. Local disposable database ONLY.

-- Tourify World of Music — platform editorial RBAC preview v0.1
-- READ/REVIEW ONLY. DO NOT APPLY TO TOURIFY DEMO.
-- This file intentionally ROLLS BACK so it can be inspected/executed only as a
-- disposable preview after the G1 database foundation exists.


insert into public.rbac_permissions (id, name, display_name, category, description)
values
  (gen_random_uuid(), 'world.knowledge.view', 'View World Knowledge', 'world_music', 'View draft World of Music knowledge and editorial provenance.'),
  (gen_random_uuid(), 'world.knowledge.review', 'Review World Knowledge', 'world_music', 'Approve, reject, or request changes to World knowledge candidates and claims.'),
  (gen_random_uuid(), 'world.knowledge.publish', 'Publish World Knowledge', 'world_music', 'Publish reviewed World knowledge to public discovery surfaces.'),
  (gen_random_uuid(), 'world.sources.manage', 'Manage World Sources', 'world_music', 'Manage source registry rights, licenses, terms, and provenance classifications.'),
  (gen_random_uuid(), 'world.radio.review', 'Review World Radio', 'world_music', 'Review radio station metadata, rights posture, and playback eligibility.'),
  (gen_random_uuid(), 'world.ingestion.manage', 'Manage World Ingestion', 'world_music', 'Run and review World ingestion workflows and candidate resolution.')
on conflict (name) do nothing;

insert into public.rbac_roles (id, name, display_name, scope_type, is_system, description)
values
  (gen_random_uuid(), 'world_reviewer', 'World Reviewer', 'global', true, 'Global Tourify World of Music reviewer.'),
  (gen_random_uuid(), 'world_publisher', 'World Publisher', 'global', true, 'Global Tourify World of Music reviewer and publisher.'),
  (gen_random_uuid(), 'world_source_manager', 'World Source Manager', 'global', true, 'Global source-rights and ingestion manager for World of Music.'),
  (gen_random_uuid(), 'world_radio_reviewer', 'World Radio Reviewer', 'global', true, 'Global station metadata and radio-rights reviewer.'),
  (gen_random_uuid(), 'world_admin', 'World Administrator', 'global', true, 'Global World of Music administrator with all World permissions.')
on conflict (name) do nothing;

with grants(role_name, permission_name) as (
  values
    ('world_reviewer', 'world.knowledge.view'),
    ('world_reviewer', 'world.knowledge.review'),
    ('world_publisher', 'world.knowledge.view'),
    ('world_publisher', 'world.knowledge.review'),
    ('world_publisher', 'world.knowledge.publish'),
    ('world_source_manager', 'world.knowledge.view'),
    ('world_source_manager', 'world.sources.manage'),
    ('world_source_manager', 'world.ingestion.manage'),
    ('world_radio_reviewer', 'world.knowledge.view'),
    ('world_radio_reviewer', 'world.radio.review'),
    ('world_admin', 'world.knowledge.view'),
    ('world_admin', 'world.knowledge.review'),
    ('world_admin', 'world.knowledge.publish'),
    ('world_admin', 'world.sources.manage'),
    ('world_admin', 'world.radio.review'),
    ('world_admin', 'world.ingestion.manage')
)
insert into public.rbac_role_permissions (role_id, permission_id)
select r.id, p.id
from grants g
join public.rbac_roles r on r.name = g.role_name and r.scope_type = 'global'
join public.rbac_permissions p on p.name = g.permission_name
on conflict (role_id, permission_id) do nothing;

-- Global role assignment convention:
--   rbac_user_entity_roles.entity_type = 'Global'
--   rbac_user_entity_roles.entity_id   = role_id
--   rbac_user_entity_roles.role_id     = role_id
-- This uses the existing assignment table without a synthetic platform row or
-- hard-coded organization ID. No user assignment is seeded by this preview.

create or replace function public.has_global_permission(p_permission_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.rbac_user_entity_roles ur
    join public.rbac_roles r on r.id = ur.role_id
    join public.rbac_role_permissions rp on rp.role_id = r.id
    join public.rbac_permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.entity_type = 'Global'
      and ur.entity_id = ur.role_id
      and ur.is_active = true
      and (ur.start_at is null or ur.start_at <= now())
      and (ur.end_at is null or ur.end_at > now())
      and r.scope_type = 'global'
      and p.name = p_permission_name
  );
$$;

revoke all on function public.has_global_permission(text) from public;
grant execute on function public.has_global_permission(text) to authenticated, service_role;

-- Preview checks. These are expected to return six permissions, five roles,
-- sixteen role/permission bindings, and no user assignment created here.
select count(*) as world_permission_count
from public.rbac_permissions
where name like 'world.%';

select count(*) as world_role_count
from public.rbac_roles
where name in ('world_reviewer','world_publisher','world_source_manager','world_radio_reviewer','world_admin');

select count(*) as world_role_permission_count
from public.rbac_role_permissions rp
join public.rbac_roles r on r.id = rp.role_id
join public.rbac_permissions p on p.id = rp.permission_id
where r.name like 'world_%' and p.name like 'world.%';


