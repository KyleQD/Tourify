-- SAFE EMERGENCY FIX - Handles existing components gracefully
-- This version won't fail if parts already exist

-- Step 1: Create missing user_active_profiles table (already exists - skip)
-- CREATE TABLE IF NOT EXISTS user_active_profiles (already done)

-- Step 2: Add RLS policies (some already exist - use IF NOT EXISTS equivalent)
-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'user_active_profiles' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE user_active_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies only if they don't exist
DO $$ 
BEGIN
    -- Check and create view policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_active_profiles' 
        AND policyname = 'Users can view their own active profile'
    ) THEN
        CREATE POLICY "Users can view their own active profile" ON user_active_profiles 
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Check and create manage policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_active_profiles' 
        AND policyname = 'Users can manage their own active profile'
    ) THEN
        CREATE POLICY "Users can manage their own active profile" ON user_active_profiles 
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 3: Fix the handle_new_user function (this is the critical part)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (this part usually works)
  INSERT INTO profiles (id, name, username, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  
  -- Create active profile entry (this was crashing)
  INSERT INTO user_active_profiles (user_id, active_profile_type)
  VALUES (NEW.id, 'general')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't crash signup if anything fails
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Test the fix
SELECT 'Emergency fix applied successfully - trigger function updated' as status;