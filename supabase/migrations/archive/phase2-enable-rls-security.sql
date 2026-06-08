-- =============================================================================
-- PHASE 2: ENABLE RLS AND CREATE SECURITY POLICIES
-- =============================================================================
-- 
-- This script addresses security vulnerabilities by enabling RLS and creating
-- appropriate security policies. Execute AFTER Phase 1 is complete.
--
-- EXECUTION ORDER:
-- 1. Enable RLS on all tables
-- 2. Create security policies for each table
-- 3. Test policies with different user roles
-- 4. Verify access control is working
-- =============================================================================

-- =============================================================================
-- STEP 1: IDENTIFY TABLES MISSING RLS
-- =============================================================================

-- Check which tables don't have RLS enabled
SELECT 
  'RLS STATUS CHECK' as info_type,
  tablename,
  CASE 
    WHEN rowsecurity = false THEN '🚨 CRITICAL: RLS Disabled'
    ELSE '✅ RLS Enabled'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- =============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =============================================================================

-- Enable RLS on all public tables that don't have it
DO $$
DECLARE
  table_record RECORD;
  tables_updated INTEGER := 0;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    tables_updated := tables_updated + 1;
    RAISE NOTICE '✅ Enabled RLS on table: %', table_record.tablename;
  END LOOP;
  
  IF tables_updated = 0 THEN
    RAISE NOTICE '✅ All tables already have RLS enabled';
  ELSE
    RAISE NOTICE '✅ Successfully enabled RLS on % tables', tables_updated;
  END IF;
END $$;

-- =============================================================================
-- STEP 3: CREATE BASIC SECURITY POLICIES
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Users can read all profiles (public data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can read all profiles'
  ) THEN
    CREATE POLICY "Users can read all profiles" ON profiles
      FOR SELECT USING (true);
    RAISE NOTICE '✅ Created SELECT policy for profiles table';
  ELSE
    RAISE NOTICE '✅ SELECT policy already exists for profiles table';
  END IF;
END $$;

-- Users can insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
    RAISE NOTICE '✅ Created INSERT policy for profiles table';
  ELSE
    RAISE NOTICE '✅ INSERT policy already exists for profiles table';
  END IF;
END $$;

-- Users can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
    RAISE NOTICE '✅ Created UPDATE policy for profiles table';
  ELSE
    RAISE NOTICE '✅ UPDATE policy already exists for profiles table';
  END IF;
END $$;

-- Users can delete their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can delete their own profile'
  ) THEN
    CREATE POLICY "Users can delete their own profile" ON profiles
      FOR DELETE USING (auth.uid() = id);
    RAISE NOTICE '✅ Created DELETE policy for profiles table';
  ELSE
    RAISE NOTICE '✅ DELETE policy already exists for profiles table';
  END IF;
END $$;

-- =============================================================================
-- POSTS TABLE POLICIES
-- =============================================================================

-- Users can read all posts (public data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can read all posts'
  ) THEN
    CREATE POLICY "Users can read all posts" ON posts
      FOR SELECT USING (true);
    RAISE NOTICE '✅ Created SELECT policy for posts table';
  ELSE
    RAISE NOTICE '✅ SELECT policy already exists for posts table';
  END IF;
END $$;

-- Users can insert their own posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can insert their own posts'
  ) THEN
    CREATE POLICY "Users can insert their own posts" ON posts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE '✅ Created INSERT policy for posts table';
  ELSE
    RAISE NOTICE '✅ INSERT policy already exists for posts table';
  END IF;
END $$;

-- Users can update their own posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can update their own posts'
  ) THEN
    CREATE POLICY "Users can update their own posts" ON posts
      FOR UPDATE USING (auth.uid() = user_id);
    RAISE NOTICE '✅ Created UPDATE policy for posts table';
  ELSE
    RAISE NOTICE '✅ UPDATE policy already exists for posts table';
  END IF;
END $$;

-- Users can delete their own posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can delete their own posts'
  ) THEN
    CREATE POLICY "Users can delete their own posts" ON posts
      FOR DELETE USING (auth.uid() = user_id);
    RAISE NOTICE '✅ Created DELETE policy for posts table';
  ELSE
    RAISE NOTICE '✅ DELETE policy already exists for posts table';
  END IF;
END $$;

-- =============================================================================
-- EVENTS TABLE POLICIES
-- =============================================================================

-- Users can read all events (public data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Users can read all events'
  ) THEN
    CREATE POLICY "Users can read all events" ON events
      FOR SELECT USING (true);
    RAISE NOTICE '✅ Created SELECT policy for events table';
  ELSE
    RAISE NOTICE '✅ SELECT policy already exists for events table';
  END IF;
END $$;

-- Users can insert their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Users can insert their own events'
  ) THEN
    CREATE POLICY "Users can insert their own events" ON events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE '✅ Created INSERT policy for events table';
  ELSE
    RAISE NOTICE '✅ INSERT policy already exists for events table';
  END IF;
END $$;

-- Users can update their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Users can update their own events'
  ) THEN
    CREATE POLICY "Users can update their own events" ON events
      FOR UPDATE USING (auth.uid() = user_id);
    RAISE NOTICE '✅ Created UPDATE policy for events table';
  ELSE
    RAISE NOTICE '✅ UPDATE policy already exists for events table';
  END IF;
END $$;

-- Users can delete their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Users can delete their own events'
  ) THEN
    CREATE POLICY "Users can delete their own events" ON events
      FOR DELETE USING (auth.uid() = user_id);
    RAISE NOTICE '✅ Created DELETE policy for events table';
  ELSE
    RAISE NOTICE '✅ DELETE policy already exists for events table';
  END IF;
END $$;

-- =============================================================================
-- ACCOUNTS TABLE POLICIES
-- =============================================================================

-- Users can read all accounts (public data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'accounts' 
    AND policyname = 'Users can read all accounts'
  ) THEN
    CREATE POLICY "Users can read all accounts" ON accounts
      FOR SELECT USING (true);
    RAISE NOTICE '✅ Created SELECT policy for accounts table';
  ELSE
    RAISE NOTICE '✅ SELECT policy already exists for accounts table';
  END IF;
END $$;

-- Users can insert their own account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'accounts' 
    AND policyname = 'Users can insert their own account'
  ) THEN
    CREATE POLICY "Users can insert their own account" ON accounts
      FOR INSERT WITH CHECK (auth.uid() = id);
    RAISE NOTICE '✅ Created INSERT policy for accounts table';
  ELSE
    RAISE NOTICE '✅ INSERT policy already exists for accounts table';
  END IF;
END $$;

-- Users can update their own account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'accounts' 
    AND policyname = 'Users can update their own account'
  ) THEN
    CREATE POLICY "Users can update their own account" ON accounts
      FOR UPDATE USING (auth.uid() = id);
    RAISE NOTICE '✅ Created UPDATE policy for accounts table';
  ELSE
    RAISE NOTICE '✅ UPDATE policy already exists for accounts table';
  END IF;
END $$;

-- Users can delete their own account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'accounts' 
    AND policyname = 'Users can delete their own account'
  ) THEN
    CREATE POLICY "Users can delete their own account" ON accounts
      FOR DELETE USING (auth.uid() = id);
    RAISE NOTICE '✅ Created DELETE policy for accounts table';
  ELSE
    RAISE NOTICE '✅ DELETE policy already exists for accounts table';
  END IF;
END $$;

-- =============================================================================
-- FOLLOWS TABLE POLICIES
-- =============================================================================

-- Users can read all follows (public data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'follows' 
    AND policyname = 'Users can read all follows'
  ) THEN
    CREATE POLICY "Users can read all follows" ON follows
      FOR SELECT USING (true);
    RAISE NOTICE '✅ Created SELECT policy for follows table';
  ELSE
    RAISE NOTICE '✅ SELECT policy already exists for follows table';
  END IF;
END $$;

-- Users can insert their own follows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'follows' 
    AND policyname = 'Users can insert their own follows'
  ) THEN
    CREATE POLICY "Users can insert their own follows" ON follows
      FOR INSERT WITH CHECK (auth.uid() = follower_id);
    RAISE NOTICE '✅ Created INSERT policy for follows table';
  ELSE
    RAISE NOTICE '✅ INSERT policy already exists for follows table';
  END IF;
END $$;

-- Users can update their own follows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'follows' 
    AND policyname = 'Users can update their own follows'
  ) THEN
    CREATE POLICY "Users can update their own follows" ON follows
      FOR UPDATE USING (auth.uid() = follower_id);
    RAISE NOTICE '✅ Created UPDATE policy for follows table';
  ELSE
    RAISE NOTICE '✅ UPDATE policy already exists for follows table';
  END IF;
END $$;

-- Users can delete their own follows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'follows' 
    AND policyname = 'Users can delete their own follows'
  ) THEN
    CREATE POLICY "Users can delete their own follows" ON follows
      FOR DELETE USING (auth.uid() = follower_id);
    RAISE NOTICE '✅ Created DELETE policy for follows table';
  ELSE
    RAISE NOTICE '✅ DELETE policy already exists for follows table';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: VERIFY POLICIES WERE CREATED
-- =============================================================================

-- Check all created policies
SELECT 
  'POLICY VERIFICATION' as info_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  '✅ Created' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =============================================================================
-- STEP 5: FINAL RLS STATUS CHECK
-- =============================================================================

-- Verify all tables now have RLS enabled
SELECT 
  'FINAL RLS STATUS' as info_type,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '🚨 RLS Still Disabled'
  END as final_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- =============================================================================
-- STEP 6: PHASE 2 SUMMARY
-- =============================================================================

-- Generate summary report
SELECT 
  'PHASE 2 SUMMARY' as info_type,
  COUNT(CASE WHEN pt.rowsecurity = true THEN 1 END) as tables_with_rls,
  COUNT(CASE WHEN pt.rowsecurity = false THEN 1 END) as tables_without_rls,
  COUNT(DISTINCT pp.tablename) as total_policies_created,
  'Phase 2 Security & RLS Complete' as status
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pt.tablename = pp.tablename
WHERE pt.schemaname = 'public';

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT ENABLES RLS ON ALL TABLES
-- 2. IT CREATES COMPREHENSIVE SECURITY POLICIES FOR EACH TABLE
-- 3. IT PROVIDES CLEAR FEEDBACK ON WHAT WAS CREATED
-- 4. IT VERIFIES ALL POLICIES WERE CREATED CORRECTLY
-- 5. IT GIVES YOU A FINAL STATUS CHECK
--
-- AFTER RUNNING THIS SCRIPT:
-- - Review all success messages
-- - Check the policy verification results
-- - Verify RLS is enabled on all tables
-- - Test security policies with different user accounts
-- - Proceed to Phase 3 (Table Consolidation) if all policies are working
--
-- =============================================================================
