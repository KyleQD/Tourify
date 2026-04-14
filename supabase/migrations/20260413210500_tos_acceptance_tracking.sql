-- =============================================================================
-- TOS (Terms of Service) Acceptance Tracking
-- Adds tos_accepted_at to profiles and seeds platform TOS agreement templates
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_version INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

-- Seed platform TOS agreement template using the actual agreement_templates schema
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agreement_templates') THEN
    INSERT INTO agreement_templates (id, organization_id, slug, title, body_markdown, version, jurisdiction_hint, created_at)
    VALUES (
      'a0000000-0000-0000-0000-000000000001',
      NULL,
      'platform-tos',
      'Tourify Terms of Service',
      E'By creating an account on Tourify, you agree to our Terms of Service and Privacy Policy.\n\nYou must be at least 18 years old to use this service. You are responsible for maintaining the security of your account credentials. Tourify provides tour and event management tools and is not a party to contracts between users.\n\nSee /terms for the full Terms of Service.',
      1,
      'US',
      NOW()
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO agreement_templates (id, organization_id, slug, title, body_markdown, version, jurisdiction_hint, created_at)
    VALUES (
      'a0000000-0000-0000-0000-000000000002',
      NULL,
      'platform-privacy',
      'Tourify Privacy Policy',
      E'Tourify collects and processes personal data as described in our Privacy Policy.\n\nWe use your information to provide the Service, authenticate your identity, facilitate team management, and improve our platform. You have rights regarding your personal data as described in our Privacy Policy.\n\nSee /privacy for the full Privacy Policy.',
      1,
      'US',
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
