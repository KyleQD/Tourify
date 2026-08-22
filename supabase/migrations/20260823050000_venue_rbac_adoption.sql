-- =============================================================================
-- VEN-122 / VEN-123 / VEN-124 / VEN-127 — Venue adoption of entity RBAC
-- (additive, idempotent; ADR-0002 companion migration)
--
-- 1. rbac_roles gains optional ownership columns so venue-created roles can live
--    in the canonical table (NULL owner = system/global role). Replaces the
--    never-created `role_templates` relation that /api/venue/roles queried (500s).
-- 2. Seeds the canonical permission catalog using the EXACT legacy JSON permission
--    names already enforced by lib/venue/venue-access.ts (canSatisfyPermission) —
--    this is the VEN-129 translation bridge: one vocabulary, DB-backed.
-- 3. Seeds a default venue role set with sensible role→permission wiring so the
--    Roles & Permissions surface renders real data immediately.
-- 4. VEN-127: maps legacy venue_roles / venue_role_permissions rows into the
--    canonical tables by name (idempotent); venue_user_roles is empty per audit,
--    no assignment backfill required.
-- =============================================================================

-- ── 1. Venue-owned custom roles inside canonical rbac_roles ──────────────────
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS owner_entity_type TEXT;
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS owner_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_rbac_roles_owner
  ON public.rbac_roles (owner_entity_type, owner_entity_id)
  WHERE owner_entity_id IS NOT NULL;

COMMENT ON COLUMN public.rbac_roles.owner_entity_type IS
  'NULL for system/global roles; otherwise the entity type that owns this custom role (e.g. Venue).';

-- ── 2. Canonical permission catalog (names = legacy JSON vocabulary) ─────────
INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('manage_bookings',   'Manage bookings',        'bookings',   'Create, respond to, and transition venue booking requests'),
  ('manage_events',     'Manage events',          'events',     'Create and operate venue events'),
  ('manage_ticketing',  'Manage ticketing',       'ticketing',  'Configure ticketing, tiers, and sales'),
  ('door_check_in',     'Door check-in',          'ticketing',  'Scan credentials and manage door state'),
  ('manage_team',       'Manage staff',           'staff',      'Manage roster, roles, and assignments'),
  ('manage_documents',  'Manage documents',       'documents',  'Upload, share, and organize venue documents'),
  ('view_analytics',    'View analytics',         'analytics',  'Read source-backed analytics dashboards'),
  ('view_finances',     'View finances',          'finance',    'Read authorized finance summaries'),
  ('manage_finances',   'Manage finances',        'finance',    'Record transactions, settlements, payouts')
ON CONFLICT (name) DO NOTHING;

-- VEN-169: finance authority splits into distinct approval / payout / export powers.
INSERT INTO public.rbac_permissions (name, display_name, category, description) VALUES
  ('approve_finances',  'Approve finances',       'finance',    'Approve pending financial entries and transitions'),
  ('pay_finances',      'Execute payouts',        'finance',    'Authorize settlement disbursements and payouts'),
  ('export_finances',   'Export finances',        'finance',    'Produce CSV/PDF exports of financial data')
ON CONFLICT (name) DO NOTHING;

-- ── 3. Default venue role set + wiring (idempotent) ──────────────────────────
INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description)
VALUES
  ('Venue Owner',        'Venue Owner',        'entity', true, 'Full control of a venue account'),
  ('Venue Manager',      'Venue Manager',      'entity', true, 'Day-to-day operations manager'),
  ('Venue Booking Manager','Booking Manager',  'entity', true, 'Handles booking requests and holds'),
  ('Venue Scheduler',    'Scheduler',          'entity', true, 'Workforce scheduling and shift requests'),
  ('Venue Ticketing Manager','Ticketing Manager','entity', true, 'Ticketing setup and box office'),
  ('Venue Door Staff',   'Door Staff',         'entity', true, 'Scanner/check-in operations'),
  ('Venue Finance Manager','Finance Manager',  'entity', true, 'Finance view/manage/settlement'),
  ('Venue ReadOnly',     'Read Only',          'entity', true, 'View-only access')
ON CONFLICT (name) DO NOTHING;

-- role → permissions (insert-only; safe to re-run)
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (
  VALUES
    ('Venue Owner',              ARRAY['manage_bookings','manage_events','manage_ticketing','door_check_in','manage_team','manage_documents','view_analytics','view_finances','manage_finances','approve_finances','pay_finances','export_finances']::text[]),
    ('Venue Manager',            ARRAY['manage_bookings','manage_events','manage_ticketing','manage_team','manage_documents','view_analytics','view_finances','approve_finances']::text[]),
    ('Venue Booking Manager',    ARRAY['manage_bookings','manage_events','view_analytics']::text[]),
    ('Venue Scheduler',          ARRAY['manage_team']::text[]),
    ('Venue Ticketing Manager',  ARRAY['manage_ticketing','door_check_in','view_analytics']::text[]),
    ('Venue Door Staff',         ARRAY['door_check_in']::text[]),
    ('Venue Finance Manager',    ARRAY['view_finances','manage_finances','approve_finances','export_finances','view_analytics']::text[]),
    ('Venue ReadOnly',           ARRAY['view_analytics']::text[])
) AS desired(role_name, perms)
JOIN public.rbac_roles r
  ON r.name = desired.role_name AND r.is_system = true AND r.scope_type = 'entity'
JOIN public.rbac_permissions p
  ON p.name = ANY (desired.perms)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ── 4. VEN-127: legacy role migration (name-keyed, idempotent) ───────────────
DO $$
DECLARE
  legacy_roles_count   INT := 0;
  mapped_roles_count   INT := 0;
  legacy_perms_count   INT := 0;
  mapped_perms_count   INT := 0;
BEGIN
  IF to_regclass('public.venue_roles') IS NOT NULL THEN
    SELECT count(*) INTO legacy_roles_count FROM public.venue_roles;

    -- Map legacy roles as venue-scoped custom roles when not already present.
    INSERT INTO public.rbac_roles (name, display_name, scope_type, is_system, description, owner_entity_type)
    SELECT DISTINCT
      'Legacy: ' || role_name,
      role_name,
      'entity',
      false,
      'Migrated from legacy venue_roles (VEN-127)',
      'Legacy'
    FROM public.venue_roles vr
    WHERE vr.is_active = true
    ON CONFLICT (name) DO NOTHING;

    GET DIAGNOSTICS mapped_roles_count = ROW_COUNT;

    -- Map legacy role → permission edges where both sides exist canonically.
    IF to_regclass('public.venue_role_permissions') IS NOT NULL
       AND to_regclass('public.venue_permissions') IS NOT NULL THEN
      INSERT INTO public.rbac_role_permissions (role_id, permission_id)
      SELECT canon_role.id, canon_perm.id
      FROM public.venue_role_permissions vrp
      JOIN public.venue_roles vr ON vr.id = vrp.role_id
      JOIN public.venue_permissions vp ON vp.id = vrp.permission_id
      JOIN public.rbac_roles canon_role
        ON canon_role.name = 'Legacy: ' || vr.role_name
      LEFT JOIN public.rbac_permissions canon_perm
        ON lower(canon_perm.name) = lower(vp.permission_name)
         OR lower(canon_perm.display_name) = lower(COALESCE(vp.permission_description, vp.permission_name))
      WHERE canon_perm.id IS NOT NULL
      ON CONFLICT (role_id, permission_id) DO NOTHING;

      GET DIAGNOSTICS mapped_perms_count = ROW_COUNT;
    END IF;

    SELECT count(*) INTO legacy_perms_count FROM public.venue_permissions;
  END IF;

  RAISE NOTICE 'VEN-127 legacy RBAC migration: legacy_roles=% new_canonical_roles=% legacy_permissions=% permission_edges_mapped=%',
    legacy_roles_count, mapped_roles_count, legacy_perms_count, mapped_perms_count;
END $$;

-- ── Validation queries ───────────────────────────────────────────────────────
-- 1. Catalog present:            select count(*) from rbac_permissions;             (≥ 20)
-- 2. Default roles wired:        select r.name, count(rp.*)
--                                from rbac_roles r left join rbac_role_permissions rp on rp.role_id=r.id
--                                where r.name like 'Venue %' group by 1 order by 1;
-- 3. Legacy mapping report:      select * from rbac_roles where owner_entity_type='Legacy';
-- 4. Double-run idempotency:     counts unchanged after re-execution.
--
-- Rollback: remove seeded 'Venue %'/legacy rows; drop owner columns. No runtime
-- reader depends on the new columns until /api/venue/roles cutover commit lands.
