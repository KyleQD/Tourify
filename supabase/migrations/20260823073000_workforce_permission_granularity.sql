-- =============================================================================
-- VEN-130 (+ VEN-129 wiring) — granular workforce permission catalog
-- (additive, idempotent; companion to ADR-0002)
--
-- Splits the monolithic manage_team authority so that by default:
--   - a scheduler can schedule without viewing pay/HR
--   - a recruiter can hire without editing finances
--   - door staff hold no roster management powers
-- =============================================================================

INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('roster.view',          'View roster',            'staff', 'See venue roster and shift coverage'),
  ('roster.manage',        'Manage roster',          'staff', 'Add, edit, deactivate workforce members'),
  ('hiring.manage',        'Manage hiring',          'staff', 'Postings, applications, interviews, offers'),
  ('scheduling.manage',    'Manage scheduling',      'staff', 'Create/publish shifts, swaps, templates'),
  ('timekeeping.view',     'View timekeeping',       'staff', 'Read clock-ins and worked hours'),
  ('timekeeping.manage',   'Manage timekeeping',     'staff', 'Correct timecards and approve hours'),
  ('hr.sensitive_view',    'View sensitive HR data', 'staff', 'DOB, government ids, emergency contacts, pay rates')
ON CONFLICT (name) DO NOTHING;

-- New default role: recruiter without finance/HR reach.
INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description)
VALUES ('Venue Hiring Manager', 'Hiring Manager', 'entity', true,
        'Runs postings and candidate flow; no finance or HR-sensitive access')
ON CONFLICT (name) DO NOTHING;

-- Role wiring (insert-only, re-runnable).
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (
  VALUES
    ('Venue Owner',           ARRAY['manage_team','roster.view','roster.manage','hiring.manage','scheduling.manage','timekeeping.view','timekeeping.manage','hr.sensitive_view']::text[]),
    ('Venue Manager',         ARRAY['manage_team','roster.view','roster.manage','scheduling.manage','hiring.manage','timekeeping.view','hr.sensitive_view']::text[]),
    ('Venue Scheduler',       ARRAY['roster.view','scheduling.manage','timekeeping.view']::text[]),
    ('Venue Hiring Manager',  ARRAY['roster.view','hiring.manage']::text[]),
    ('Venue Finance Manager', ARRAY['roster.view']::text[]),
    ('Venue ReadOnly',        ARRAY['roster.view']::text[])
) AS desired(role_name, perms)
JOIN public.rbac_roles r
  ON r.name = desired.role_name AND r.is_system = true AND r.scope_type = 'entity'
JOIN public.rbac_permissions p
  ON p.name = ANY (desired.perms)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Door Staff deliberately receives NOTHING here: scanning is door_check_in;
-- scheduling/roster/hiring stay out of reach (VEN-130 acceptance).

-- ── Validation ───────────────────────────────────────────────────────────────
-- 1. Scheduler cannot see pay/HR:
--      select exists(select 1 from rbac_role_permissions rp
--        join rbac_roles r on r.id=rp.role_id and r.name='Venue Scheduler'
--        join rbac_permissions p on p.id=rp.permission_id
--        where p.name in ('hr.sensitive_view','manage_finances'));   → f
-- 2. Hiring Manager has no finances:
--      … r.name='Venue Hiring Manager' and p.name like '%finance%';  → f
-- 3. Door Staff has no roster.manage:
--      … r.name='Venue Door Staff' and p.name='roster.manage';       → f
