-- ENHANCED TRIGGER FIX - With detailed logging and error handling
-- This will help us see exactly what's failing during signup

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_name TEXT;
  profile_username TEXT;
  profile_full_name TEXT;
  profile_onboarding BOOLEAN;
BEGIN
  -- Log the start of function
  RAISE NOTICE 'handle_new_user: Starting for user %', NEW.id;
  RAISE NOTICE 'handle_new_user: Email %', NEW.email;
  RAISE NOTICE 'handle_new_user: Metadata %', NEW.raw_user_meta_data;
  
  -- Prepare the data with careful type handling
  profile_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  profile_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  profile_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  profile_onboarding := COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false);
  
  RAISE NOTICE 'handle_new_user: Prepared data - name: %, username: %, full_name: %, onboarding: %', 
    profile_name, profile_username, profile_full_name, profile_onboarding;
  
  -- Step 1: Try to create profile
  BEGIN
    RAISE NOTICE 'handle_new_user: Attempting to insert into profiles table';
    
    INSERT INTO profiles (
      id, 
      name, 
      username, 
      full_name, 
      onboarding_completed,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      profile_name,
      profile_username,
      profile_full_name,
      profile_onboarding,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'handle_new_user: Successfully inserted into profiles table';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'handle_new_user: Profile already exists, updating instead';
      UPDATE profiles SET
        name = COALESCE(profile_name, name),
        username = COALESCE(profile_username, username),
        full_name = COALESCE(profile_full_name, full_name),
        onboarding_completed = profile_onboarding,
        updated_at = NOW()
      WHERE id = NEW.id;
      RAISE NOTICE 'handle_new_user: Profile updated successfully';
      
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error inserting into profiles for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
      -- Don't return here - continue to try user_active_profiles
  END;
  
  -- Step 2: Try to create active profile entry
  BEGIN
    RAISE NOTICE 'handle_new_user: Attempting to insert into user_active_profiles table';
    
    INSERT INTO user_active_profiles (user_id, active_profile_type, created_at, updated_at)
    VALUES (NEW.id, 'general', NOW(), NOW());
    
    RAISE NOTICE 'handle_new_user: Successfully inserted into user_active_profiles table';
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'handle_new_user: Active profile already exists, skipping';
      
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: Error inserting into user_active_profiles for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
      -- Don't crash the signup even if this fails
  END;
  
  RAISE NOTICE 'handle_new_user: Function completed successfully for user %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log error but don't crash the signup
    RAISE WARNING 'handle_new_user: Unexpected error for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test completion
SELECT 'Enhanced trigger function with logging applied successfully' as status;