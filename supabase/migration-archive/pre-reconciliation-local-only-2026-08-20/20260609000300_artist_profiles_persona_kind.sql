-- Migration: Add persona_kind to artist_profiles.
--
-- Artists and service providers (photographers, dancers, DJs, etc.) both use
-- artist_profiles. The persona_kind column distinguishes them so the UI can
-- show the correct label and the account type can be normalized to 'service'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artist_profiles' AND column_name = 'persona_kind'
  ) THEN
    ALTER TABLE artist_profiles
      ADD COLUMN persona_kind TEXT NOT NULL DEFAULT 'artist'
        CHECK (persona_kind IN ('artist', 'service'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artist_profiles_persona_kind
  ON artist_profiles (user_id, persona_kind);
