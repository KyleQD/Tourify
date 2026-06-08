-- Migration for Multi-Account System Enhancement
-- This migration creates a comprehensive account management system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhance profiles table to support multiple account types
DO $$ 
BEGIN
  -- Add columns only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_type') THEN
    ALTER TABLE profiles ADD COLUMN profile_type TEXT DEFAULT 'general' CHECK (profile_type IN ('general', 'artist', 'venue', 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_level') THEN
    ALTER TABLE profiles ADD COLUMN admin_level TEXT CHECK (admin_level IN ('super', 'moderator', 'support')) DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'parent_user_id') THEN
    ALTER TABLE profiles ADD COLUMN parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE profiles ADD COLUMN account_settings JSONB DEFAULT '{
      "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
      "notifications": {"email": true, "push": true, "sms": false},
      "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
    }'::jsonb;
  END IF;
END $$;

-- Create account_relationships table to manage owned accounts
CREATE TABLE IF NOT EXISTS account_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owned_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('artist', 'venue', 'admin')),
  permissions JSONB DEFAULT '{
    "can_post": true,
    "can_manage_settings": true,
    "can_view_analytics": true,
    "can_manage_content": true
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(owner_user_id, owned_profile_id)
);

-- Create user_sessions table for context switching
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  active_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  active_account_type TEXT NOT NULL CHECK (active_account_type IN ('general', 'artist', 'venue', 'admin')),
  session_data JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Enhance artist_profiles table with relationship to main profile
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'main_profile_id') THEN
    ALTER TABLE artist_profiles ADD COLUMN main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE artist_profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'account_tier') THEN
    ALTER TABLE artist_profiles ADD COLUMN account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'settings') THEN
    ALTER TABLE artist_profiles ADD COLUMN settings JSONB DEFAULT '{
      "public_profile": true,
      "allow_bookings": true,
      "show_contact_info": false,
      "auto_accept_follows": true
    }'::jsonb;
  END IF;
END $$;

-- Enhance venue_profiles table with relationship to main profile  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'main_profile_id') THEN
    ALTER TABLE venue_profiles ADD COLUMN main_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE venue_profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'account_tier') THEN
    ALTER TABLE venue_profiles ADD COLUMN account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'settings') THEN
    ALTER TABLE venue_profiles ADD COLUMN settings JSONB DEFAULT '{
      "public_profile": true,
      "allow_bookings": true,
      "show_contact_info": false,
      "require_approval": false
    }'::jsonb;
  END IF;
END $$;

-- Create account_activity_log for tracking account actions
CREATE TABLE IF NOT EXISTS account_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'post', 'update_profile', 'switch_account', 'create_account', 'delete_account')),
  action_details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create cross_account_permissions for granular permissions
CREATE TABLE IF NOT EXISTS cross_account_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grantor_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  grantee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('post_as', 'manage_content', 'view_analytics', 'manage_bookings')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('artist', 'venue', 'admin')),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(grantor_profile_id, grantee_user_id, permission_type, resource_type)
);

-- Enhance posts table to track posting context
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'general' CHECK (posted_as_account_type IN ('general', 'artist', 'venue', 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'cross_post_to') THEN
    ALTER TABLE posts ADD COLUMN cross_post_to TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Create RLS policies for account_relationships
ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_relationships' AND policyname = 'Users can view their own account relationships') THEN
    CREATE POLICY "Users can view their own account relationships"
      ON account_relationships FOR SELECT
      USING (auth.uid() = owner_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_relationships' AND policyname = 'Users can manage their own account relationships') THEN
    CREATE POLICY "Users can manage their own account relationships"
      ON account_relationships FOR ALL
      USING (auth.uid() = owner_user_id);
  END IF;
END $$;

-- Create RLS policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Users can manage their own sessions') THEN
    CREATE POLICY "Users can manage their own sessions"
      ON user_sessions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for account_activity_log
ALTER TABLE account_activity_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_activity_log' AND policyname = 'Users can view their own activity') THEN
    CREATE POLICY "Users can view their own activity"
      ON account_activity_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_activity_log' AND policyname = 'System can insert activity logs') THEN
    CREATE POLICY "System can insert activity logs"
      ON account_activity_log FOR INSERT
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_activity_log' AND policyname = 'Admins can view all activity') THEN
    CREATE POLICY "Admins can view all activity"
      ON account_activity_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
        )
      );
  END IF;
END $$;

-- Create RLS policies for cross_account_permissions
ALTER TABLE cross_account_permissions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cross_account_permissions' AND policyname = 'Profile owners can manage permissions for their profiles') THEN
    CREATE POLICY "Profile owners can manage permissions for their profiles"
      ON cross_account_permissions FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          JOIN account_relationships ar ON p.id = ar.owned_profile_id
          WHERE p.id = grantor_profile_id
          AND ar.owner_user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cross_account_permissions' AND policyname = 'Grantees can view permissions granted to them') THEN
    CREATE POLICY "Grantees can view permissions granted to them"
      ON cross_account_permissions FOR SELECT
      USING (auth.uid() = grantee_user_id);
  END IF;
END $$;

-- Create functions for account management

-- Function to create artist account
CREATE OR REPLACE FUNCTION create_artist_account(
  user_id UUID,
  artist_name TEXT,
  bio TEXT DEFAULT NULL,
  genres TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  main_profile_id UUID;
  artist_profile_id UUID;
BEGIN
  -- Get main profile
  SELECT id INTO main_profile_id FROM profiles WHERE id = user_id;
  
  IF main_profile_id IS NULL THEN
    RAISE EXCEPTION 'Main profile not found for user %', user_id;
  END IF;

  -- Create artist profile
  INSERT INTO artist_profiles (user_id, main_profile_id, artist_name, bio, genres, social_links)
  VALUES (user_id, main_profile_id, artist_name, bio, genres, social_links)
  RETURNING id INTO artist_profile_id;

  -- Create account relationship
  INSERT INTO account_relationships (owner_user_id, owned_profile_id, account_type)
  VALUES (user_id, main_profile_id, 'artist');

  -- Log activity
  INSERT INTO account_activity_log (user_id, profile_id, account_type, action_type, action_details)
  VALUES (user_id, main_profile_id, 'artist', 'create_account', 
    jsonb_build_object('artist_profile_id', artist_profile_id, 'artist_name', artist_name));

  RETURN artist_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create venue account
CREATE OR REPLACE FUNCTION create_venue_account(
  user_id UUID,
  venue_name TEXT,
  description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  capacity INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  main_profile_id UUID;
  venue_profile_id UUID;
BEGIN
  -- Get main profile
  SELECT id INTO main_profile_id FROM profiles WHERE id = user_id;
  
  IF main_profile_id IS NULL THEN
    RAISE EXCEPTION 'Main profile not found for user %', user_id;
  END IF;

  -- Create venue profile
  INSERT INTO venue_profiles (user_id, main_profile_id, venue_name, description, address, capacity)
  VALUES (user_id, main_profile_id, venue_name, description, address, capacity)
  RETURNING id INTO venue_profile_id;

  -- Create account relationship
  INSERT INTO account_relationships (owner_user_id, owned_profile_id, account_type)
  VALUES (user_id, main_profile_id, 'venue');

  -- Log activity
  INSERT INTO account_activity_log (user_id, profile_id, account_type, action_type, action_details)
  VALUES (user_id, main_profile_id, 'venue', 'create_account', 
    jsonb_build_object('venue_profile_id', venue_profile_id, 'venue_name', venue_name));

  RETURN venue_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch active account
CREATE OR REPLACE FUNCTION switch_active_account(
  user_id UUID,
  target_profile_id UUID,
  target_account_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify user has access to the target account
  IF target_account_type = 'general' THEN
    IF target_profile_id != user_id THEN
      RAISE EXCEPTION 'User does not have access to this general profile';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM account_relationships 
      WHERE owner_user_id = user_id 
      AND owned_profile_id = target_profile_id 
      AND account_type = target_account_type 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'User does not have access to this % account', target_account_type;
    END IF;
  END IF;

  -- Update or insert user session
  INSERT INTO user_sessions (user_id, active_profile_id, active_account_type, last_activity)
  VALUES (user_id, target_profile_id, target_account_type, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    active_profile_id = EXCLUDED.active_profile_id,
    active_account_type = EXCLUDED.active_account_type,
    last_activity = EXCLUDED.last_activity;

  -- Log activity
  INSERT INTO account_activity_log (user_id, profile_id, account_type, action_type)
  VALUES (user_id, target_profile_id, target_account_type, 'switch_account');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all accounts for a user
CREATE OR REPLACE FUNCTION get_user_accounts(user_id UUID)
RETURNS TABLE (
  account_type TEXT,
  profile_id UUID,
  profile_data JSONB,
  permissions JSONB,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'general'::TEXT as account_type,
    p.id as profile_id,
    to_jsonb(p) as profile_data,
    p.account_settings as permissions,
    true as is_active
  FROM profiles p
  WHERE p.id = user_id

  UNION ALL

  SELECT 
    ar.account_type,
    ar.owned_profile_id as profile_id,
    CASE 
      WHEN ar.account_type = 'artist' THEN to_jsonb(ap)
      WHEN ar.account_type = 'venue' THEN to_jsonb(vp)
      ELSE '{}'::jsonb
    END as profile_data,
    ar.permissions,
    ar.is_active
  FROM account_relationships ar
  LEFT JOIN artist_profiles ap ON ar.account_type = 'artist' AND ap.main_profile_id = ar.owned_profile_id
  LEFT JOIN venue_profiles vp ON ar.account_type = 'venue' AND vp.main_profile_id = ar.owned_profile_id
  WHERE ar.owner_user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to post with account context
CREATE OR REPLACE FUNCTION create_post_with_context(
  user_id UUID,
  posting_as_profile_id UUID,
  posting_as_account_type TEXT,
  content TEXT,
  post_type TEXT DEFAULT 'text',
  visibility TEXT DEFAULT 'public',
  media_urls TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  post_id UUID;
BEGIN
  -- Verify user has permission to post as this account
  IF posting_as_account_type = 'general' THEN
    IF posting_as_profile_id != user_id THEN
      RAISE EXCEPTION 'User cannot post as this general profile';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM account_relationships 
      WHERE owner_user_id = user_id 
      AND owned_profile_id = posting_as_profile_id 
      AND account_type = posting_as_account_type 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'User cannot post as this % account', posting_as_account_type;
    END IF;
  END IF;

  -- Create the post
  INSERT INTO posts (
    user_id, content, post_type, visibility, media_urls, hashtags,
    posted_as_profile_id, posted_as_account_type
  )
  VALUES (
    user_id, content, post_type, visibility, media_urls, hashtags,
    posting_as_profile_id, posting_as_account_type
  )
  RETURNING id INTO post_id;

  -- Log activity
  INSERT INTO account_activity_log (user_id, profile_id, account_type, action_type, action_details)
  VALUES (user_id, posting_as_profile_id, posting_as_account_type, 'post', 
    jsonb_build_object('post_id', post_id, 'content_preview', left(content, 50)));

  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_relationships_owner ON account_relationships(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_account_relationships_profile ON account_relationships(owned_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_posted_as ON posts(posted_as_profile_id, posted_as_account_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON account_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_permissions_grantee ON cross_account_permissions(grantee_user_id); -- Policy Cleanup and Replacement Migration
-- This migration removes all conflicting policies and recreates them properly

-- Drop all existing policies that might conflict
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
    
    -- Drop all policies on artist_profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'artist_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON artist_profiles';
    END LOOP;
    
    -- Drop all policies on venue_profiles table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'venue_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON venue_profiles';
    END LOOP;
    
    -- Drop all policies on posts table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'posts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON posts';
    END LOOP;
    
    -- Drop all policies on account_relationships table if it exists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'account_relationships') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON account_relationships';
    END LOOP;
    
    -- Drop all policies on user_sessions table if it exists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_sessions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_sessions';
    END LOOP;
    
    -- Drop all policies on account_activity_log table if it exists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'account_activity_log') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON account_activity_log';
    END LOOP;
    
    -- Drop all policies on cross_account_permissions table if it exists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cross_account_permissions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON cross_account_permissions';
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create correct policies for profiles table
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create correct policies for artist_profiles table
CREATE POLICY "Artist profiles are viewable by everyone"
  ON artist_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own artist profile"
  ON artist_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artist profile"
  ON artist_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create correct policies for venue_profiles table
CREATE POLICY "Venue profiles are viewable by everyone"
  ON venue_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own venue profile"
  ON venue_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own venue profile"
  ON venue_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create correct policies for posts table
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for multi-account tables if they exist
DO $$ 
BEGIN
  -- Enable RLS and create policies for account_relationships if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    ALTER TABLE account_relationships ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own account relationships"
      ON account_relationships FOR SELECT
      USING (auth.uid() = owner_user_id);

    CREATE POLICY "Users can manage their own account relationships"
      ON account_relationships FOR ALL
      USING (auth.uid() = owner_user_id);
  END IF;

  -- Enable RLS and create policies for user_sessions if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own sessions"
      ON user_sessions FOR ALL
      USING (auth.uid() = user_id);
  END IF;

  -- Enable RLS and create policies for account_activity_log if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log') THEN
    ALTER TABLE account_activity_log ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own activity"
      ON account_activity_log FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "System can insert activity logs"
      ON account_activity_log FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Admins can view all activity"
      ON account_activity_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
        )
      );
  END IF;

  -- Enable RLS and create policies for cross_account_permissions if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cross_account_permissions') THEN
    ALTER TABLE cross_account_permissions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Profile owners can manage permissions for their profiles"
      ON cross_account_permissions FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          JOIN account_relationships ar ON p.id = ar.owned_profile_id
          WHERE p.id = grantor_profile_id
          AND ar.owner_user_id = auth.uid()
        )
      );

    CREATE POLICY "Grantees can view permissions granted to them"
      ON cross_account_permissions FOR SELECT
      USING (auth.uid() = grantee_user_id);
  END IF;
END $$; 