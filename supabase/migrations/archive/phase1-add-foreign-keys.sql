-- =============================================================================
-- PHASE 1: ADD FOREIGN KEY CONSTRAINTS TO CORE TABLES
-- =============================================================================
-- 
-- This script adds foreign key constraints to the most critical tables
-- based on the analysis from the previous script.
--
-- EXECUTION ORDER:
-- 1. Add foreign keys to posts table
-- 2. Add foreign keys to events table  
-- 3. Add foreign keys to follows table
-- 4. Add foreign keys to other critical tables
-- 5. Verify all constraints were added
-- =============================================================================

-- =============================================================================
-- STEP 1: ADD FOREIGN KEY TO POSTS TABLE
-- =============================================================================

-- Add foreign key constraint for posts.user_id -> auth.users(id)
DO $$
BEGIN
  -- Check if posts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
    
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'posts_user_id_fkey' 
      AND table_name = 'posts'
    ) THEN
      
      -- Check if we can safely add the constraint (no orphaned records)
      IF NOT EXISTS (
        SELECT 1 FROM posts p
        LEFT JOIN auth.users u ON p.user_id = u.id
        WHERE u.id IS NULL
      ) THEN
        -- Add the foreign key constraint
        ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ SUCCESS: Added FK constraint posts.user_id -> auth.users(id)';
      ELSE
        RAISE NOTICE '⚠️ WARNING: Cannot add FK constraint - posts.user_id has orphaned records';
        RAISE NOTICE '   You need to clean up orphaned records before adding this constraint';
      END IF;
    ELSE
      RAISE NOTICE '✅ INFO: FK constraint already exists: posts.user_id -> auth.users(id)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ INFO: posts table does not exist - skipping';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: ADD FOREIGN KEY TO EVENTS TABLE
-- =============================================================================

-- Add foreign key constraint for events.user_id -> auth.users(id)
DO $$
BEGIN
  -- Check if events table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'events_user_id_fkey' 
      AND table_name = 'events'
    ) THEN
      
      -- Check if we can safely add the constraint (no orphaned records)
      IF NOT EXISTS (
        SELECT 1 FROM events e
        LEFT JOIN auth.users u ON e.user_id = u.id
        WHERE u.id IS NULL
      ) THEN
        -- Add the foreign key constraint
        ALTER TABLE events ADD CONSTRAINT events_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ SUCCESS: Added FK constraint events.user_id -> auth.users(id)';
      ELSE
        RAISE NOTICE '⚠️ WARNING: Cannot add FK constraint - events.user_id has orphaned records';
        RAISE NOTICE '   You need to clean up orphaned records before adding this constraint';
      END IF;
    ELSE
      RAISE NOTICE '✅ INFO: FK constraint already exists: events.user_id -> auth.users(id)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ INFO: events table does not exist - skipping';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: ADD FOREIGN KEYS TO FOLLOWS TABLE
-- =============================================================================

-- Add foreign key constraint for follows.follower_id -> profiles(id)
DO $$
BEGIN
  -- Check if follows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows' AND table_schema = 'public') THEN
    
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'follows_follower_id_fkey' 
      AND table_name = 'follows'
    ) THEN
      
      -- Check if we can safely add the constraint (no orphaned records)
      IF NOT EXISTS (
        SELECT 1 FROM follows f
        LEFT JOIN profiles p ON f.follower_id = p.id
        WHERE p.id IS NULL
      ) THEN
        -- Add the foreign key constraint
        ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey 
          FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ SUCCESS: Added FK constraint follows.follower_id -> profiles(id)';
      ELSE
        RAISE NOTICE '⚠️ WARNING: Cannot add FK constraint - follows.follower_id has orphaned records';
        RAISE NOTICE '   You need to clean up orphaned records before adding this constraint';
      END IF;
    ELSE
      RAISE NOTICE '✅ INFO: FK constraint already exists: follows.follower_id -> profiles(id)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ INFO: follows table does not exist - skipping';
  END IF;
END $$;

-- Add foreign key constraint for follows.following_id -> profiles(id)
DO $$
BEGIN
  -- Check if follows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows' AND table_schema = 'public') THEN
    
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'follows_following_id_fkey' 
      AND table_name = 'follows'
    ) THEN
      
      -- Check if we can safely add the constraint (no orphaned records)
      IF NOT EXISTS (
        SELECT 1 FROM follows f
        LEFT JOIN profiles p ON f.following_id = p.id
        WHERE p.id IS NULL
      ) THEN
        -- Add the foreign key constraint
        ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey 
          FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ SUCCESS: Added FK constraint follows.following_id -> profiles(id)';
      ELSE
        RAISE NOTICE '⚠️ WARNING: Cannot add FK constraint - follows.following_id has orphaned records';
        RAISE NOTICE '   You need to clean up orphaned records before adding this constraint';
      END IF;
    ELSE
      RAISE NOTICE '✅ INFO: FK constraint already exists: follows.following_id -> profiles(id)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ INFO: follows table does not exist - skipping';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: ADD FOREIGN KEYS TO OTHER CRITICAL TABLES
-- =============================================================================

-- Add foreign key constraint for accounts.id -> auth.users(id) (if accounts table exists)
DO $$
BEGIN
  -- Check if accounts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public') THEN
    
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'accounts_id_fkey' 
      AND table_name = 'accounts'
    ) THEN
      
      -- Check if we can safely add the constraint (no orphaned records)
      IF NOT EXISTS (
        SELECT 1 FROM accounts a
        LEFT JOIN auth.users u ON a.id = u.id
        WHERE u.id IS NULL
      ) THEN
        -- Add the foreign key constraint
        ALTER TABLE accounts ADD CONSTRAINT accounts_id_fkey 
          FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ SUCCESS: Added FK constraint accounts.id -> auth.users(id)';
      ELSE
        RAISE NOTICE '⚠️ WARNING: Cannot add FK constraint - accounts.id has orphaned records';
        RAISE NOTICE '   You need to clean up orphaned records before adding this constraint';
      END IF;
    ELSE
      RAISE NOTICE '✅ INFO: FK constraint already exists: accounts.id -> auth.users(id)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ INFO: accounts table does not exist - skipping';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: VERIFY ALL FOREIGN KEY CONSTRAINTS WERE ADDED
-- =============================================================================

-- Show all foreign key constraints after our fixes
SELECT 
  'FOREIGN KEY VERIFICATION' as info_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  '✅ Added' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('posts', 'events', 'follows', 'accounts')
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- STEP 6: SUMMARY OF WHAT WAS ACCOMPLISHED
-- =============================================================================

-- Generate a summary report
SELECT 
  'PHASE 1 SUMMARY' as info_type,
  COUNT(CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN 1 END) as total_fk_constraints,
  COUNT(CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1 END) as tables_with_pk,
  'Phase 1 Foreign Key Constraints Added' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public';

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT ADDS FOREIGN KEY CONSTRAINTS TO THE MOST CRITICAL TABLES
-- 2. IT CHECKS FOR ORPHANED RECORDS BEFORE ADDING CONSTRAINTS
-- 3. IT PROVIDES CLEAR FEEDBACK ON WHAT WAS SUCCESSFUL VS. WHAT NEEDS ATTENTION
-- 4. IT VERIFIES ALL CONSTRAINTS WERE ADDED CORRECTLY
-- 5. IT GIVES YOU A SUMMARY OF WHAT WAS ACCOMPLISHED
--
-- AFTER RUNNING THIS SCRIPT:
-- - Review the success/warning messages
-- - Address any orphaned record issues if warnings appear
-- - Check the verification results to confirm constraints were added
-- - Proceed to Phase 2 (Security & RLS) if all constraints were added successfully
--
-- =============================================================================
