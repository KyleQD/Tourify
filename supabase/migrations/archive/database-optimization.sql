-- =============================================================================
-- PROFILE OPTIMIZATION SCRIPT - Run this in Supabase SQL Editor
-- This script safely adds missing columns to the profiles table
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to profiles table safely
DO $$ 
BEGIN
  RAISE NOTICE 'Starting profile table optimization...';
  RAISE NOTICE 'Note: Email is handled by auth.users table, not profiles table';
  
  -- Core profile information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'custom_url') THEN
    ALTER TABLE profiles ADD COLUMN custom_url TEXT UNIQUE;
    RAISE NOTICE 'Added custom_url column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
    RAISE NOTICE 'Added phone column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location TEXT;
    RAISE NOTICE 'Added location column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instagram') THEN
    ALTER TABLE profiles ADD COLUMN instagram TEXT;
    RAISE NOTICE 'Added instagram column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'twitter') THEN
    ALTER TABLE profiles ADD COLUMN twitter TEXT;
    RAISE NOTICE 'Added twitter column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'spotify') THEN
    ALTER TABLE profiles ADD COLUMN spotify TEXT;
    RAISE NOTICE 'Added spotify column';
  END IF;
  
  -- Privacy settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
    ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added show_email column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_phone') THEN
    ALTER TABLE profiles ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added show_phone column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_location') THEN
    ALTER TABLE profiles ADD COLUMN show_location BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added show_location column';
  END IF;
  
  -- Stats columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
    ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added followers_count column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added following_count column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'posts_count') THEN
    ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added posts_count column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_verified column';
  END IF;
  
  -- Metadata for backwards compatibility
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'metadata') THEN
    ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column';
  END IF;
  
  RAISE NOTICE 'Profile table optimization completed successfully!';
END $$;

-- Create performance indexes safely
CREATE INDEX IF NOT EXISTS idx_profiles_custom_url ON profiles(custom_url);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram ON profiles(instagram) WHERE instagram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_twitter ON profiles(twitter) WHERE twitter IS NOT NULL;

-- Update function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at 
            BEFORE UPDATE ON profiles 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Migrate data from metadata to direct columns if metadata exists and has data
DO $$
DECLARE
    profile_record RECORD;
    migration_count INTEGER := 0;
BEGIN
    FOR profile_record IN 
        SELECT id, metadata 
        FROM profiles 
        WHERE metadata IS NOT NULL 
        AND metadata != '{}' 
        LIMIT 100  -- Process in batches for safety
    LOOP
        UPDATE profiles SET
            location = COALESCE(location, profile_record.metadata->>'location'),
            phone = COALESCE(phone, profile_record.metadata->>'phone'),
            instagram = COALESCE(instagram, profile_record.metadata->>'instagram'),
            twitter = COALESCE(twitter, profile_record.metadata->>'twitter'),
            show_email = COALESCE(show_email, (profile_record.metadata->>'show_email')::boolean),
            show_phone = COALESCE(show_phone, (profile_record.metadata->>'show_phone')::boolean),
            show_location = COALESCE(show_location, (profile_record.metadata->>'show_location')::boolean)
        WHERE id = profile_record.id
        AND (
            location IS NULL OR 
            phone IS NULL OR 
            instagram IS NULL OR 
            twitter IS NULL
        );
        
        migration_count := migration_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Migrated data for % profiles from metadata to direct columns', migration_count;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Profile optimization script completed successfully!';
END $$; 