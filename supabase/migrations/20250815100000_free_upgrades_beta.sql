-- Temporarily mark all existing profiles as upgraded (Pro) during beta
-- NEVER RESET THE DATABASE

-- Artist profiles: set account_tier to 'pro' if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'artist_profiles'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'artist_profiles' AND column_name = 'account_tier'
  ) THEN
    UPDATE artist_profiles SET account_tier = 'pro' WHERE account_tier IS NULL OR account_tier <> 'pro';
  END IF;
END $$;

-- Venue profiles: skipped here — some deployments use views/triggers on venue_profiles that
-- reference legacy columns; tier can be set via a targeted script if needed.

-- Profiles JSON mass-update skipped: triggers on profiles can conflict with accounts uniqueness on this DB.

-- Organizer accounts: ensure is_active remains true; no billing gating
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizer_accounts'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizer_accounts' AND column_name = 'is_active'
  ) THEN
    UPDATE organizer_accounts SET is_active = true WHERE is_active = false;
  END IF;
END $$;

