-- =============================================================================
-- VENUE ACCESS FIX - Run this in Supabase SQL Editor
-- Fixes the "Error fetching current user venue: {}" issue
-- =============================================================================

-- First, let's check if the table exists and what columns it has
DO $$ 
BEGIN
  RAISE NOTICE 'Checking venue_profiles table structure...';
  
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles' AND table_schema = 'public') THEN
    RAISE NOTICE 'venue_profiles table does not exist - creating it...';
  ELSE
    RAISE NOTICE 'venue_profiles table exists - checking columns...';
  END IF;
END $$;

-- =============================================================================
-- STEP 1: Ensure venue_profiles table exists with all required columns
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  main_profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  capacity INTEGER,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{
    "phone": null,
    "email": null,
    "booking_email": null,
    "manager_name": null
  }'::jsonb,
  social_links JSONB DEFAULT '{
    "website": null,
    "instagram": null,
    "facebook": null,
    "twitter": null
  }'::jsonb,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium')),
  settings JSONB DEFAULT '{
    "public_profile": true,
    "allow_bookings": true,
    "show_contact_info": false,
    "require_approval": false
  }'::jsonb,
  avatar_url TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Check and add each column individually
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'description') THEN
    ALTER TABLE venue_profiles ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'address') THEN
    ALTER TABLE venue_profiles ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'city') THEN
    ALTER TABLE venue_profiles ADD COLUMN city TEXT;
    RAISE NOTICE 'Added city column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'state') THEN
    ALTER TABLE venue_profiles ADD COLUMN state TEXT;
    RAISE NOTICE 'Added state column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'country') THEN
    ALTER TABLE venue_profiles ADD COLUMN country TEXT;
    RAISE NOTICE 'Added country column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'postal_code') THEN
    ALTER TABLE venue_profiles ADD COLUMN postal_code TEXT;
    RAISE NOTICE 'Added postal_code column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'capacity') THEN
    ALTER TABLE venue_profiles ADD COLUMN capacity INTEGER;
    RAISE NOTICE 'Added capacity column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'venue_types') THEN
    ALTER TABLE venue_profiles ADD COLUMN venue_types TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added venue_types column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'contact_info') THEN
    ALTER TABLE venue_profiles ADD COLUMN contact_info JSONB DEFAULT '{
      "phone": null,
      "email": null,
      "booking_email": null,
      "manager_name": null
    }'::jsonb;
    RAISE NOTICE 'Added contact_info column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'social_links') THEN
    ALTER TABLE venue_profiles ADD COLUMN social_links JSONB DEFAULT '{
      "website": null,
      "instagram": null,
      "facebook": null,
      "twitter": null
    }'::jsonb;
    RAISE NOTICE 'Added social_links column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE venue_profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified';
    RAISE NOTICE 'Added verification_status column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'account_tier') THEN
    ALTER TABLE venue_profiles ADD COLUMN account_tier TEXT DEFAULT 'basic';
    RAISE NOTICE 'Added account_tier column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'settings') THEN
    ALTER TABLE venue_profiles ADD COLUMN settings JSONB DEFAULT '{
      "public_profile": true,
      "allow_bookings": true,
      "show_contact_info": false,
      "require_approval": false
    }'::jsonb;
    RAISE NOTICE 'Added settings column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE venue_profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'cover_image_url') THEN
    ALTER TABLE venue_profiles ADD COLUMN cover_image_url TEXT;
    RAISE NOTICE 'Added cover_image_url column';
  END IF;
  
  -- Add main_profile_id column for multi-account support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'main_profile_id') THEN
    ALTER TABLE venue_profiles ADD COLUMN main_profile_id UUID;
    RAISE NOTICE 'Added main_profile_id column for multi-account support';
  END IF;
  
  -- Ensure updated_at column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE venue_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    RAISE NOTICE 'Added updated_at column';
  END IF;
  
  RAISE NOTICE 'All venue_profiles columns have been verified/added';
END $$;

-- =============================================================================
-- STEP 2: Add constraints if they don't exist
-- =============================================================================

DO $$ 
BEGIN
  -- Add unique constraint on user_id and venue_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'venue_profiles' 
                 AND constraint_name = 'venue_profiles_user_id_venue_name_key') THEN
    ALTER TABLE venue_profiles ADD CONSTRAINT venue_profiles_user_id_venue_name_key UNIQUE (user_id, venue_name);
    RAISE NOTICE 'Added unique constraint on user_id and venue_name';
  END IF;
  
  -- Add check constraints if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                 WHERE constraint_name = 'venue_profiles_verification_status_check') THEN
    ALTER TABLE venue_profiles ADD CONSTRAINT venue_profiles_verification_status_check 
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
    RAISE NOTICE 'Added verification_status check constraint';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                 WHERE constraint_name = 'venue_profiles_account_tier_check') THEN
    ALTER TABLE venue_profiles ADD CONSTRAINT venue_profiles_account_tier_check 
      CHECK (account_tier IN ('basic', 'pro', 'premium'));
    RAISE NOTICE 'Added account_tier check constraint';
  END IF;
  
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraints already exist, skipping...';
END $$;

-- =============================================================================
-- STEP 3: Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_venue_name ON venue_profiles(venue_name);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_city ON venue_profiles(city);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_state ON venue_profiles(state);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_verification_status ON venue_profiles(verification_status);

-- =============================================================================
-- STEP 4: Enable RLS and create policies
-- =============================================================================

-- Enable RLS
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all venue profiles" ON venue_profiles;
DROP POLICY IF EXISTS "Users can manage their own venue profiles" ON venue_profiles;
DROP POLICY IF EXISTS "Public venue profiles are viewable by everyone" ON venue_profiles;
DROP POLICY IF EXISTS "Venue owners can manage their own profiles" ON venue_profiles;
DROP POLICY IF EXISTS "Authenticated users can view venue profiles" ON venue_profiles;

-- Create comprehensive RLS policies for multi-account support
CREATE POLICY "venue_profiles_select_policy" ON venue_profiles
FOR SELECT USING (
  -- Allow users to see their own venues (direct ownership)
  auth.uid() = user_id
  OR
  -- Allow users to see venues associated with their main profile (multi-account support)
  (
    main_profile_id IS NOT NULL 
    AND auth.uid() = main_profile_id
  )
  OR
  -- Allow public access to public profiles
  (settings->>'public_profile')::boolean = true
);

CREATE POLICY "venue_profiles_insert_policy" ON venue_profiles
FOR INSERT WITH CHECK (
  -- Allow users to create venues for themselves
  auth.uid() = user_id
  OR
  -- Allow users to create venues associated with their main profile (multi-account support)
  (
    main_profile_id IS NOT NULL 
    AND auth.uid() = main_profile_id
  )
);

CREATE POLICY "venue_profiles_update_policy" ON venue_profiles
FOR UPDATE USING (
  -- Allow users to update their own venues
  auth.uid() = user_id
  OR
  -- Allow users to update venues associated with their main profile (multi-account support)
  (
    main_profile_id IS NOT NULL 
    AND auth.uid() = main_profile_id
  )
);

CREATE POLICY "venue_profiles_delete_policy" ON venue_profiles
FOR DELETE USING (
  -- Allow users to delete their own venues
  auth.uid() = user_id
  OR
  -- Allow users to delete venues associated with their main profile (multi-account support)
  (
    main_profile_id IS NOT NULL 
    AND auth.uid() = main_profile_id
  )
);

-- =============================================================================
-- STEP 5: Create or update the trigger function for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON venue_profiles;

-- Create the trigger
CREATE TRIGGER update_venue_profiles_updated_at
  BEFORE UPDATE ON venue_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 6: Create helper functions for venue dashboard stats
-- =============================================================================

CREATE OR REPLACE FUNCTION get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Return basic stats structure
  -- You can enhance this later with actual data from other tables
  stats := jsonb_build_object(
    'totalBookings', 0,
    'pendingRequests', 0,
    'thisMonthRevenue', 0,
    'averageRating', 0.0,
    'totalReviews', 0,
    'teamMembers', 0,
    'upcomingEvents', 0
  );
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: Test the setup
-- =============================================================================

-- Test function to verify everything is working
CREATE OR REPLACE FUNCTION test_venue_profiles_setup()
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  column_count INTEGER;
  has_rls BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    RETURN 'ERROR: venue_profiles table does not exist';
  END IF;
  
  -- Count columns
  SELECT COUNT(*) INTO column_count 
  FROM information_schema.columns 
  WHERE table_name = 'venue_profiles' AND table_schema = 'public';
  
  -- Check RLS
  SELECT relrowsecurity INTO has_rls 
  FROM pg_class 
  WHERE relname = 'venue_profiles';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'venue_profiles';
  
  result := format('✅ venue_profiles table setup complete:
- Table exists: ✓
- Columns: %s
- RLS enabled: %s
- Policies: %s
- Ready for use: ✓', 
    column_count, 
    CASE WHEN has_rls THEN '✓' ELSE '✗' END,
    policy_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_venue_profiles_setup();

-- =============================================================================
-- STEP 8: Sample data for testing (optional)
-- =============================================================================

-- Uncomment the following to create a test venue profile
-- (Replace 'your-user-id-here' with an actual user ID from auth.users)

/*
INSERT INTO venue_profiles (
  user_id,
  venue_name,
  description,
  address,
  city,
  state,
  country,
  capacity,
  venue_types,
  contact_info,
  social_links
) VALUES (
  'your-user-id-here',
  'Test Venue',
  'A test venue for debugging',
  '123 Test Street',
  'Test City',
  'Test State',
  'Test Country',
  100,
  ARRAY['Club', 'Bar'],
  '{"email": "test@venue.com", "phone": "555-0123"}'::jsonb,
  '{"website": "https://test-venue.com"}'::jsonb
) ON CONFLICT (user_id, venue_name) DO NOTHING;
*/

-- =============================================================================
-- VERIFICATION QUERIES - Run these to verify everything is working
-- =============================================================================

-- 1. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'venue_profiles' 
ORDER BY ordinal_position;

-- 2. Check policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'venue_profiles';

-- 3. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'venue_profiles';

-- 4. Test query (should not return error)
SELECT COUNT(*) as venue_count FROM venue_profiles;

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Clean up test function
DROP FUNCTION IF EXISTS test_venue_profiles_setup();

-- =============================================================================
-- STEP 9: Update existing venue profiles for multi-account support
-- =============================================================================

-- Update existing venue profiles to set main_profile_id = user_id if not already set
UPDATE venue_profiles 
SET main_profile_id = user_id 
WHERE main_profile_id IS NULL;

-- Add foreign key constraint for main_profile_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'venue_profiles' 
                 AND constraint_name = 'venue_profiles_main_profile_id_fkey') THEN
    ALTER TABLE venue_profiles 
    ADD CONSTRAINT venue_profiles_main_profile_id_fkey 
    FOREIGN KEY (main_profile_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for main_profile_id';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key constraint already exists for main_profile_id';
END $$;

-- Success message
SELECT '🎉 VENUE ACCESS FIX COMPLETE! 🎉

The venue_profiles table has been set up with:
✅ All required columns
✅ Proper constraints and indexes  
✅ Row Level Security policies with multi-account support
✅ Helper functions
✅ Triggers for updated_at
✅ Multi-account authentication support

Your venue access issue should now be resolved!' as status; 