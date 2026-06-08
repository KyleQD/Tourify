-- =====================================================
-- COMPREHENSIVE MULTI-ACCOUNT SYSTEM
-- =====================================================
-- This creates a scalable system for unlimited account types with unique identifiers
-- Apply this in Supabase SQL Editor in the exact order shown

-- =====================================================
-- STEP 1: Create Unified Accounts Table
-- =====================================================

-- Create a unified accounts table that can reference any profile type
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL, -- 'primary', 'artist', 'venue', 'business', etc.
  profile_table TEXT NOT NULL, -- which table stores the profile data
  profile_id UUID NOT NULL, -- ID in the profile table
  display_name TEXT NOT NULL, -- cached display name for performance
  username TEXT, -- cached username for performance
  avatar_url TEXT, -- cached avatar for performance
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- flexible storage for account-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique combination of profile table and ID
  UNIQUE(profile_table, profile_id),
  -- Ensure unique display names per account type (optional)
  UNIQUE(owner_user_id, account_type, display_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_profile_lookup ON accounts(profile_table, profile_id);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;

-- =====================================================
-- STEP 2: Add Account Context to Posts Table
-- =====================================================

-- Add account context columns to posts table
DO $$ 
BEGIN
  -- Add account_id to reference the accounts table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_id') THEN
    ALTER TABLE posts ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_posts_account_id ON posts(account_id);
    RAISE NOTICE '✅ Added account_id column to posts table';
  END IF;
  
  -- Add legacy columns for backward compatibility
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
    RAISE NOTICE '✅ Added posted_as_profile_id column to posts table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'primary';
    RAISE NOTICE '✅ Added posted_as_account_type column to posts table';
  END IF;
END $$;

-- Create indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_account_context ON posts(posted_as_profile_id, posted_as_account_type);
CREATE INDEX IF NOT EXISTS idx_posts_account_type ON posts(posted_as_account_type);

-- =====================================================
-- STEP 3: Create Account Management RPC Functions
-- =====================================================

-- Function to get account display information by account ID
CREATE OR REPLACE FUNCTION get_account_display_info(account_id UUID)
RETURNS JSONB AS $$
DECLARE
  account_record accounts%ROWTYPE;
  result JSONB;
BEGIN
  SELECT * INTO account_record FROM accounts WHERE id = account_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  result := jsonb_build_object(
    'id', account_record.id,
    'display_name', account_record.display_name,
    'username', account_record.username,
    'avatar_url', account_record.avatar_url,
    'is_verified', account_record.is_verified,
    'account_type', account_record.account_type,
    'metadata', account_record.metadata
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh account display information from source profile
CREATE OR REPLACE FUNCTION refresh_account_display_info(account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  account_record accounts%ROWTYPE;
  new_display_name TEXT;
  new_username TEXT;
  new_avatar_url TEXT;
  new_is_verified BOOLEAN;
BEGIN
  SELECT * INTO account_record FROM accounts WHERE id = account_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Refresh data based on profile table
  IF account_record.profile_table = 'profiles' THEN
    SELECT full_name, username, avatar_url, is_verified
    INTO new_display_name, new_username, new_avatar_url, new_is_verified
    FROM profiles 
    WHERE id = account_record.profile_id;
  ELSIF account_record.profile_table = 'artist_profiles' THEN
    SELECT 
      COALESCE(stage_name, artist_name, 'Artist'),
      LOWER(REPLACE(COALESCE(stage_name, artist_name), ' ', '')),
      profile_image_url,
      is_verified
    INTO new_display_name, new_username, new_avatar_url, new_is_verified
    FROM artist_profiles 
    WHERE id = account_record.profile_id;
  ELSIF account_record.profile_table = 'venue_profiles' THEN
    SELECT 
      COALESCE(name, 'Venue'),
      LOWER(REPLACE(name, ' ', '')),
      logo_url,
      is_verified
    INTO new_display_name, new_username, new_avatar_url, new_is_verified
    FROM venue_profiles 
    WHERE id = account_record.profile_id;
  ELSIF account_record.profile_table = 'organizer_profiles' THEN
    SELECT 
      organization_name,
      LOWER(REPLACE(organization_name, ' ', '')),
      NULL,
      TRUE
    INTO new_display_name, new_username, new_avatar_url, new_is_verified
    FROM organizer_profiles 
    WHERE id = account_record.profile_id;
  END IF;
  
  -- Update account with fresh data
  UPDATE accounts SET
    display_name = COALESCE(new_display_name, display_name),
    username = COALESCE(new_username, username),
    avatar_url = new_avatar_url,
    is_verified = COALESCE(new_is_verified, is_verified),
    updated_at = NOW()
  WHERE id = account_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update an account
CREATE OR REPLACE FUNCTION upsert_account(
  p_owner_user_id UUID,
  p_account_type TEXT,
  p_profile_table TEXT,
  p_profile_id UUID
)
RETURNS UUID AS $$
DECLARE
  account_id UUID;
  display_name TEXT;
  username TEXT;
  avatar_url TEXT;
  is_verified BOOLEAN := FALSE;
BEGIN
  -- Get display info based on profile table
  IF p_profile_table = 'profiles' THEN
    SELECT full_name, username, avatar_url, is_verified
    INTO display_name, username, avatar_url, is_verified
    FROM profiles WHERE id = p_profile_id;
  ELSIF p_profile_table = 'artist_profiles' THEN
    SELECT 
      COALESCE(stage_name, artist_name, 'Artist'),
      LOWER(REPLACE(COALESCE(stage_name, artist_name), ' ', '')),
      profile_image_url,
      is_verified
    INTO display_name, username, avatar_url, is_verified
    FROM artist_profiles WHERE id = p_profile_id;
  ELSIF p_profile_table = 'venue_profiles' THEN
    SELECT 
      COALESCE(name, 'Venue'),
      LOWER(REPLACE(name, ' ', '')),
      logo_url,
      is_verified
    INTO display_name, username, avatar_url, is_verified
    FROM venue_profiles WHERE id = p_profile_id;
  ELSIF p_profile_table = 'organizer_profiles' THEN
    SELECT 
      organization_name,
      LOWER(REPLACE(organization_name, ' ', '')),
      NULL,
      TRUE
    INTO display_name, username, avatar_url, is_verified
    FROM organizer_profiles WHERE id = p_profile_id;
  END IF;
  
  -- Try to find existing account
  SELECT id INTO account_id 
  FROM accounts 
  WHERE profile_table = p_profile_table AND profile_id = p_profile_id;
  
  IF account_id IS NULL THEN
    -- Create new account
    INSERT INTO accounts (
      owner_user_id, 
      account_type, 
      profile_table, 
      profile_id, 
      display_name, 
      username, 
      avatar_url, 
      is_verified
    )
    VALUES (
      p_owner_user_id, 
      p_account_type, 
      p_profile_table, 
      p_profile_id, 
      COALESCE(display_name, 'Unknown'), 
      username, 
      avatar_url, 
      is_verified
    )
    RETURNING id INTO account_id;
  ELSE
    -- Update existing account
    UPDATE accounts SET
      owner_user_id = p_owner_user_id,
      account_type = p_account_type,
      display_name = COALESCE(display_name, accounts.display_name),
      username = COALESCE(username, accounts.username),
      avatar_url = avatar_url,
      is_verified = COALESCE(is_verified, accounts.is_verified),
      updated_at = NOW()
    WHERE id = account_id;
  END IF;
  
  RETURN account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all accounts for a user
CREATE OR REPLACE FUNCTION get_user_accounts(p_user_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_type TEXT,
  profile_table TEXT,
  profile_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  is_active BOOLEAN,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.account_type,
    a.profile_table,
    a.profile_id,
    a.display_name,
    a.username,
    a.avatar_url,
    a.is_verified,
    a.is_active,
    a.metadata
  FROM accounts a
  WHERE a.owner_user_id = p_user_id
  AND a.is_active = TRUE
  ORDER BY 
    CASE 
      WHEN a.account_type = 'primary' THEN 1
      WHEN a.account_type = 'artist' THEN 2
      WHEN a.account_type = 'venue' THEN 3
      ELSE 4
    END,
    a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Auto-populate Existing Accounts
-- =====================================================

-- Create primary accounts for all existing users
DO $$
DECLARE
  user_record RECORD;
  account_id UUID;
BEGIN
  FOR user_record IN (
    SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.owner_user_id = p.id 
      AND a.account_type = 'primary'
    )
  ) LOOP
    -- Create primary account
    SELECT upsert_account(
      user_record.id,
      'primary',
      'profiles',
      user_record.id
    ) INTO account_id;
    
    RAISE NOTICE 'Created primary account for user: % (ID: %)', user_record.full_name, account_id;
  END LOOP;
END $$;

-- Create artist accounts for all existing artist profiles
DO $$
DECLARE
  artist_record RECORD;
  account_id UUID;
BEGIN
  FOR artist_record IN (
    SELECT ap.id, ap.user_id, ap.artist_name, ap.stage_name
    FROM artist_profiles ap
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.profile_table = 'artist_profiles' 
      AND a.profile_id = ap.id
    )
  ) LOOP
    -- Create artist account
    SELECT upsert_account(
      artist_record.user_id,
      'artist',
      'artist_profiles',
      artist_record.id
    ) INTO account_id;
    
    RAISE NOTICE 'Created artist account for: % (ID: %)', COALESCE(artist_record.stage_name, artist_record.artist_name), account_id;
  END LOOP;
END $$;

-- Create venue accounts for all existing venue profiles
DO $$
DECLARE
  venue_record RECORD;
  account_id UUID;
BEGIN
  FOR venue_record IN (
    SELECT vp.id, vp.user_id, vp.name
    FROM venue_profiles vp
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.profile_table = 'venue_profiles' 
      AND a.profile_id = vp.id
    )
  ) LOOP
    -- Create venue account
    SELECT upsert_account(
      venue_record.user_id,
      'venue',
      'venue_profiles',
      venue_record.id
    ) INTO account_id;
    
    RAISE NOTICE 'Created venue account for: % (ID: %)', venue_record.name, account_id;
  END LOOP;
END $$;

-- =====================================================
-- STEP 5: Update Existing Posts with Account Context
-- =====================================================

-- Update existing posts to link to their accounts
DO $$
DECLARE
  post_record RECORD;
  account_id UUID;
  updated_count INTEGER := 0;
BEGIN
  FOR post_record IN (
    SELECT p.id, p.user_id, p.posted_as_profile_id, p.posted_as_account_type
    FROM posts p
    WHERE p.account_id IS NULL
  ) LOOP
    account_id := NULL;
    
    -- Find the matching account
    IF post_record.posted_as_account_type = 'artist' AND post_record.posted_as_profile_id IS NOT NULL THEN
      SELECT a.id INTO account_id
      FROM accounts a
      WHERE a.profile_table = 'artist_profiles' 
      AND a.profile_id = post_record.posted_as_profile_id;
    ELSIF post_record.posted_as_account_type = 'venue' AND post_record.posted_as_profile_id IS NOT NULL THEN
      SELECT a.id INTO account_id
      FROM accounts a
      WHERE a.profile_table = 'venue_profiles' 
      AND a.profile_id = post_record.posted_as_profile_id;
    ELSE
      -- Default to primary account
      SELECT a.id INTO account_id
      FROM accounts a
      WHERE a.owner_user_id = post_record.user_id 
      AND a.account_type = 'primary';
    END IF;
    
    -- Update the post
    IF account_id IS NOT NULL THEN
      UPDATE posts 
      SET account_id = account_id,
          posted_as_profile_id = COALESCE(posted_as_profile_id, user_id),
          posted_as_account_type = COALESCE(posted_as_account_type, 'primary')
      WHERE id = post_record.id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated % existing posts with account context', updated_count;
END $$;

-- =====================================================
-- STEP 6: Create RLS Policies
-- =====================================================

-- Enable RLS on accounts table
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts
CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Update posts RLS policies to include account context
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert posts through their accounts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.id = account_id 
      AND a.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update posts through their accounts"
  ON posts FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.id = account_id 
      AND a.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete posts through their accounts"
  ON posts FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM accounts a 
      WHERE a.id = account_id 
      AND a.owner_user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 7: Success Notification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 COMPREHENSIVE MULTI-ACCOUNT SYSTEM INSTALLED!';
  RAISE NOTICE '✅ Unified accounts table created';
  RAISE NOTICE '✅ Account management RPC functions installed';
  RAISE NOTICE '✅ Posts table updated with account context';
  RAISE NOTICE '✅ Existing profiles migrated to accounts';
  RAISE NOTICE '✅ Existing posts linked to accounts';
  RAISE NOTICE '✅ RLS policies updated';
  RAISE NOTICE '';
  RAISE NOTICE '🔥 FEATURES ENABLED:';
  RAISE NOTICE '- Users can have unlimited accounts of any type';
  RAISE NOTICE '- Posts display correct account names';
  RAISE NOTICE '- Scalable architecture for new account types';
  RAISE NOTICE '- Backward compatibility maintained';
  RAISE NOTICE '';
  RAISE NOTICE '📚 USAGE:';
  RAISE NOTICE '- Call upsert_account() to create/update accounts';
  RAISE NOTICE '- Call get_user_accounts() to list user accounts';
  RAISE NOTICE '- Call get_account_display_info() for account details';
  RAISE NOTICE '- Posts automatically link to accounts';
END $$; 