-- =============================================================================
-- PHASE 2: HIGH PRIORITY ISSUES - SECURITY & RLS
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
-- STEP 2.1: IDENTIFY TABLES MISSING RLS
-- =============================================================================

-- Check which tables don't have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = false THEN '🚨 CRITICAL: RLS Disabled'
    ELSE '✅ RLS Enabled'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- =============================================================================
-- STEP 2.2: ENABLE RLS ON ALL TABLES
-- =============================================================================

-- Enable RLS on all public tables (run this section)
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    RAISE NOTICE '✅ Enabled RLS on table: %', table_record.tablename;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 2.3: CREATE BASIC SECURITY POLICIES
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Users can read all profiles (public data)
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- =============================================================================
-- POSTS TABLE POLICIES
-- =============================================================================

-- Users can read all posts (public data)
CREATE POLICY "Users can read all posts" ON posts
  FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- EVENTS TABLE POLICIES
-- =============================================================================

-- Users can read all events (public data)
CREATE POLICY "Users can read all events" ON events
  FOR SELECT USING (true);

-- Users can insert their own events
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- ACCOUNTS TABLE POLICIES
-- =============================================================================

-- Users can read all accounts (public data)
CREATE POLICY "Users can read all accounts" ON accounts
  FOR SELECT USING (true);

-- Users can insert their own account
CREATE POLICY "Users can insert their own account" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own account
CREATE POLICY "Users can update their own account" ON accounts
  FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own account
CREATE POLICY "Users can delete their own account" ON accounts
  FOR DELETE USING (auth.uid() = id);

-- =============================================================================
-- FOLLOWS TABLE POLICIES
-- =============================================================================

-- Users can read all follows (public data)
CREATE POLICY "Users can read all follows" ON follows
  FOR SELECT USING (true);

-- Users can insert their own follows
CREATE POLICY "Users can insert their own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can update their own follows
CREATE POLICY "Users can update their own follows" ON follows
  FOR UPDATE USING (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete their own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- =============================================================================
-- LIKES TABLE POLICIES
-- =============================================================================

-- Users can read all likes (public data)
CREATE POLICY "Users can read all likes" ON likes
  FOR SELECT USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert their own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own likes
CREATE POLICY "Users can update their own likes" ON likes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- COMMENTS TABLE POLICIES
-- =============================================================================

-- Users can read all comments (public data)
CREATE POLICY "Users can read all comments" ON comments
  FOR SELECT USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================================================

-- Users can only read their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notifications
CREATE POLICY "Users can insert their own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 2.4: VERIFY POLICIES WERE CREATED
-- =============================================================================

-- Check all created policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =============================================================================
-- STEP 2.5: TEST SECURITY POLICIES
-- =============================================================================

-- Test that users can only access their own data
-- (This will be tested with actual user accounts)

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. RUN PHASE 1 FIRST - Critical issues must be resolved
-- 2. ENABLE RLS ON ALL TABLES
-- 3. CREATE POLICIES FOR EACH TABLE
-- 4. TEST WITH DIFFERENT USER ACCOUNTS
-- 5. VERIFY ACCESS CONTROL IS WORKING
--
-- NEXT STEPS AFTER THIS SCRIPT:
-- - Test policies with different user roles
-- - Verify users can only access their own data
-- - Check that public data is still accessible
-- - Document any policy issues
--
-- =============================================================================
