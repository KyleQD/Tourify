-- Migration: event_zones — canonical unified zone model.
--
-- Today two unrelated zone tables exist (live-events-ontology.md §3):
--   * staff_zones    — operational staffing zones (venue/event scoped)
--   * site_map_zones — spatial canvas zones (site_map scoped, with geometry + a
--                      glamping_tents child FK + collaborator RLS)
--
-- These serve different masters, so we do NOT destructively merge them (that would
-- break the site-map builder). Instead we introduce a canonical `event_zones`
-- entity that shifts, credentials, and incidents reference, and BRIDGE the two
-- legacy tables to it via a nullable `event_zone_id`. This is additive and
-- reversible — no data loss, no reset.
--
-- Classification (ontology §15): ENTITY (a zone is a noun with identity + lifecycle).

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1. Canonical table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_zones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope — mirrors staff_zones so operational zones map 1:1.
  -- At least one of (event_id, venue_id, adhoc_venue_id) should be set.
  event_id              UUID REFERENCES events_v2(id)   ON DELETE CASCADE,
  venue_id              UUID REFERENCES venues(id)      ON DELETE SET NULL,
  adhoc_venue_id        UUID REFERENCES venues_v2(id)   ON DELETE SET NULL,

  name                  TEXT NOT NULL,
  description           TEXT,

  -- High-level purpose of the zone. `zone_type` stays free-text because the two
  -- legacy systems use different vocabularies (operational roles vs physical
  -- categories); `category` is the normalized bucket for cross-cutting queries.
  category              TEXT NOT NULL DEFAULT 'operations'
                        CHECK (category IN ('operations', 'physical', 'access', 'hybrid')),
  zone_type             TEXT,

  -- Operational fields (from staff_zones)
  capacity              INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  required_staff_count  INTEGER NOT NULL DEFAULT 0,
  assigned_staff_count  INTEGER NOT NULL DEFAULT 0,
  supervisor_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Access control hint for the future credentialing layer (physical access).
  is_restricted         BOOLEAN NOT NULL DEFAULT FALSE,

  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'reserved', 'maintenance', 'closed')),

  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_zones_event   ON event_zones (event_id);
CREATE INDEX IF NOT EXISTS idx_event_zones_venue   ON event_zones (venue_id);
CREATE INDEX IF NOT EXISTS idx_event_zones_adhoc   ON event_zones (adhoc_venue_id);
CREATE INDEX IF NOT EXISTS idx_event_zones_category ON event_zones (category);

CREATE OR REPLACE FUNCTION set_event_zones_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_event_zones_updated_at ON event_zones;
CREATE TRIGGER trg_event_zones_updated_at
  BEFORE UPDATE ON event_zones
  FOR EACH ROW EXECUTE FUNCTION set_event_zones_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Bridge columns on the legacy tables (additive, nullable)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'staff_zones') THEN
    ALTER TABLE staff_zones
      ADD COLUMN IF NOT EXISTS event_zone_id UUID REFERENCES event_zones(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_staff_zones_event_zone ON staff_zones (event_zone_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'site_map_zones') THEN
    ALTER TABLE site_map_zones
      ADD COLUMN IF NOT EXISTS event_zone_id UUID REFERENCES event_zones(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_site_map_zones_event_zone ON site_map_zones (event_zone_id);
  END IF;

  -- Forward path for scheduling: shifts reference a canonical zone.
  -- The legacy free-text `zone_assignment` column is preserved for back-compat.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'staff_shifts') THEN
    ALTER TABLE staff_shifts
      ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES event_zones(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_staff_shifts_zone ON staff_shifts (zone_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Backfill: every operational staff_zone becomes a canonical event_zone.
--    One-time, idempotent (only fills rows not yet linked). staff_zones is a
--    small admin-managed table, so a row-by-row loop is fine and keeps the
--    1:1 linkage explicit.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r        RECORD;
  new_id   UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'staff_zones') THEN
    FOR r IN SELECT * FROM staff_zones WHERE event_zone_id IS NULL LOOP
      INSERT INTO event_zones (
        event_id, venue_id, adhoc_venue_id,
        name, description, category, zone_type,
        capacity, required_staff_count, assigned_staff_count, supervisor_id,
        status
      ) VALUES (
        r.event_id, r.venue_id, r.adhoc_venue_id,
        r.zone_name, r.zone_description, 'operations', r.zone_type,
        r.capacity,
        COALESCE(r.required_staff_count, 0),
        COALESCE(r.assigned_staff_count, 0),
        r.supervisor_id,
        CASE WHEN r.status = 'inactive' THEN 'inactive' ELSE 'active' END
      )
      RETURNING id INTO new_id;

      UPDATE staff_zones SET event_zone_id = new_id WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RLS — mirror the existing staff_zones posture (permissive authenticated
--    read + RBAC-gated writes via has_entity_permission) so admin staffing
--    surfaces keep working without a regression.
-- ---------------------------------------------------------------------------
ALTER TABLE event_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_zones_read ON event_zones;
CREATE POLICY event_zones_read ON event_zones
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS event_zones_write ON event_zones;
CREATE POLICY event_zones_write ON event_zones
  FOR ALL
  USING (
    has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
    OR (event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
    OR supervisor_id = auth.uid()
  )
  WITH CHECK (
    has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
    OR (event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
    OR supervisor_id = auth.uid()
  );
