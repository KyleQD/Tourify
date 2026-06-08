-- Simple Auth Fix for Tourify - Handles existing tables properly
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Add missing columns to existing tables
-- =============================================================================

DO $$ 
BEGIN
  -- Fix profiles table
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_settings JSONB DEFAULT '{}';
  
  RAISE NOTICE 'Fixed profiles table columns';
  
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Profiles columns already exist';
END $$;

-- Fix venue_profiles table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
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
    
    RAISE NOTICE 'Fixed venue_profiles table columns';
  END IF;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Venue profiles columns already exist';
END $$;

-- Fix artist_profiles table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'basic';
    ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    
    RAISE NOTICE 'Fixed artist_profiles table columns';
  END IF;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'Artist profiles columns already exist';
END $$;

-- Fix user_sessions table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_token TEXT;
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address INET;
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE 'Fixed user_sessions table columns';
  END IF;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'User sessions columns already exist';
END $$;

-- =============================================================================
-- STEP 2: Create missing tables
-- =============================================================================

-- Create onboarding table if it doesn't exist
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  completed BOOLEAN DEFAULT false,
  current_step TEXT DEFAULT 'welcome',
  steps_completed TEXT[] DEFAULT '{}',
  onboarding_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- STEP 3: Enable Row Level Security
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_profiles') THEN
    ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_profiles') THEN
    ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Create RLS Policies
-- =============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Onboarding policies
DROP POLICY IF EXISTS "Users can view their own onboarding" ON onboarding;
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON onboarding;

CREATE POLICY "Users can view their own onboarding" ON onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own onboarding" ON onboarding FOR ALL USING (auth.uid() = user_id);

-- User sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;

CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 5: Create Functions
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, full_name, username, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    false
  );

  -- Create onboarding record
  INSERT INTO onboarding (user_id, completed, current_step)
  VALUES (NEW.id, false, 'welcome');

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 6: Create Triggers
-- =============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_onboarding_updated_at ON onboarding;

-- Create new triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: Create Safe Indexes
-- =============================================================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding(completed);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Conditional indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_token') THEN
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_profiles' AND column_name = 'city') THEN
    CREATE INDEX IF NOT EXISTS idx_venue_profiles_city ON venue_profiles(city);
  END IF;
END $$;

-- =============================================================================
-- STEP 8: Grant Permissions
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- Success Message
-- =============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '=== AUTH SETUP COMPLETED SUCCESSFULLY! ===';
  RAISE NOTICE 'Tables: profiles, onboarding, user_sessions updated/created';
  RAISE NOTICE 'Missing columns added to existing tables';
  RAISE NOTICE 'RLS policies and triggers configured';
  RAISE NOTICE 'Your login/signup flow is now ready!';
END $$; 