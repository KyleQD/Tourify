-- EMERGENCY AUTH FIX
-- This fixes the immediate signup failure issue
-- Run this in Supabase SQL Editor to restore basic functionality

-- Step 1: Create missing user_active_profiles table
CREATE TABLE IF NOT EXISTS user_active_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  active_profile_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE user_active_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active profile" ON user_active_profiles 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own active profile" ON user_active_profiles 
  FOR ALL USING (auth.uid() = user_id);

-- Step 2: Ensure profiles table has all required columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Create a robust handle_new_user function that won't crash
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile with error handling
  BEGIN
    INSERT INTO profiles (id, name, username, full_name, onboarding_completed, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
      NOW(),
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update it instead
      UPDATE profiles SET
        name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', name),
        username = COALESCE(NEW.raw_user_meta_data->>'username', username),
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
        updated_at = NOW()
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't crash
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Try to create active profile entry
  BEGIN
    INSERT INTO user_active_profiles (user_id, active_profile_type)
    VALUES (NEW.id, 'general');
  EXCEPTION
    WHEN unique_violation THEN
      -- Active profile already exists, skip
      NULL;
    WHEN OTHERS THEN
      -- Log error but don't crash
      RAISE WARNING 'Error creating active profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log error but don't crash the signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Create onboarding table if it doesn't exist with correct schema
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  general_profile_completed BOOLEAN DEFAULT FALSE,
  artist_profile_completed BOOLEAN DEFAULT FALSE,
  venue_profile_completed BOOLEAN DEFAULT FALSE,
  active_profile_type TEXT DEFAULT 'general',
  steps JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS for onboarding
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding" ON onboarding 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding" ON onboarding 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding" ON onboarding 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 6: Test the fix by checking if trigger function works
-- This will be validated by running a test signup