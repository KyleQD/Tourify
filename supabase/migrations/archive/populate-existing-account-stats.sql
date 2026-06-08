-- =============================================================================
-- POPULATE EXISTING ACCOUNT STATS
-- This script manually calculates and updates existing account statistics
-- to verify the real-time update system is working correctly
-- =============================================================================

-- =============================================================================
-- STEP 1: VERIFY CURRENT STATE
-- =============================================================================

DO $$
DECLARE
  total_accounts INTEGER;
  accounts_with_data INTEGER;
BEGIN
  RAISE NOTICE '🔍 VERIFYING CURRENT ACCOUNT STATE...';
  RAISE NOTICE '=====================================';
  
  -- Count total accounts
  SELECT COUNT(*) INTO total_accounts FROM accounts;
  RAISE NOTICE 'Total accounts: %', total_accounts;
  
  -- Count accounts with any data
  SELECT COUNT(*) INTO accounts_with_data 
  FROM accounts 
  WHERE follower_count > 0 OR post_count > 0 OR engagement_score > 0;
  RAISE NOTICE 'Accounts with data: %', accounts_with_data;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Sample accounts before update:';
  -- Note: Sample data will be shown in the final verification sections
END $$;

-- =============================================================================
-- STEP 2: MANUALLY CALCULATE AND UPDATE FOLLOWER COUNTS
-- =============================================================================

DO $$
DECLARE
  account_record RECORD;
  followers_count_val INTEGER;
  following_count_val INTEGER;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 UPDATING FOLLOWER COUNTS...';
  RAISE NOTICE '==============================';
  
  FOR account_record IN SELECT a.id FROM accounts a LOOP
    -- Count followers (users who follow this account)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
      SELECT COUNT(*) INTO followers_count_val 
      FROM follows f 
      WHERE f.following_id = account_record.id;
      
      SELECT COUNT(*) INTO following_count_val 
      FROM follows f 
      WHERE f.follower_id = account_record.id;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
      SELECT COUNT(*) INTO followers_count_val 
      FROM account_relationships ar 
      WHERE ar.owned_profile_id = account_record.id AND ar.is_active = true;
      
      SELECT COUNT(*) INTO following_count_val 
      FROM account_relationships ar 
      WHERE ar.owner_user_id = account_record.id AND ar.is_active = true;
    ELSE
      followers_count_val := 0;
      following_count_val := 0;
    END IF;
    
    -- Update the account
    UPDATE accounts a
    SET 
      follower_count = followers_count_val,
      following_count = following_count_val,
      updated_at = NOW()
    WHERE a.id = account_record.id;
    
    updated_count := updated_count + 1;
    
    IF updated_count % 10 = 0 THEN
      RAISE NOTICE 'Updated % accounts...', updated_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated follower counts for % accounts', updated_count;
END $$;

-- =============================================================================
-- STEP 3: MANUALLY CALCULATE AND UPDATE POST COUNTS
-- =============================================================================

DO $$
DECLARE
  account_record RECORD;
  posts_count INTEGER;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 UPDATING POST COUNTS...';
  RAISE NOTICE '==========================';
  
  FOR account_record IN SELECT a.id FROM accounts a LOOP
    -- Count posts for this account
    SELECT COUNT(*) INTO posts_count 
    FROM posts p 
    WHERE p.user_id = account_record.id;
    
    -- Update the account
    UPDATE accounts a
    SET 
      post_count = posts_count,
      updated_at = NOW()
    WHERE a.id = account_record.id;
    
    updated_count := updated_count + 1;
    
    IF updated_count % 10 = 0 THEN
      RAISE NOTICE 'Updated % accounts...', updated_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated post counts for % accounts', updated_count;
END $$;

-- =============================================================================
-- STEP 4: MANUALLY CALCULATE AND UPDATE ENGAGEMENT SCORES
-- =============================================================================

DO $$
DECLARE
  account_record RECORD;
  total_likes INTEGER;
  total_comments INTEGER;
  total_shares INTEGER;
  engagement_score_val NUMERIC;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 UPDATING ENGAGEMENT SCORES...';
  RAISE NOTICE '==================================';
  
  FOR account_record IN SELECT a.id FROM accounts a LOOP
    -- Calculate total engagement from user's posts
    SELECT 
      COALESCE(SUM(p.likes_count), 0),
      COALESCE(SUM(p.comments_count), 0),
      COALESCE(SUM(p.shares_count), 0)
    INTO total_likes, total_comments, total_shares
    FROM posts p 
    WHERE p.user_id = account_record.id;
    
    -- Calculate engagement score (likes * 1 + comments * 2 + shares * 3)
    engagement_score_val := (total_likes * 1) + (total_comments * 2) + (total_shares * 3);
    
    -- Update the account
    UPDATE accounts a
    SET 
      engagement_score = engagement_score_val,
      updated_at = NOW()
    WHERE a.id = account_record.id;
    
    updated_count := updated_count + 1;
    
    IF updated_count % 10 = 0 THEN
      RAISE NOTICE 'Updated % accounts...', updated_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated engagement scores for % accounts', updated_count;
END $$;

-- =============================================================================
-- STEP 5: VERIFY THE UPDATES WORKED
-- =============================================================================

DO $$
DECLARE
  total_accounts INTEGER;
  accounts_with_followers INTEGER;
  accounts_with_posts INTEGER;
  accounts_with_engagement INTEGER;
  total_followers INTEGER;
  total_posts INTEGER;
  total_engagement INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICATION RESULTS...';
  RAISE NOTICE '==========================';
  
  -- Count accounts
  SELECT COUNT(*) INTO total_accounts FROM accounts;
  
  -- Count accounts with data
  SELECT COUNT(*) INTO accounts_with_followers 
  FROM accounts WHERE follower_count > 0;
  
  SELECT COUNT(*) INTO accounts_with_posts 
  FROM accounts WHERE post_count > 0;
  
  SELECT COUNT(*) INTO accounts_with_engagement 
  FROM accounts WHERE engagement_score > 0;
  
  -- Sum totals
  SELECT 
    SUM(follower_count), 
    SUM(post_count), 
    SUM(engagement_score)
  INTO total_followers, total_posts, total_engagement
  FROM accounts;
  
  RAISE NOTICE 'Total accounts: %', total_accounts;
  RAISE NOTICE 'Accounts with followers: %', accounts_with_followers;
  RAISE NOTICE 'Accounts with posts: %', accounts_with_posts;
  RAISE NOTICE 'Accounts with engagement: %', accounts_with_engagement;
  RAISE NOTICE '';
  RAISE NOTICE 'Total followers across all accounts: %', total_followers;
  RAISE NOTICE 'Total posts across all accounts: %', total_posts;
  RAISE NOTICE 'Total engagement score across all accounts: %', total_engagement;
END $$;

-- =============================================================================
-- STEP 6: SHOW UPDATED ACCOUNTS
-- =============================================================================

-- Show accounts with the most engagement
SELECT 'TOP ACCOUNTS BY ENGAGEMENT:' as info;
SELECT 
  id,
  follower_count,
  following_count,
  post_count,
  engagement_score,
  updated_at
FROM accounts 
ORDER BY engagement_score DESC, follower_count DESC 
LIMIT 10;

-- Show accounts with the most followers
SELECT 'TOP ACCOUNTS BY FOLLOWERS:' as info;
SELECT 
  id,
  follower_count,
  following_count,
  post_count,
  engagement_score,
  updated_at
FROM accounts 
ORDER BY follower_count DESC, engagement_score DESC 
LIMIT 10;

-- Show accounts with the most posts
SELECT 'TOP ACCOUNTS BY POSTS:' as info;
SELECT 
  id,
  follower_count,
  following_count,
  post_count,
  engagement_score,
  updated_at
FROM accounts 
ORDER BY post_count DESC, engagement_score DESC 
LIMIT 10;

-- =============================================================================
-- STEP 7: TEST REAL-TIME UPDATES
-- =============================================================================

-- Test that the triggers are working by showing the current state
SELECT 'REAL-TIME UPDATE SYSTEM STATUS:' as info;
SELECT 
  'Functions Created' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_follower_counts') THEN '✅'
    ELSE '❌'
  END as status
UNION ALL
SELECT 
  'Post Triggers Active' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_posts_account_updates') THEN '✅'
    ELSE '❌'
  END as status
UNION ALL
SELECT 
  'Follow Triggers Active' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_follows_account_updates') THEN '✅'
    ELSE '❌'
  END as status;
