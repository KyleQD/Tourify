set client_min_messages = warning;

-- =============================================================================
-- Entity-scoped RBAC Core (Additive, Non-breaking)
-- =============================================================================

-- Roles
create table if not exists rbac_roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  display_name text,
  scope_type text not null check (scope_type in ('global','entity')),
  is_system boolean default false,
  description text
);

-- Permissions
create table if not exists rbac_permissions (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  display_name text,
  category text,
  description text
);

-- Role → Permission
create table if not exists rbac_role_permissions (
  role_id uuid references rbac_roles(id) on delete cascade,
  permission_id uuid references rbac_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- User → Entity(Role)
create table if not exists rbac_user_entity_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  role_id uuid references rbac_roles(id) on delete cascade not null,
  start_at timestamptz default now(),
  end_at timestamptz,
  is_active boolean default true
);

-- User overrides (allow/deny single permission)
create table if not exists rbac_user_permission_overrides (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  permission_id uuid references rbac_permissions(id) on delete cascade not null,
  allow boolean not null
);

-- Audit log
create table if not exists rbac_permission_audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  action text not null,
  permission_name text,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_rbac_user_entity_roles_user_entity
  on rbac_user_entity_roles(user_id, entity_type, entity_id);

create index if not exists idx_rbac_role_permissions_role
  on rbac_role_permissions(role_id);

create index if not exists idx_rbac_overrides_user_entity
  on rbac_user_permission_overrides(user_id, entity_type, entity_id);

-- =============================================================================
-- Permission Check RPC
-- =============================================================================

create or replace function has_entity_permission(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_permission_name text
) returns boolean language sql stable as $$
  with role_perms as (
    select 1
    from rbac_user_entity_roles ur
    join rbac_role_permissions rp on rp.role_id = ur.role_id
    join rbac_permissions p on p.id = rp.permission_id
    where ur.user_id = p_user_id
      and ur.entity_type = p_entity_type
      and ur.entity_id = p_entity_id
      and ur.is_active = true
      and (ur.end_at is null or ur.end_at > now())
      and p.name = p_permission_name
    limit 1
  ),
  overrides as (
    select allow
    from rbac_user_permission_overrides o
    join rbac_permissions p on p.id = o.permission_id
    where o.user_id = p_user_id
      and o.entity_type = p_entity_type
      and o.entity_id = p_entity_id
      and p.name = p_permission_name
    order by allow desc
    limit 1
  )
  select coalesce((select allow from overrides), exists(select 1 from role_perms));
$$;

-- =============================================================================
-- Seed canonical permissions (idempotent)
-- =============================================================================
insert into rbac_permissions(name, display_name, category)
values
  ('CREATE_PROFILE','Create profile','profile'),
  ('EDIT_PROFILE','Edit profile','profile'),
  ('JOIN_ENTITY','Join entity','membership'),
  ('MANAGE_MEMBERS','Manage members','membership'),
  ('BOOK_EVENTS','Book events','events'),
  ('ASSIGN_EVENT_ROLES','Assign event roles','events'),
  ('EDIT_EVENT_LOGISTICS','Edit event logistics','events'),
  ('MANAGE_ASSETS','Manage assets','assets'),
  ('PUBLISH_MEDIA','Publish media','media'),
  ('MANAGE_TICKETING','Manage ticketing','ticketing'),
  ('MANAGE_PERMITS','Manage permits','compliance')
on conflict (name) do nothing;

-- Seed canonical roles (entity-scoped)
insert into rbac_roles(name, display_name, scope_type, is_system)
values
  ('Individual','Individual','entity', true),
  ('Artist','Artist','entity', true),
  ('Venue','Venue','entity', true),
  ('Organizer','Organizer','entity', true),
  ('PerformanceAgency','Performance Agency','entity', true),
  ('StaffingAgency','Staffing Agency','entity', true),
  ('RentalCompany','Rental Company','entity', true),
  ('ProductionCompany','Production Company','entity', true),
  ('Promoter','Promoter','entity', true),
  ('PublicLocation','Public Location','entity', true),
  ('PrivateLocation','Private Location','entity', true),
  ('VirtualLocation','Virtual Location','entity', true)
on conflict (name) do nothing;

-- Map roles → permissions (idempotent)
-- Individual
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id
from rbac_roles r cross join rbac_permissions p
where r.name = 'Individual'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','JOIN_ENTITY','PUBLISH_MEDIA')
on conflict do nothing;

-- Artist
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'Artist'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','BOOK_EVENTS','ASSIGN_EVENT_ROLES','EDIT_EVENT_LOGISTICS','PUBLISH_MEDIA')
on conflict do nothing;

-- Venue
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'Venue'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','BOOK_EVENTS','ASSIGN_EVENT_ROLES','EDIT_EVENT_LOGISTICS','MANAGE_ASSETS','PUBLISH_MEDIA')
on conflict do nothing;

-- Organizer
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'Organizer'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','BOOK_EVENTS','ASSIGN_EVENT_ROLES','EDIT_EVENT_LOGISTICS','MANAGE_ASSETS','PUBLISH_MEDIA','MANAGE_TICKETING')
on conflict do nothing;

-- PerformanceAgency
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'PerformanceAgency'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','BOOK_EVENTS','ASSIGN_EVENT_ROLES','PUBLISH_MEDIA')
on conflict do nothing;

-- StaffingAgency
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'StaffingAgency'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','ASSIGN_EVENT_ROLES')
on conflict do nothing;

-- RentalCompany
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'RentalCompany'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_ASSETS')
on conflict do nothing;

-- ProductionCompany
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'ProductionCompany'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_MEMBERS','BOOK_EVENTS','ASSIGN_EVENT_ROLES','EDIT_EVENT_LOGISTICS','MANAGE_ASSETS','PUBLISH_MEDIA')
on conflict do nothing;

-- Promoter
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'Promoter'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','BOOK_EVENTS','MANAGE_TICKETING','PUBLISH_MEDIA')
on conflict do nothing;

-- PublicLocation
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'PublicLocation'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_PERMITS')
on conflict do nothing;

-- PrivateLocation
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'PrivateLocation'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE','MANAGE_PERMITS')
on conflict do nothing;

-- VirtualLocation
insert into rbac_role_permissions(role_id, permission_id)
select r.id, p.id from rbac_roles r join rbac_permissions p on true
where r.name = 'VirtualLocation'
  and p.name in ('CREATE_PROFILE','EDIT_PROFILE')
on conflict do nothing;


