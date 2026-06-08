-- Fix Artist Settings Table Migration
-- Run this in your Supabase SQL Editor to add missing columns and ensure proper account separation

-- =============================================================================
-- ADD MISSING SETTINGS COLUMN TO ARTIST_PROFILES
-- =============================================================================

DO $$ 
BEGIN
  -- Check if artist_profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles' AND table_schema = 'public') THEN
    
    -- Add settings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'settings') THEN
      ALTER TABLE artist_profiles ADD COLUMN settings JSONB DEFAULT '{
        "professional": {
          "contact_email": "",
          "phone": "",
          "location": "",
          "booking_rate": "",
          "availability": "",
          "equipment": "",
          "music_style": "",
          "experience_years": "",
          "notable_performances": "",
          "record_label": "",
          "awards": "",
          "upcoming_releases": ""
        },
        "preferences": {
          "collaboration_interest": false,
          "available_for_hire": false,
          "newsletter_signup": false,
          "privacy_settings": "public",
          "preferred_contact": "email"
        }
      }'::jsonb;
      
      RAISE NOTICE '✅ Added settings column to artist_profiles table';
    ELSE
      RAISE NOTICE '✅ Settings column already exists in artist_profiles table';
    END IF;

    -- Add verification_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verification_status') THEN
      ALTER TABLE artist_profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified';
      RAISE NOTICE '✅ Added verification_status column to artist_profiles table';
    END IF;

    -- Add account_tier column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'account_tier') THEN
      ALTER TABLE artist_profiles ADD COLUMN account_tier TEXT DEFAULT 'basic';
      RAISE NOTICE '✅ Added account_tier column to artist_profiles table';
    END IF;

    -- Ensure bio column exists (some tables might be missing it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'bio') THEN
      ALTER TABLE artist_profiles ADD COLUMN bio TEXT;
      RAISE NOTICE '✅ Added bio column to artist_profiles table';
    END IF;

    -- Ensure genres column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'genres') THEN
      ALTER TABLE artist_profiles ADD COLUMN genres TEXT[] DEFAULT '{}';
      RAISE NOTICE '✅ Added genres column to artist_profiles table';
    END IF;

    -- Ensure social_links column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'social_links') THEN
      ALTER TABLE artist_profiles ADD COLUMN social_links JSONB DEFAULT '{}';
      RAISE NOTICE '✅ Added social_links column to artist_profiles table';
    END IF;

  ELSE
    RAISE NOTICE '❌ artist_profiles table does not exist! Please run the main migration first.';
  END IF;

EXCEPTION WHEN others THEN
  RAISE NOTICE '❌ Error adding columns: %', SQLERRM;
END $$;

-- =============================================================================
-- ADD CONSTRAINTS FOR DATA INTEGRITY
-- =============================================================================

DO $$
BEGIN
  -- Add verification status check constraint
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                 WHERE constraint_name = 'artist_profiles_verification_status_check' 
                 AND table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles 
    ADD CONSTRAINT artist_profiles_verification_status_check 
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
    
    RAISE NOTICE '✅ Added verification_status check constraint';
  END IF;

  -- Add account tier check constraint
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                 WHERE constraint_name = 'artist_profiles_account_tier_check' 
                 AND table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles 
    ADD CONSTRAINT artist_profiles_account_tier_check 
    CHECK (account_tier IN ('basic', 'pro', 'premium'));
    
    RAISE NOTICE '✅ Added account_tier check constraint';
  END IF;

EXCEPTION WHEN others THEN
  RAISE NOTICE '❌ Error adding constraints: %', SQLERRM;
END $$;

-- =============================================================================
-- CREATE USEFUL INDEXES FOR PERFORMANCE
-- =============================================================================

DO $$
BEGIN
  -- Index on user_id for faster profile lookups
  CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
  
  -- Index on verification_status for admin queries
  CREATE INDEX IF NOT EXISTS idx_artist_profiles_verification ON artist_profiles(verification_status);
  
  -- Index on account_tier for tier-based queries
  CREATE INDEX IF NOT EXISTS idx_artist_profiles_tier ON artist_profiles(account_tier);
  
  -- Index on artist_name for search functionality
  CREATE INDEX IF NOT EXISTS idx_artist_profiles_name ON artist_profiles(artist_name);
  
  RAISE NOTICE '✅ Created performance indexes';

EXCEPTION WHEN others THEN
  RAISE NOTICE '❌ Error creating indexes: %', SQLERRM;
END $$;

-- =============================================================================
-- ENSURE RLS POLICIES ARE CORRECT FOR ACCOUNT SEPARATION
-- =============================================================================

DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS "Users can view artist profiles" ON artist_profiles;
  DROP POLICY IF EXISTS "Users can update their own artist profile" ON artist_profiles;
  DROP POLICY IF EXISTS "Users can insert their own artist profile" ON artist_profiles;
  DROP POLICY IF EXISTS "Anyone can view artist profiles" ON artist_profiles;

  -- Create comprehensive RLS policies
  
  -- Allow anyone to view artist profiles (for public discovery)
  CREATE POLICY "Anyone can view artist profiles"
    ON artist_profiles FOR SELECT
    USING (true);

  -- Allow users to update their own artist profile only
  CREATE POLICY "Users can update their own artist profile"
    ON artist_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to insert their own artist profile only
  CREATE POLICY "Users can insert their own artist profile"
    ON artist_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to delete their own artist profile
  CREATE POLICY "Users can delete their own artist profile"
    ON artist_profiles FOR DELETE
    USING (auth.uid() = user_id);

  RAISE NOTICE '✅ Updated RLS policies for proper account separation';

EXCEPTION WHEN others THEN
  RAISE NOTICE '❌ Error setting up RLS policies: %', SQLERRM;
END $$;

-- =============================================================================
-- VERIFICATION AND SUMMARY
-- =============================================================================

DO $$ 
DECLARE
  table_exists BOOLEAN;
  settings_exists BOOLEAN;
  verification_exists BOOLEAN;
  tier_exists BOOLEAN;
  bio_exists BOOLEAN;
  genres_exists BOOLEAN;
  social_exists BOOLEAN;
  column_count INTEGER;
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🎯 ARTIST SETTINGS TABLE FIX COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Check if table exists
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles' AND table_schema = 'public');
  
  IF table_exists THEN
    RAISE NOTICE '✅ artist_profiles table: EXISTS';
    
    -- Check each important column
    settings_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'settings');
    verification_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verification_status');
    tier_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'account_tier');
    bio_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'bio');
    genres_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'genres');
    social_exists := EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'social_links');
    
    -- Count total columns
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'artist_profiles' AND table_schema = 'public';
    
    RAISE NOTICE '📊 Table has % columns total', column_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Required columns for artist settings:';
    RAISE NOTICE '  settings (JSONB): %', CASE WHEN settings_exists THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '  verification_status: %', CASE WHEN verification_exists THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '  account_tier: %', CASE WHEN tier_exists THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '  bio: %', CASE WHEN bio_exists THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '  genres: %', CASE WHEN genres_exists THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '  social_links: %', CASE WHEN social_exists THEN '✅ YES' ELSE '❌ NO' END;
    
    IF settings_exists AND verification_exists AND tier_exists AND bio_exists AND genres_exists AND social_exists THEN
      RAISE NOTICE '';
      RAISE NOTICE '🎉 SUCCESS! All required columns are present.';
      RAISE NOTICE '👤 Artist profile settings should now save correctly!';
      RAISE NOTICE '';
      RAISE NOTICE 'Next steps:';
      RAISE NOTICE '1. Go to your artist profile page (/artist/profile)';
      RAISE NOTICE '2. Click "Edit Profile" and make changes';
      RAISE NOTICE '3. Click "Save Changes" - it should work now!';
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  Some columns are still missing. Please check the errors above.';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ artist_profiles table: NOT FOUND';
    RAISE NOTICE '';
    RAISE NOTICE 'You need to create the artist_profiles table first.';
    RAISE NOTICE 'Please run the main migration: migrations/0002_artist_profiles.sql';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
END $$; 