-- Migration: role_templates — structured, reusable role definitions.
--
-- Replaces the code-only seed in lib/staff/onboarding-position-templates.ts with a
-- database-backed table so roles carry:
--   * a department + category bucket
--   * Work Mode permissions (per multi-account-system.md §8.4) that flow into
--     employment_assignments.permissions when a worker is hired
--   * required documents / credentials for onboarding
--
-- Global templates (owner_entity_id IS NULL) are platform defaults visible to all.
-- Entity-owned templates let a venue or organization define their own roles.
--
-- Classification (live-events-ontology.md §15): this is a TEMPLATE/entity that
-- describes assignments; it is not itself an assignment.

CREATE TABLE IF NOT EXISTS role_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable machine key (e.g. 'bartender', 'security-guard')
  key                 TEXT NOT NULL,

  label               TEXT NOT NULL,
  department          TEXT NOT NULL,

  -- Permission bucket used to derive Work Mode capabilities
  role_category       TEXT NOT NULL DEFAULT 'general'
                      CHECK (role_category IN (
                        'bar_service', 'security', 'technical', 'production',
                        'hospitality', 'creative', 'operations', 'management', 'general'
                      )),

  employment_type     TEXT NOT NULL DEFAULT 'part_time'
                      CHECK (employment_type IN (
                        'full_time', 'part_time', 'contractor', 'volunteer', 'intern'
                      )),

  -- Work Mode permissions granted while on shift in this role (JSON map)
  permissions         JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Onboarding requirements
  required_documents      TEXT[] NOT NULL DEFAULT '{}',
  required_credentials    JSONB  NOT NULL DEFAULT '[]'::jsonb,
  estimated_onboarding_days INT  NOT NULL DEFAULT 7,

  tags                TEXT[] NOT NULL DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Ownership: NULL = global platform template; else scoped to a venue / organization
  owner_entity_type   TEXT CHECK (owner_entity_type IN ('venue', 'organization')),
  owner_entity_id     UUID,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A key is unique per owner (global keys unique among NULL owner)
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_templates_global_key
  ON role_templates (key)
  WHERE owner_entity_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_templates_owner_key
  ON role_templates (owner_entity_id, key)
  WHERE owner_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_templates_owner
  ON role_templates (owner_entity_type, owner_entity_id);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION set_role_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_role_templates_updated_at ON role_templates;
CREATE TRIGGER trg_role_templates_updated_at
  BEFORE UPDATE ON role_templates
  FOR EACH ROW EXECUTE FUNCTION set_role_templates_updated_at();

-- ---------------------------------------------------------------------------
-- Link employment_assignments to a role template + carry the category for fast
-- Work Mode permission checks.
-- ---------------------------------------------------------------------------
ALTER TABLE employment_assignments
  ADD COLUMN IF NOT EXISTS role_template_id UUID REFERENCES role_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_category TEXT;

CREATE INDEX IF NOT EXISTS idx_employment_assignments_role_template
  ON employment_assignments (role_template_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read global templates and templates of entities they own
CREATE POLICY "role_templates_read"
  ON role_templates FOR SELECT
  USING (
    owner_entity_id IS NULL
    OR (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

-- Entity owners can create templates for their own venue / organization
CREATE POLICY "role_templates_insert_own"
  ON role_templates FOR INSERT
  WITH CHECK (
    (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

CREATE POLICY "role_templates_update_own"
  ON role_templates FOR UPDATE
  USING (
    (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

CREATE POLICY "role_templates_delete_own"
  ON role_templates FOR DELETE
  USING (
    (owner_entity_type = 'venue'
        AND owner_entity_id IN (SELECT id FROM venue_profiles WHERE user_id = auth.uid()))
    OR (owner_entity_type = 'organization'
        AND owner_entity_id IN (SELECT id FROM organizer_accounts WHERE user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Seed global platform templates (idempotent via ON CONFLICT on global key).
-- Permissions follow multi-account-system.md §8.4 Work Mode permission matrix.
-- ---------------------------------------------------------------------------
INSERT INTO role_templates
  (key, label, department, role_category, employment_type, permissions,
   required_documents, required_credentials, estimated_onboarding_days, tags)
VALUES
  (
    'security-guard', 'Security Guard', 'Security', 'security', 'full_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": "limited", "post_official_comms": false, "manage_other_staff": false, "access_staff_docs": "own"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification'],
    '[{"key":"guard-card","label":"Guard Card","authority":"State Licensing Board","isRequired":true,"isExpiryTracked":true},{"key":"cpr-card","label":"CPR / First Aid Card","authority":"AHA / Red Cross","isRequired":true,"isExpiryTracked":true},{"key":"de-escalation-training","label":"De-escalation Training","isRequired":true,"isExpiryTracked":false}]'::jsonb,
    10, ARRAY['security', 'licensed', 'safety']
  ),
  (
    'forklift-operator', 'Forklift Operator', 'Operations', 'operations', 'full_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": true, "post_official_comms": false, "manage_other_staff": false, "access_staff_docs": "own"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification'],
    '[{"key":"forklift-cert","label":"Forklift Certification","authority":"OSHA","isRequired":true,"isExpiryTracked":true},{"key":"osha-10","label":"OSHA 10 (or equivalent safety cert)","authority":"OSHA","isRequired":true,"isExpiryTracked":true},{"key":"equipment-safety","label":"Equipment Safety Acknowledgement","isRequired":true,"isExpiryTracked":false}]'::jsonb,
    8, ARRAY['operations', 'warehouse', 'safety']
  ),
  (
    'sound-engineer', 'Sound Engineer', 'Technical', 'technical', 'full_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": true, "post_official_comms": false, "manage_other_staff": false, "access_staff_docs": "own"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification', 'Portfolio / Reel'],
    '[{"key":"audio-safety","label":"Live Audio Safety Training","isRequired":true,"isExpiryTracked":false},{"key":"rigging-awareness","label":"Rigging Awareness Certificate","isRequired":false,"isExpiryTracked":true},{"key":"cpr-card","label":"CPR / First Aid Card","authority":"AHA / Red Cross","isRequired":false,"isExpiryTracked":true}]'::jsonb,
    14, ARRAY['technical', 'audio', 'production']
  ),
  (
    'lighting-tech', 'Lighting Technician', 'Technical', 'technical', 'full_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": true, "post_official_comms": false, "manage_other_staff": false, "access_staff_docs": "own"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification'],
    '[{"key":"electrical-safety","label":"Electrical Safety Training","isRequired":true,"isExpiryTracked":false},{"key":"lift-cert","label":"Aerial Lift Certification","isRequired":false,"isExpiryTracked":true},{"key":"osha-10","label":"OSHA 10 (or equivalent safety cert)","authority":"OSHA","isRequired":false,"isExpiryTracked":true}]'::jsonb,
    12, ARRAY['technical', 'lighting', 'safety']
  ),
  (
    'bartender', 'Bartender', 'Service', 'bar_service', 'part_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": true, "post_official_comms": false, "manage_other_staff": false, "access_staff_docs": "own"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification'],
    '[{"key":"alcohol-server","label":"Alcohol Server Permit","isRequired":true,"isExpiryTracked":true},{"key":"food-handler","label":"Food Handler Certification","isRequired":false,"isExpiryTracked":true},{"key":"cpr-card","label":"CPR / First Aid Card","isRequired":false,"isExpiryTracked":true}]'::jsonb,
    7, ARRAY['service', 'bar', 'compliance']
  ),
  (
    'venue-manager', 'Venue Manager', 'Management', 'management', 'full_time',
    '{"view_shift_schedule": true, "check_in_out": true, "view_run_sheet": true, "post_official_comms": true, "manage_other_staff": true, "access_staff_docs": "team"}'::jsonb,
    ARRAY['Government ID', 'W-4 Form', 'I-9 Verification', 'Management References'],
    '[{"key":"leadership-training","label":"Leadership / Management Training","isRequired":true,"isExpiryTracked":false},{"key":"incident-command","label":"Incident Command / Emergency Planning","isRequired":false,"isExpiryTracked":true},{"key":"cpr-card","label":"CPR / First Aid Card","isRequired":false,"isExpiryTracked":true}]'::jsonb,
    21, ARRAY['management', 'leadership', 'operations']
  )
ON CONFLICT DO NOTHING;
