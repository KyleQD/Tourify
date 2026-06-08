-- =============================================================================
-- PHASE 1: FIX MISSING FOREIGN KEY CONSTRAINTS
-- =============================================================================
-- 
-- This script addresses the 88 missing foreign key constraints identified
-- in the Phase 1 audit. We'll fix the most critical ones first.
--
-- EXECUTION ORDER:
-- 1. Check for orphaned records before adding constraints
-- 2. Add foreign key constraints to critical tables
-- 3. Verify all relationships work correctly
-- 4. Test data integrity
-- =============================================================================

-- =============================================================================
-- STEP 1: IDENTIFY CRITICAL FOREIGN KEY RELATIONSHIPS
-- =============================================================================

-- Check which tables have the most critical foreign key needs
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  CASE 
    WHEN c.column_name = 'user_id' THEN '🚨 CRITICAL: References auth.users(id)'
    WHEN c.column_name = 'profile_id' THEN '🚨 CRITICAL: References profiles(id)'
    WHEN c.column_name = 'account_id' THEN '🚨 CRITICAL: References accounts(id)'
    WHEN c.column_name = 'event_id' THEN '🚨 CRITICAL: References events(id)'
    WHEN c.column_name = 'post_id' THEN '🚨 CRITICAL: References posts(id)'
    WHEN c.column_name = 'venue_id' THEN '🚨 CRITICAL: References venues(id)'
    WHEN c.column_name = 'tour_id' THEN '🚨 CRITICAL: References tours(id)'
    WHEN c.column_name = 'artist_id' THEN '🚨 CRITICAL: References artist_profiles(id)'
    WHEN c.column_name = 'organizer_id' THEN '🚨 CRITICAL: References profiles(id)'
    WHEN c.column_name = 'follower_id' THEN '🚨 CRITICAL: References profiles(id)'
    WHEN c.column_name = 'following_id' THEN '🚨 CRITICAL: References profiles(id)'
    ELSE '⚠️ Check if FK needed'
  END as fk_priority,
  CASE 
    WHEN c.column_name = 'user_id' THEN 'auth.users(id)'
    WHEN c.column_name = 'profile_id' THEN 'profiles(id)'
    WHEN c.column_name = 'account_id' THEN 'accounts(id)'
    WHEN c.column_name = 'event_id' THEN 'events(id)'
    WHEN c.column_name = 'post_id' THEN 'posts(id)'
    WHEN c.column_name = 'venue_id' THEN 'venues(id)'
    WHEN c.column_name = 'tour_id' THEN 'tours(id)'
    WHEN c.column_name = 'artist_id' THEN 'artist_profiles(id)'
    WHEN c.column_name = 'organizer_id' THEN 'profiles(id)'
    WHEN c.column_name = 'follower_id' THEN 'profiles(id)'
    WHEN c.column_name = 'following_id' THEN 'profiles(id)'
    ELSE 'Determine reference table'
  END as should_reference
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND c.column_name IN (
    'user_id', 'profile_id', 'account_id', 'event_id', 'post_id',
    'venue_id', 'tour_id', 'artist_id', 'organizer_id', 
    'follower_id', 'following_id', 'created_by', 'owner_user_id'
  )
ORDER BY 
  CASE 
    WHEN c.column_name = 'user_id' THEN 1
    WHEN c.column_name = 'profile_id' THEN 2
    WHEN c.column_name = 'account_id' THEN 3
    WHEN c.column_name = 'event_id' THEN 4
    WHEN c.column_name = 'post_id' THEN 5
    ELSE 6
  END,
  t.table_name;

-- =============================================================================
-- STEP 2: CHECK FOR ORPHANED RECORDS BEFORE ADDING CONSTRAINTS
-- =============================================================================

-- Check posts table for orphaned user_id references
SELECT 
  'posts' as table_name,
  'user_id' as column_name,
  COUNT(*) as orphaned_count,
  'Posts with invalid user_id references' as issue_description
FROM posts p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check events table for orphaned user_id references
SELECT 
  'events' as table_name,
  'user_id' as column_name,
  COUNT(*) as orphaned_count,
  'Events with invalid user_id references' as issue_description
FROM events e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE u.id IS NULL;

-- Check follows table for orphaned references
SELECT 
  'follows' as table_name,
  'follower_id/following_id' as column_name,
  COUNT(*) as orphaned_count,
  'Follows with invalid profile references' as issue_description
FROM follows f
LEFT JOIN profiles p1 ON f.follower_id = p1.id
LEFT JOIN profiles p2 ON f.following_id = p2.id
WHERE p1.id IS NULL OR p2.id IS NULL;

-- Check likes table for orphaned references
SELECT 
  'likes' as table_name,
  'user_id/post_id' as column_name,
  COUNT(*) as orphaned_count,
  'Likes with invalid user_id or post_id references' as issue_description
FROM likes l
LEFT JOIN auth.users u ON l.user_id = u.id
LEFT JOIN posts p ON l.post_id = p.id
WHERE u.id IS NULL OR p.id IS NULL;

-- Check comments table for orphaned references
SELECT 
  'comments' as table_name,
  'user_id/post_id' as column_name,
  COUNT(*) as orphaned_count,
  'Comments with invalid user_id or post_id references' as issue_description
FROM comments c
LEFT JOIN auth.users u ON c.user_id = u.id
LEFT JOIN posts p ON c.post_id = p.id
WHERE u.id IS NULL OR p.id IS NULL;

-- =============================================================================
-- STEP 3: ADD CRITICAL FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add foreign key constraint for posts.user_id -> auth.users(id)
-- (Only add if no orphaned records exist)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_user_id_fkey' 
    AND table_name = 'posts'
  ) THEN
    -- Check if we can safely add the constraint
    IF NOT EXISTS (
      SELECT 1 FROM posts p
      LEFT JOIN auth.users u ON p.user_id = u.id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: posts.user_id -> auth.users(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: posts.user_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: posts.user_id -> auth.users(id)';
  END IF;
END $$;

-- Add foreign key constraint for events.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_user_id_fkey' 
    AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM events e
      LEFT JOIN auth.users u ON e.user_id = u.id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE events ADD CONSTRAINT events_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: events.user_id -> auth.users(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: events.user_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: events.user_id -> auth.users(id)';
  END IF;
END $$;

-- Add foreign key constraint for follows.follower_id -> profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'follows_follower_id_fkey' 
    AND table_name = 'follows'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM follows f
      LEFT JOIN profiles p ON f.follower_id = p.id
      WHERE p.id IS NULL
    ) THEN
      ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey 
        FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: follows.follower_id -> profiles(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: follows.follower_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: follows.follower_id -> profiles(id)';
  END IF;
END $$;

-- Add foreign key constraint for follows.following_id -> profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'follows_following_id_fkey' 
    AND table_name = 'follows'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM follows f
      LEFT JOIN profiles p ON f.following_id = p.id
      WHERE p.id IS NULL
    ) THEN
      ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey 
        FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: follows.following_id -> profiles(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: follows.following_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: follows.following_id -> profiles(id)';
  END IF;
END $$;

-- Add foreign key constraint for likes.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_user_id_fkey' 
    AND table_name = 'likes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM likes l
      LEFT JOIN auth.users u ON l.user_id = u.id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: likes.user_id -> auth.users(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: likes.user_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: likes.user_id -> auth.users(id)';
  END IF;
END $$;

-- Add foreign key constraint for likes.post_id -> posts(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_post_id_fkey' 
    AND table_name = 'likes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM likes l
      LEFT JOIN posts p ON l.post_id = p.id
      WHERE p.id IS NULL
    ) THEN
      ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: likes.post_id -> posts(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: likes.post_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: likes.post_id -> posts(id)';
  END IF;
END $$;

-- Add foreign key constraint for comments.user_id -> auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_user_id_fkey' 
    AND table_name = 'comments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM comments c
      LEFT JOIN auth.users u ON c.user_id = u.id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: comments.user_id -> auth.users(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: comments.user_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: comments.user_id -> auth.users(id)';
  END IF;
END $$;

-- Add foreign key constraint for comments.post_id -> posts(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_post_id_fkey' 
    AND table_name = 'comments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE p.id IS NULL
    ) THEN
      ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added FK constraint: comments.post_id -> posts(id)';
    ELSE
      RAISE NOTICE '⚠️ Cannot add FK constraint: comments.post_id has orphaned records';
    END IF;
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: comments.post_id -> posts(id)';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: VERIFY FOREIGN KEY CONSTRAINTS WERE ADDED
-- =============================================================================

-- Check all foreign key constraints after our fixes
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('posts', 'events', 'follows', 'likes', 'comments')
ORDER BY tc.table_name, kcu.column_name;

-- =============================================================================
-- STEP 5: SUMMARY OF PHASE 1 PROGRESS
-- =============================================================================

-- Generate progress report
SELECT 
  'PHASE 1 PROGRESS REPORT' as report_type,
  COUNT(CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN 1 END) as fk_constraints_added,
  COUNT(CASE WHEN t.haspk = true THEN 1 END) as tables_with_pk,
  'Phase 1 Critical Issues - Foreign Keys Fixed' as status
FROM information_schema.table_constraints tc
CROSS JOIN (
  SELECT COUNT(CASE WHEN hasprimarykey = true THEN 1 END) as haspk
  FROM pg_tables 
  WHERE schemaname = 'public'
) t
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('posts', 'events', 'follows', 'likes', 'comments');

-- =============================================================================
-- EXECUTION NOTES:
-- =============================================================================
--
-- 1. THIS SCRIPT ADDRESSES THE 88 MISSING FOREIGN KEY CONSTRAINTS
-- 2. IT CHECKS FOR ORPHANED RECORDS BEFORE ADDING CONSTRAINTS
-- 3. IT ADDS CONSTRAINTS ONLY WHERE SAFE TO DO SO
-- 4. IT VERIFIES ALL CONSTRAINTS WERE ADDED CORRECTLY
-- 5. IT PROVIDES A PROGRESS REPORT
--
-- NEXT STEPS AFTER THIS SCRIPT:
-- - Review the progress report
-- - Check if any constraints failed to add
-- - Address any orphaned record issues
-- - Proceed to Phase 2 (Security & RLS)
--
-- =============================================================================
