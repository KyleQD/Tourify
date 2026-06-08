-- Setup Signup Flow - Essential Database Changes
-- Run this script directly in Supabase SQL Editor or psql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add onboarding_completed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add account_settings column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE profiles ADD COLUMN account_settings JSONB DEFAULT '{
      "privacy": {"profile_public": true, "show_activity": true, "allow_messages": true},
      "notifications": {"email": true, "push": true, "sms": false},
      "posting_permissions": {"as_artist": false, "as_venue": false, "as_admin": false}
    }'::jsonb;
  END IF;
END $$;

-- Update the handle_new_user function to include additional metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, username, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists, just return NEW
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to create artist account
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

  -- Update profile to mark onboarding as completed
  UPDATE profiles SET onboarding_completed = true WHERE id = user_id;

  RETURN artist_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to create venue account
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
  INSERT INTO venue_profiles (user_id, venue_name, description, address, capacity)
  VALUES (user_id, venue_name, description, address, capacity)
  RETURNING id INTO venue_profile_id;

  -- Update profile to mark onboarding as completed
  UPDATE profiles SET onboarding_completed = true WHERE id = user_id;

  RETURN venue_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id); 