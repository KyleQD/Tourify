-- =================================================================
-- COMPREHENSIVE SUPABASE MULTI-ACCOUNT SYSTEM MIGRATION
-- Apply this SQL script in your Supabase Dashboard > SQL Editor
-- This version safely skips steps if tables don't exist
-- =================================================================

-- STEP 1: Drop all existing conflicting policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
        END LOOP;
    END IF;
    
    -- Drop all policies on artist_profiles table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'artist_profiles') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON artist_profiles';
        END LOOP;
    END IF;
    
    -- Drop all policies on venue_profiles table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'venue_profiles') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON venue_profiles';
        END LOOP;
    END IF;
    
    -- Drop all policies on posts table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON posts';
        END LOOP;
    END IF;
END $$;

-- STEP 2: Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 3: Enhance profiles table to support multiple account types (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Add columns only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_type') THEN
      ALTER TABLE profiles ADD COLUMN profile_type TEXT DEFAULT 'general' CHECK (profile_type IN ('general', 'artist', 'venue', 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
      ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'settings') THEN
      ALTER TABLE profiles ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- STEP 4: Create account_relationships table
CREATE TABLE IF NOT EXISTS account_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owned_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('artist', 'venue', 'admin')),
  permissions JSONB DEFAULT '{
    "can_post": true,
    "can_manage_settings": true,
    "can_view_analytics": true,
    "can_manage_content": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_profile_id, owned_profile_id, account_type)
);

-- STEP 5: Create user_sessions table for account switching
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active_account_type TEXT NOT NULL CHECK (active_account_type IN ('general', 'artist', 'venue', 'admin')),
  session_data JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- STEP 6: Create account_activity_log table
CREATE TABLE IF NOT EXISTS account_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Enhance artist_profiles table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'main_profile_id') THEN
      ALTER TABLE artist_profiles ADD COLUMN main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'is_verified') THEN
      ALTER TABLE artist_profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verification_status') THEN
      ALTER TABLE artist_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    END IF;
  END IF;
END $$;

-- STEP 8: Enhance venue_profiles table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'main_profile_id') THEN
      ALTER TABLE venue_profiles ADD COLUMN main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'is_verified') THEN
      ALTER TABLE venue_profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'verification_status') THEN
      ALTER TABLE venue_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    END IF;
  END IF;
END $$;

-- STEP 9: Enhance posts table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
      ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
      ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'general' CHECK (posted_as_account_type IN ('general', 'artist', 'venue', 'admin'));
    END IF;
  END IF;
END $$;

-- STEP 10: Create database functions for account management
CREATE OR REPLACE FUNCTION create_artist_account(
  user_id UUID,
  artist_name TEXT,
  bio TEXT DEFAULT NULL,
  genres TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  artist_profile_id UUID;
BEGIN
  -- Check if artist_profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    RAISE EXCEPTION 'artist_profiles table does not exist';
  END IF;

  -- Create artist profile
  INSERT INTO artist_profiles (user_id, artist_name, bio, genres, social_links, main_profile_id)
  VALUES (user_id, artist_name, bio, genres, social_links, user_id)
  RETURNING id INTO artist_profile_id;
  
  -- Create account relationship if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    INSERT INTO account_relationships (owner_profile_id, owned_profile_id, account_type)
    VALUES (user_id, artist_profile_id, 'artist');
  END IF;
  
  -- Log activity if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log') THEN
    INSERT INTO account_activity_log (user_id, profile_id, account_type, action, details)
    VALUES (user_id, artist_profile_id, 'artist', 'account_created', 
            jsonb_build_object('artist_name', artist_name));
  END IF;
  
  RETURN artist_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_venue_account(
  user_id UUID,
  venue_name TEXT,
  description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  capacity INTEGER DEFAULT NULL,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  social_links JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  venue_profile_id UUID;
BEGIN
  -- Check if venue_profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    RAISE EXCEPTION 'venue_profiles table does not exist';
  END IF;

  -- Create venue profile
  INSERT INTO venue_profiles (user_id, venue_name, description, address, capacity, venue_types, contact_info, social_links, main_profile_id)
  VALUES (user_id, venue_name, description, address, capacity, venue_types, contact_info, social_links, user_id)
  RETURNING id INTO venue_profile_id;
  
  -- Create account relationship if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    INSERT INTO account_relationships (owner_profile_id, owned_profile_id, account_type)
    VALUES (user_id, venue_profile_id, 'venue');
  END IF;
  
  -- Log activity if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log') THEN
    INSERT INTO account_activity_log (user_id, profile_id, account_type, action, details)
    VALUES (user_id, venue_profile_id, 'venue', 'account_created', 
            jsonb_build_object('venue_name', venue_name));
  END IF;
  
  RETURN venue_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION switch_active_account(
  user_id UUID,
  profile_id UUID,
  account_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user_sessions table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    RETURN TRUE; -- Just return success if session management isn't available
  END IF;

  -- Update or insert active session
  INSERT INTO user_sessions (user_id, active_profile_id, active_account_type, last_activity)
  VALUES (user_id, profile_id, account_type, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    active_profile_id = EXCLUDED.active_profile_id,
    active_account_type = EXCLUDED.active_account_type,
    last_activity = EXCLUDED.last_activity,
    expires_at = NOW() + INTERVAL '24 hours';
  
  -- Log activity if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log') THEN
    INSERT INTO account_activity_log (user_id, profile_id, account_type, action, details)
    VALUES (user_id, profile_id, account_type, 'account_switched', 
            jsonb_build_object('switched_to', account_type));
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_accounts(user_id UUID)
RETURNS TABLE (
  account_type TEXT,
  profile_id UUID,
  profile_data JSONB,
  permissions JSONB,
  is_active BOOLEAN
) AS $$
BEGIN
  -- Return general profile
  RETURN QUERY
  SELECT 
    'general'::TEXT as account_type,
    p.id as profile_id,
    to_jsonb(p) as profile_data,
    '{"can_post": true, "can_manage_settings": true, "can_view_analytics": true, "can_manage_content": true}'::JSONB as permissions,
    TRUE as is_active
  FROM profiles p 
  WHERE p.id = user_id;
  
  -- Return artist profiles if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    RETURN QUERY
    SELECT 
      'artist'::TEXT as account_type,
      ap.id as profile_id,
      to_jsonb(ap) as profile_data,
      COALESCE(ar.permissions, '{"can_post": true, "can_manage_settings": true, "can_view_analytics": true, "can_manage_content": true}'::JSONB) as permissions,
      FALSE as is_active
    FROM artist_profiles ap
    LEFT JOIN account_relationships ar ON ar.owned_profile_id = ap.id AND ar.account_type = 'artist'
    WHERE ap.user_id = user_id;
  END IF;
  
  -- Return venue profiles if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    RETURN QUERY
    SELECT 
      'venue'::TEXT as account_type,
      vp.id as profile_id,
      to_jsonb(vp) as profile_data,
      COALESCE(ar.permissions, '{"can_post": true, "can_manage_settings": true, "can_view_analytics": true, "can_manage_content": true}'::JSONB) as permissions,
      FALSE as is_active
    FROM venue_profiles vp
    LEFT JOIN account_relationships ar ON ar.owned_profile_id = vp.id AND ar.account_type = 'venue'
    WHERE vp.user_id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_post_with_context(
  user_id UUID,
  content TEXT,
  profile_id UUID,
  account_type TEXT,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  post_id UUID;
BEGIN
  -- Check if posts table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    RAISE EXCEPTION 'posts table does not exist';
  END IF;

  -- Create post with context
  INSERT INTO posts (user_id, content, images, tags, posted_as_profile_id, posted_as_account_type)
  VALUES (user_id, content, images, tags, profile_id, account_type)
  RETURNING id INTO post_id;
  
  -- Log activity if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log') THEN
    INSERT INTO account_activity_log (user_id, profile_id, account_type, action, details)
    VALUES (user_id, profile_id, account_type, 'post_created', 
            jsonb_build_object('post_id', post_id, 'content_length', length(content)));
  END IF;
  
  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Create comprehensive RLS policies

-- Profiles policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can update their own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
    
    CREATE POLICY "Users can insert their own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Artist profiles policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own artist profiles" ON artist_profiles
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage their own artist profiles" ON artist_profiles
      FOR ALL USING (auth.uid() = user_id);
      
    CREATE POLICY "Public can view verified artist profiles" ON artist_profiles
      FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
  END IF;
END $$;

-- Venue profiles policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own venue profiles" ON venue_profiles
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage their own venue profiles" ON venue_profiles
      FOR ALL USING (auth.uid() = user_id);
      
    CREATE POLICY "Public can view verified venue profiles" ON venue_profiles
      FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
  END IF;
END $$;

-- Account relationships policies
ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their account relationships" ON account_relationships
  FOR SELECT USING (auth.uid() = owner_profile_id);

CREATE POLICY "Users can manage their account relationships" ON account_relationships
  FOR ALL USING (auth.uid() = owner_profile_id);

-- User sessions policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Account activity log policies
ALTER TABLE account_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity" ON account_activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- Posts policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own posts" ON posts
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage their own posts" ON posts
      FOR ALL USING (auth.uid() = user_id);
      
    CREATE POLICY "Public can view published posts" ON posts
      FOR SELECT USING (true); -- Adjust based on your visibility requirements
  END IF;
END $$;

-- STEP 12: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_relationships_owner ON account_relationships(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_account_relationships_owned ON account_relationships(owned_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_profile ON user_sessions(active_profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON account_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_profile_id ON account_activity_log(profile_id);

-- Only create these indexes if the tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_artist_profiles_main_profile ON artist_profiles(main_profile_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_main_profile ON venue_profiles(main_profile_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    CREATE INDEX IF NOT EXISTS idx_posts_posted_as_profile ON posts(posted_as_profile_id);
    CREATE INDEX IF NOT EXISTS idx_posts_account_type ON posts(posted_as_account_type);
  END IF;
END $$;

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================

SELECT 'Multi-account system migration completed successfully!' AS result; 