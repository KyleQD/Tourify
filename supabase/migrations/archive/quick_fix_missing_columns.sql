-- Quick Fix: Add Missing Columns to Existing Tables
-- Run this BEFORE running the main missing_auth_tables.sql

-- =============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add missing columns to profiles table
DO $$ 
BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_settings JSONB DEFAULT '{
    "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
    "notifications": {"email": true, "push": true, "sms": false},
    "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
  }'::jsonb;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
  
  RAISE NOTICE 'Added missing columns to profiles table';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Profiles columns already exist';
END $$;

-- Add missing columns to artist_profiles table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles' AND table_schema = 'public') THEN
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'basic';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    
    RAISE NOTICE 'Added missing columns to artist_profiles table';
  END IF;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Artist profiles columns already exist';
END $$;

-- Add missing columns to venue_profiles table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles' AND table_schema = 'public') THEN
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS country TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS capacity INTEGER;
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS venue_types TEXT[] DEFAULT '{}';
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'basic';
    ALTER TABLE venue_profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    
    RAISE NOTICE 'Added missing columns to venue_profiles table';
  END IF;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Venue profiles columns already exist';
END $$;

-- Add constraints safely
DO $$
BEGIN
  -- Add role check constraint to profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'profiles_role_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'artist', 'venue', 'admin'));
  END IF;
  
  -- Add verification status check to artist_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'artist_profiles_verification_status_check') THEN
      ALTER TABLE artist_profiles ADD CONSTRAINT artist_profiles_verification_status_check CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'artist_profiles_account_tier_check') THEN
      ALTER TABLE artist_profiles ADD CONSTRAINT artist_profiles_account_tier_check CHECK (account_tier IN ('basic', 'pro', 'premium'));
    END IF;
  END IF;
  
  -- Add verification status check to venue_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'venue_profiles_verification_status_check') THEN
      ALTER TABLE venue_profiles ADD CONSTRAINT venue_profiles_verification_status_check CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'venue_profiles_account_tier_check') THEN
      ALTER TABLE venue_profiles ADD CONSTRAINT venue_profiles_account_tier_check CHECK (account_tier IN ('basic', 'pro', 'premium'));
    END IF;
  END IF;
  
  RAISE NOTICE 'Added check constraints';
END $$;

-- Create safe indexes only for columns that exist
DO $$
BEGIN
  -- Create indexes conditionally
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'city') THEN
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_city ON venue_profiles(city);
    RAISE NOTICE 'Created city index on venue_profiles';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verification_status') THEN
    CREATE INDEX IF NOT EXISTS idx_artist_profiles_verification ON artist_profiles(verification_status);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'verification_status') THEN
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_verification ON venue_profiles(verification_status);
  END IF;
END $$;

RAISE NOTICE 'Quick fix completed! Now you can run the main missing_auth_tables.sql file.'; 