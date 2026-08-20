-- Migration: Credentialing OS — physical access credentials.
--
-- Foundational distinction (live-events-ontology.md §8):
--   * DIGITAL permission  → software actions  → RBAC (has_entity_permission)
--   * PHYSICAL credential  → physical access   → THIS migration
--
-- A credential is a wristband / laminate / QR badge that grants a holder physical
-- access to one or more event_zones for a time window. This is NOT the same as:
--   * profile_certifications / staff_documents (verified professional docs)
--   * role_templates.required_credentials (onboarding requirements)
--   * RBAC permissions (digital actions)
--
-- Three tables (ontology §8 target):
--   credential_templates  — reusable badge definitions (Artist, VIP, Vendor, …)
--   credentials           — an issued instance per event + holder
--   credential_access     — which zones a credential opens, and when
--
-- Classification (ontology §15): credential_templates = TEMPLATE, credentials =
-- ENTITY (issued instance with lifecycle), credential_access = RELATIONSHIP.

set client_min_messages = warning;

-- ===========================================================================
-- 1. credential_templates — reusable badge definitions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS credential_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  key                 TEXT NOT NULL,
  label               TEXT NOT NULL,

  -- Broad class of access pass
  credential_class    TEXT NOT NULL DEFAULT 'staff'
                      CHECK (credential_class IN (
                        'artist', 'vip', 'vendor', 'production', 'medical',
                        'security', 'crew', 'press', 'staff', 'guest', 'other'
                      )),

  description         TEXT,

  -- Badge appearance / printing hints
  color               TEXT,
  design              JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Default access hint: zone categories this pass typically opens
  default_zone_categories TEXT[] NOT NULL DEFAULT '{}',

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Ownership: NULL = global platform template; else venue / organization scoped
  owner_entity_type   TEXT CHECK (owner_entity_type IN ('venue', 'organization')),
  owner_entity_id     UUID,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credential_templates_global_key
  ON credential_templates (key) WHERE owner_entity_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_credential_templates_owner_key
  ON credential_templates (owner_entity_id, key) WHERE owner_entity_id IS NOT NULL;

-- ===========================================================================
-- 2. credentials — issued instance
-- ===========================================================================
CREATE TABLE IF NOT EXISTS credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_id         UUID REFERENCES credential_templates(id) ON DELETE SET NULL,

  -- Scope (aligns with event_zones): a credential is valid for an event / venue
  event_id            UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  venue_id            UUID REFERENCES venues(id)    ON DELETE SET NULL,

  -- Denormalized class for fast filtering / gate checks
  credential_class    TEXT NOT NULL DEFAULT 'staff'
                      CHECK (credential_class IN (
                        'artist', 'vip', 'vendor', 'production', 'medical',
                        'security', 'crew', 'press', 'staff', 'guest', 'other'
                      )),
  label               TEXT,

  -- Holder: a platform user (preferred) and/or an entity persona, plus a fallback
  -- display name for guests / non-users.
  holder_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  holder_profile_id   UUID,
  holder_type         TEXT CHECK (holder_type IN (
                        'general', 'artist', 'service', 'venue', 'organization', 'guest'
                      )),
  holder_name         TEXT,

  -- The scannable badge code (QR / barcode). Unique when present.
  code                TEXT,

  -- Lifecycle (ontology §14): issued → active → revoked / expired / lost
  status              TEXT NOT NULL DEFAULT 'issued'
                      CHECK (status IN ('issued', 'active', 'revoked', 'expired', 'lost')),

  valid_from          TIMESTAMP WITH TIME ZONE,
  valid_until         TIMESTAMP WITH TIME ZONE,

  issued_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMP WITH TIME ZONE,
  revoked_reason      TEXT,

  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Defensive: if a legacy `credentials` table already exists (some deployments
-- reference one via the RLS linter), ensure the columns we rely on are present.
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS template_id      UUID,
  ADD COLUMN IF NOT EXISTS event_id         UUID,
  ADD COLUMN IF NOT EXISTS venue_id         UUID,
  ADD COLUMN IF NOT EXISTS credential_class TEXT,
  ADD COLUMN IF NOT EXISTS holder_user_id   UUID,
  ADD COLUMN IF NOT EXISTS holder_profile_id UUID,
  ADD COLUMN IF NOT EXISTS holder_type      TEXT,
  ADD COLUMN IF NOT EXISTS holder_name      TEXT,
  ADD COLUMN IF NOT EXISTS code             TEXT,
  ADD COLUMN IF NOT EXISTS status           TEXT,
  ADD COLUMN IF NOT EXISTS valid_from       TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS valid_until      TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS issued_by        UUID,
  ADD COLUMN IF NOT EXISTS issued_at        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_at       TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_reason   TEXT,
  ADD COLUMN IF NOT EXISTS metadata         JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_code
  ON credentials (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credentials_event  ON credentials (event_id);
CREATE INDEX IF NOT EXISTS idx_credentials_venue  ON credentials (venue_id);
CREATE INDEX IF NOT EXISTS idx_credentials_holder ON credentials (holder_user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials (status);

-- ===========================================================================
-- 3. credential_access — which zones a credential opens
-- ===========================================================================
CREATE TABLE IF NOT EXISTS credential_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  credential_id       UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,

  -- NULL zone_id = all zones in the credential's event scope (e.g. an "All Access" pass)
  zone_id             UUID REFERENCES event_zones(id) ON DELETE CASCADE,

  access_level        TEXT NOT NULL DEFAULT 'entry'
                      CHECK (access_level IN ('entry', 'escort_required', 'restricted')),

  -- Optional per-zone window override (falls back to the credential window)
  valid_from          TIMESTAMP WITH TIME ZONE,
  valid_until         TIMESTAMP WITH TIME ZONE,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credential_access_unique
  ON credential_access (credential_id, COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_credential_access_zone ON credential_access (zone_id);

-- ===========================================================================
-- 4. updated_at triggers
-- ===========================================================================
CREATE OR REPLACE FUNCTION set_credentials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_credential_templates_updated_at ON credential_templates;
CREATE TRIGGER trg_credential_templates_updated_at
  BEFORE UPDATE ON credential_templates
  FOR EACH ROW EXECUTE FUNCTION set_credentials_updated_at();

DROP TRIGGER IF EXISTS trg_credentials_updated_at ON credentials;
CREATE TRIGGER trg_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION set_credentials_updated_at();

-- ===========================================================================
-- 5. Gate-check helper — does a credential currently open a zone?
-- ===========================================================================
CREATE OR REPLACE FUNCTION credential_opens_zone(
  p_credential_id UUID,
  p_zone_id       UUID,
  p_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM credentials c
    JOIN credential_access ca ON ca.credential_id = c.id
    WHERE c.id = p_credential_id
      AND c.status = 'active'
      AND (c.valid_from  IS NULL OR c.valid_from  <= p_at)
      AND (c.valid_until IS NULL OR c.valid_until >= p_at)
      -- zone matches the specific zone OR the credential is all-access (NULL zone)
      AND (ca.zone_id = p_zone_id OR ca.zone_id IS NULL)
      AND (ca.valid_from  IS NULL OR ca.valid_from  <= p_at)
      AND (ca.valid_until IS NULL OR ca.valid_until >= p_at)
  );
$$;

-- ===========================================================================
-- 6. RLS — issuing/managing is gated by EDIT_EVENT_LOGISTICS on the event/venue;
--    holders can read their own credentials.
-- ===========================================================================
ALTER TABLE credential_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_access    ENABLE ROW LEVEL SECURITY;

-- ---- credential_templates ----
DROP POLICY IF EXISTS credential_templates_read ON credential_templates;
CREATE POLICY credential_templates_read ON credential_templates
  FOR SELECT
  USING (
    owner_entity_id IS NULL
    OR (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS credential_templates_write ON credential_templates;
CREATE POLICY credential_templates_write ON credential_templates
  FOR ALL
  USING (
    (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

-- ---- credentials ----
DROP POLICY IF EXISTS credentials_read ON credentials;
CREATE POLICY credentials_read ON credentials
  FOR SELECT
  USING (
    holder_user_id = auth.uid()
    OR issued_by = auth.uid()
    OR has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
    OR (event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS'))
  );

DROP POLICY IF EXISTS credentials_write ON credentials;
CREATE POLICY credentials_write ON credentials
  FOR ALL
  USING (
    has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
    OR (event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS'))
  )
  WITH CHECK (
    has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
    OR (event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS'))
  );

-- ---- credential_access ----
-- Access rows inherit their credential's scope; gate via the parent credential.
DROP POLICY IF EXISTS credential_access_read ON credential_access;
CREATE POLICY credential_access_read ON credential_access
  FOR SELECT
  USING (
    credential_id IN (
      SELECT id FROM credentials c
      WHERE c.holder_user_id = auth.uid()
        OR c.issued_by = auth.uid()
        OR has_entity_permission(auth.uid(), 'Venue', c.venue_id, 'EDIT_EVENT_LOGISTICS')
        OR (c.event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', c.event_id, 'EDIT_EVENT_LOGISTICS'))
    )
  );

DROP POLICY IF EXISTS credential_access_write ON credential_access;
CREATE POLICY credential_access_write ON credential_access
  FOR ALL
  USING (
    credential_id IN (
      SELECT id FROM credentials c
      WHERE has_entity_permission(auth.uid(), 'Venue', c.venue_id, 'EDIT_EVENT_LOGISTICS')
        OR (c.event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', c.event_id, 'EDIT_EVENT_LOGISTICS'))
    )
  )
  WITH CHECK (
    credential_id IN (
      SELECT id FROM credentials c
      WHERE has_entity_permission(auth.uid(), 'Venue', c.venue_id, 'EDIT_EVENT_LOGISTICS')
        OR (c.event_id IS NOT NULL AND has_entity_permission(auth.uid(), 'Event', c.event_id, 'EDIT_EVENT_LOGISTICS'))
    )
  );

-- ===========================================================================
-- 7. Seed global credential templates (ontology §8 examples)
-- ===========================================================================
INSERT INTO credential_templates (key, label, credential_class, description, color, default_zone_categories)
VALUES
  ('artist',     'Artist Pass',      'artist',     'Performer / talent access',                 '#a855f7', ARRAY['access']),
  ('vip',        'VIP Pass',         'vip',        'VIP guest access',                          '#f59e0b', ARRAY['access']),
  ('vendor',     'Vendor Pass',      'vendor',     'Vendor / exhibitor access',                 '#10b981', ARRAY['physical']),
  ('production', 'Production Pass',  'production', 'Production crew all-areas',                  '#3b82f6', ARRAY['operations','physical','access']),
  ('medical',    'Medical Pass',     'medical',    'Medical staff access',                      '#ef4444', ARRAY['operations']),
  ('security',   'Security Pass',    'security',   'Security personnel access',                 '#1f2937', ARRAY['operations','access']),
  ('crew',       'Crew Pass',        'crew',       'General crew access',                        '#6366f1', ARRAY['operations']),
  ('press',      'Press Pass',       'press',      'Media / press access',                      '#0ea5e9', ARRAY['access'])
ON CONFLICT DO NOTHING;
