-- Complete Database Setup for Tourify Signup Flow
-- Run this script in Supabase SQL Editor to create all necessary tables and functions
-- This script is safe to run multiple times and handles existing tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location TEXT,
  birth_date DATE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add onboarding_completed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added onboarding_completed column to profiles table';
  END IF;
  
  -- Add account_settings column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE profiles ADD COLUMN account_settings JSONB DEFAULT '{
      "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
      "notifications": {"email": true, "push": true, "sms": false},
      "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
    }'::jsonb;
    RAISE NOTICE 'Added account_settings column to profiles table';
  END IF;
END $$;

-- Create artist_profiles table
CREATE TABLE IF NOT EXISTS artist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_name TEXT NOT NULL,
  bio TEXT,
  genres TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}'::jsonb,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium')),
  settings JSONB DEFAULT '{
    "public_profile": true,
    "allow_bookings": true,
    "show_contact_info": false,
    "auto_accept_follows": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, artist_name)
);

-- Create venue_profiles table
CREATE TABLE IF NOT EXISTS venue_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venue_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  capacity INTEGER,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'pro', 'premium')),
  settings JSONB DEFAULT '{
    "public_profile": true,
    "allow_bookings": true,
    "show_contact_info": false,
    "require_approval": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, venue_name)
);

-- Create posts table for social features
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'music', 'event', 'announcement')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  engagement_stats JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "views": 0
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security on all tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for profiles
DO $$ 
BEGIN
  -- Profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view all profiles') THEN
    CREATE POLICY "Users can view all profiles"
      ON profiles FOR SELECT
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create RLS policies for artist_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_profiles' AND policyname = 'Users can view all artist profiles') THEN
    CREATE POLICY "Users can view all artist profiles"
      ON artist_profiles FOR SELECT
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_profiles' AND policyname = 'Users can manage their own artist profiles') THEN
    CREATE POLICY "Users can manage their own artist profiles"
      ON artist_profiles FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for venue_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_profiles' AND policyname = 'Users can view all venue profiles') THEN
    CREATE POLICY "Users can view all venue profiles"
      ON venue_profiles FOR SELECT
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_profiles' AND policyname = 'Users can manage their own venue profiles') THEN
    CREATE POLICY "Users can manage their own venue profiles"
      ON venue_profiles FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for posts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Users can view all posts') THEN
    CREATE POLICY "Users can view all posts"
      ON posts FOR SELECT
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Users can manage their own posts') THEN
    CREATE POLICY "Users can manage their own posts"
      ON posts FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace the trigger function for new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if onboarding_completed column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    INSERT INTO profiles (id, name, username, onboarding_completed)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
    );
  ELSE
    -- Fallback for tables without onboarding_completed column
    INSERT INTO profiles (id, name, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists, just return NEW
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate it
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
END $$;

-- Create function to create artist account
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
  INSERT INTO artist_profiles (user_id, artist_name, bio, genres, social_links)
  VALUES (user_id, artist_name, bio, genres, social_links)
  RETURNING id INTO artist_profile_id;

  -- Update profile to mark onboarding as completed if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = user_id;
  END IF;

  RETURN artist_profile_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An artist with the name "%" already exists for this user', artist_name;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create artist account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create venue account
CREATE OR REPLACE FUNCTION create_venue_account(
  user_id UUID,
  venue_name TEXT,
  description TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  capacity INTEGER DEFAULT NULL,
  venue_types TEXT[] DEFAULT '{}',
  contact_info JSONB DEFAULT '{}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb
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
  INSERT INTO venue_profiles (user_id, venue_name, description, address, capacity, venue_types, contact_info, social_links)
  VALUES (user_id, venue_name, description, address, capacity, venue_types, contact_info, social_links)
  RETURNING id INTO venue_profile_id;

  -- Update profile to mark onboarding as completed if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = user_id;
  END IF;

  RETURN venue_profile_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A venue with the name "%" already exists for this user', venue_name;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create venue account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_name ON artist_profiles(artist_name);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_name ON venue_profiles(venue_name);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);

-- Create index for onboarding_completed if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
  END IF;
END $$;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers for all tables
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
  DROP TRIGGER IF EXISTS update_artist_profiles_updated_at ON artist_profiles;
  DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON venue_profiles;
  DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;

  -- Create triggers for tables that exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    CREATE TRIGGER update_artist_profiles_updated_at
      BEFORE UPDATE ON artist_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    CREATE TRIGGER update_venue_profiles_updated_at
      BEFORE UPDATE ON venue_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    CREATE TRIGGER update_posts_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Database setup completed successfully! All tables, functions, and policies have been created.';
  RAISE NOTICE 'Missing columns have been added to existing tables.';
  RAISE NOTICE 'Your signup flow should now work properly.';
END $$; 