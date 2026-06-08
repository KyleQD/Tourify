-- =============================================================================
-- FIX PROFILE CREATION TRIGGER
-- This script ensures that when users sign up, profiles are automatically created
-- =============================================================================

-- =============================================================================
-- STEP 1: DIAGNOSE THE CURRENT STATE
-- =============================================================================

DO $$
DECLARE
  auth_users_count INTEGER;
  profiles_count INTEGER;
  missing_profiles_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 DIAGNOSING PROFILE CREATION ISSUE...';
  RAISE NOTICE '=========================================';
  
  -- Count auth users
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  RAISE NOTICE 'Auth users: %', auth_users_count;
  
  -- Count profiles
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  RAISE NOTICE 'Profiles: %', profiles_count;
  
  -- Count missing profiles
  SELECT COUNT(*) INTO missing_profiles_count 
  FROM auth.users u 
  LEFT JOIN profiles p ON u.id = p.id 
  WHERE p.id IS NULL;
  
  RAISE NOTICE 'Missing profiles: %', missing_profiles_count;
  
  IF missing_profiles_count > 0 THEN
    RAISE NOTICE '❌ ISSUE FOUND: % users are missing profiles!', missing_profiles_count;
  ELSE
    RAISE NOTICE '✅ All users have profiles';
  END IF;
END $$;

-- Show which users are missing profiles
SELECT 'USERS MISSING PROFILES:' as info;
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as display_name,
  u.created_at
FROM auth.users u 
LEFT JOIN profiles p ON u.id = p.id 
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- =============================================================================
-- STEP 2: CHECK IF THE TRIGGER EXISTS
-- =============================================================================

SELECT 'CHECKING TRIGGER:' as info;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%profile%' 
  OR trigger_name LIKE '%user%'
  OR event_object_table = 'users';

-- Check if the function exists
SELECT 'CHECKING FUNCTION:' as info;
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%profile%' 
  OR routine_name LIKE '%user%';

-- =============================================================================
-- STEP 3: CREATE THE MISSING FUNCTION AND TRIGGER
-- =============================================================================

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.created_at,
    NEW.created_at
  );
  
  RAISE NOTICE '✅ Created profile for user: % (%)', NEW.email, NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- STEP 4: CREATE PROFILES FOR EXISTING USERS
-- =============================================================================

DO $$
DECLARE
  user_record RECORD;
  profiles_created INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 CREATING PROFILES FOR EXISTING USERS...';
  RAISE NOTICE '=============================================';
  
  -- Loop through users without profiles and create them
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data,
      u.created_at
    FROM auth.users u 
    LEFT JOIN profiles p ON u.id = p.id 
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        role,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1)),
        COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', 'User'),
        COALESCE(user_record.raw_user_meta_data->>'avatar_url', NULL),
        COALESCE(user_record.raw_user_meta_data->>'role', 'user'),
        user_record.created_at,
        user_record.created_at
      );
      
      profiles_created := profiles_created + 1;
      RAISE NOTICE '✅ Created profile for: % (%)', user_record.email, user_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating profile for %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '📊 SUMMARY: Created % profiles for existing users', profiles_created;
END $$;

-- =============================================================================
-- STEP 5: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  auth_users_count INTEGER;
  profiles_count INTEGER;
  missing_profiles_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 VERIFICATION RESULTS...';
  RAISE NOTICE '==========================';
  
  -- Count auth users
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  RAISE NOTICE 'Auth users: %', auth_users_count;
  
  -- Count profiles
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  RAISE NOTICE 'Profiles: %', profiles_count;
  
  -- Count missing profiles
  SELECT COUNT(*) INTO missing_profiles_count 
  FROM auth.users u 
  LEFT JOIN profiles p ON u.id = p.id 
  WHERE p.id IS NULL;
  
  RAISE NOTICE 'Missing profiles: %', missing_profiles_count;
  
  IF missing_profiles_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All users now have profiles!';
  ELSE
    RAISE NOTICE '⚠️ WARNING: Still % users missing profiles', missing_profiles_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test signing up a new user - should automatically create profile';
  RAISE NOTICE '2. Check that existing users can now access their profiles';
  RAISE NOTICE '3. Verify that profile data is properly linked to auth users';
END $$;

-- =============================================================================
-- STEP 6: SHOW FINAL STATE
-- =============================================================================

-- Show final count comparison
SELECT 'FINAL COMPARISON:' as info;
SELECT 
  'Auth Users' as table_name,
  COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
  'Profiles' as table_name,
  COUNT(*) as record_count
FROM profiles;

-- Show sample of linked profiles
SELECT 'SAMPLE LINKED PROFILES:' as info;
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.role,
  u.email,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5;
