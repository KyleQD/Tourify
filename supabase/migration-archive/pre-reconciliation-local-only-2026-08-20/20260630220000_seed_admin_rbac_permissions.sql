-- Seed admin-scoped permissions referenced by PERMISSIONS.ADMIN_* constants
-- and grant them to the canonical Organizer entity role.

insert into rbac_permissions (name, display_name, category, description)
values
  ('admin.users',    'Manage Users',       'administration', 'Create, suspend, and manage platform users'),
  ('admin.roles',    'Manage Roles',       'administration', 'Create and edit RBAC roles and permission assignments'),
  ('admin.settings', 'Manage Settings',    'administration', 'Access and modify system-level settings')
on conflict (name) do nothing;

-- Grant all three admin permissions to the Organizer system role
insert into rbac_role_permissions (role_id, permission_id)
select r.id, p.id
from rbac_roles r
cross join rbac_permissions p
where r.name = 'Organizer'
  and p.name in ('admin.users', 'admin.roles', 'admin.settings')
on conflict do nothing;
