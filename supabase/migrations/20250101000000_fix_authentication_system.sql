set client_min_messages = warning;

-- Comprehensive Authentication System Fix
-- This migration consolidates all authentication fixes and ensures proper user signup

-- Step 1: Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Drop all existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_enhanced ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- Step 3: Create a robust, consolidated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _full_name TEXT;
  _profile_name TEXT;
BEGIN
  -- Extract metadata with proper fallbacks
  _username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(COALESCE(NEW.email, NEW.phone, NEW.id::text), '@', 1)
  );
  
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    _username
  );
  
  _profile_name := COALESCE(_full_name, _username);

  -- Step 1: Create or update profile with UPSERT
  BEGIN
    INSERT INTO public.profiles (
      id, 
      name, 
      username, 
      full_name, 
      email,
      onboarding_completed,
      created_at, 
      updated_at
    ) VALUES (
      NEW.id, 
      _profile_name,
      _username, 
      _full_name, 
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'onboarding_completed')::boolean, false),
      NOW(), 
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, profiles.name),
      username = COALESCE(EXCLUDED.username, profiles.username),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW();
      
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating/updating profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;

  -- Step 2: Create user_active_profiles entry
  BEGIN
    INSERT INTO public.user_active_profiles (
      user_id, 
      active_profile_type, 
      created_at, 
      updated_at
    ) VALUES (
      NEW.id, 
      'general', 
      NOW(), 
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      active_profile_type = COALESCE(EXCLUDED.active_profile_type, user_active_profiles.active_profile_type),
      updated_at = NOW();
      
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating active profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;

  -- Step 3: Create onboarding state if not exists
  BEGIN
    INSERT INTO public.onboarding (
      user_id,
      general_profile_completed,
      artist_profile_completed,
      venue_profile_completed,
      active_profile_type,
      steps,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      false,
      false,
      false,
      'general',
      '{
        "general": {
          "basic_info": false,
          "preferences": false
        },
        "artist": {
          "basic_info": false,
          "genres": false,
          "social": false
        },
        "venue": {
          "basic_info": false,
          "location": false,
          "amenities": false
        }
      }'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating onboarding state for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log error but don't crash the signup
    RAISE WARNING 'Unexpected error in handle_new_user for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure profiles table has the correct structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE public.profiles ADD COLUMN account_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_active_profiles_user_id ON public.user_active_profiles(user_id);

-- Step 7: Add RLS policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy for service role to manage profiles
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Step 8: Add RLS policies for user_active_profiles table
ALTER TABLE public.user_active_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their active profiles
DROP POLICY IF EXISTS "Users can manage own active profiles" ON public.user_active_profiles;
CREATE POLICY "Users can manage own active profiles" ON public.user_active_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Policy for service role to manage active profiles
DROP POLICY IF EXISTS "Service role can manage active profiles" ON public.user_active_profiles;
CREATE POLICY "Service role can manage active profiles" ON public.user_active_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Step 9: Add RLS policies for onboarding table
ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their onboarding
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding
  FOR ALL USING (auth.uid() = user_id);

-- Policy for service role to manage onboarding
DROP POLICY IF EXISTS "Service role can manage onboarding" ON public.onboarding;
CREATE POLICY "Service role can manage onboarding" ON public.onboarding
  FOR ALL USING (auth.role() = 'service_role');

-- Step 10: Create a function to manually fix existing users without profiles
CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        name, 
        username, 
        full_name, 
        email,
        onboarding_completed,
        created_at, 
        updated_at
      ) VALUES (
        user_record.id, 
        COALESCE(
          user_record.raw_user_meta_data->>'full_name',
          user_record.raw_user_meta_data->>'name',
          split_part(user_record.email, '@', 1)
        ),
        COALESCE(
          user_record.raw_user_meta_data->>'username',
          user_record.raw_user_meta_data->>'name',
          split_part(user_record.email, '@', 1)
        ),
        COALESCE(
          user_record.raw_user_meta_data->>'full_name',
          user_record.raw_user_meta_data->>'name',
          split_part(user_record.email, '@', 1)
        ),
        user_record.email,
        false,
        NOW(), 
        NOW()
      );
      
      RAISE NOTICE 'Created profile for user %', user_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Run the fix function
SELECT public.fix_missing_profiles();

-- Step 12: Clean up the fix function
DROP FUNCTION public.fix_missing_profiles();
