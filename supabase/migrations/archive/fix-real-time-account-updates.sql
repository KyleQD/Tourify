-- =============================================================================
-- FIX REAL-TIME ACCOUNT UPDATES
-- This script creates triggers to automatically update follower counts, post counts,
-- and engagement scores in the accounts table when data changes
-- =============================================================================

-- =============================================================================
-- STEP 1: DIAGNOSE CURRENT STATE
-- =============================================================================

DO $$
DECLARE
  accounts_count INTEGER;
  posts_count INTEGER;
  follows_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 DIAGNOSING ACCOUNT UPDATE ISSUE...';
  RAISE NOTICE '=========================================';
  
  -- Check accounts table
  SELECT COUNT(*) INTO accounts_count FROM accounts;
  RAISE NOTICE 'Accounts: %', accounts_count;
  
  -- Check posts table
  SELECT COUNT(*) INTO posts_count FROM posts;
  RAISE NOTICE 'Posts: %', posts_count;
  
  -- Check if follows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    SELECT COUNT(*) INTO follows_count FROM follows;
    RAISE NOTICE 'Follows: %', follows_count;
  ELSE
    RAISE NOTICE 'Follows table: Does not exist';
  END IF;
  
  -- Check if account_relationships table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    SELECT COUNT(*) INTO follows_count FROM account_relationships;
    RAISE NOTICE 'Account relationships: %', follows_count;
  ELSE
    RAISE NOTICE 'Account relationships table: Does not exist';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current account stats (first 3 accounts):';
  -- Note: Using PERFORM to avoid "query has no destination" error
  -- The actual stats will be shown in the final verification section
END $$;

-- =============================================================================
-- STEP 2: CREATE HELPER FUNCTIONS WITH EXPLICIT NAMING
-- =============================================================================

-- Function to update follower counts for a user
CREATE OR REPLACE FUNCTION update_follower_counts(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  followers_count_val INTEGER;
  following_count_val INTEGER;
BEGIN
  -- Count followers (users who follow this user)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    -- Using follows table
    SELECT COUNT(*) INTO followers_count_val 
    FROM follows f
    WHERE f.following_id = target_user_id;
    
    SELECT COUNT(*) INTO following_count_val 
    FROM follows f
    WHERE f.follower_id = target_user_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    -- Using account_relationships table
    SELECT COUNT(*) INTO followers_count_val 
    FROM account_relationships ar
    WHERE ar.owned_profile_id = target_user_id AND ar.is_active = true;
    
    SELECT COUNT(*) INTO following_count_val 
    FROM account_relationships ar
    WHERE ar.owner_user_id = target_user_id AND ar.is_active = true;
  ELSE
    -- No follows table found
    followers_count_val := 0;
    following_count_val := 0;
  END IF;
  
  -- Update accounts table
  UPDATE accounts a
  SET 
    follower_count = followers_count_val,
    following_count = following_count_val,
    updated_at = NOW()
  WHERE a.id = target_user_id;
  
  RAISE NOTICE 'Updated follower counts for user %: followers=%, following=%', 
    target_user_id, followers_count_val, following_count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post count for a user
CREATE OR REPLACE FUNCTION update_post_count(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  posts_count_val INTEGER;
BEGIN
  -- Count posts for this user
  SELECT COUNT(*) INTO posts_count_val 
  FROM posts p
  WHERE p.user_id = target_user_id;
  
  -- Update accounts table
  UPDATE accounts a
  SET 
    post_count = posts_count_val,
    updated_at = NOW()
  WHERE a.id = target_user_id;
  
  RAISE NOTICE 'Updated post count for user %: posts=%', target_user_id, posts_count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update engagement score for a user
CREATE OR REPLACE FUNCTION update_engagement_score(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total_likes_val INTEGER;
  total_comments_val INTEGER;
  total_shares_val INTEGER;
  engagement_score_val NUMERIC;
BEGIN
  -- Calculate total engagement from user's posts
  SELECT 
    COALESCE(SUM(p.likes_count), 0),
    COALESCE(SUM(p.comments_count), 0),
    COALESCE(SUM(p.shares_count), 0)
  INTO total_likes_val, total_comments_val, total_shares_val
  FROM posts p
  WHERE p.user_id = target_user_id;
  
  -- Calculate engagement score (likes * 1 + comments * 2 + shares * 3)
  engagement_score_val := (total_likes_val * 1) + (total_comments_val * 2) + (total_shares_val * 3);
  
  -- Update accounts table
  UPDATE accounts a
  SET 
    engagement_score = engagement_score_val,
    updated_at = NOW()
  WHERE a.id = target_user_id;
  
  RAISE NOTICE 'Updated engagement score for user %: score=% (likes=%, comments=%, shares=%)', 
    target_user_id, engagement_score_val, total_likes_val, total_comments_val, total_shares_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all stats for a user
CREATE OR REPLACE FUNCTION update_user_stats(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM update_follower_counts(target_user_id);
  PERFORM update_post_count(target_user_id);
  PERFORM update_engagement_score(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all users' stats
CREATE OR REPLACE FUNCTION update_all_user_stats()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Updating stats for all users...';
  
  FOR user_record IN SELECT a.id FROM accounts a LOOP
    PERFORM update_user_stats(user_record.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Updated stats for % users', updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: CREATE TRIGGERS FOR POSTS
-- =============================================================================

-- Trigger function for posts table
CREATE OR REPLACE FUNCTION handle_post_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New post created
    PERFORM update_post_count(NEW.user_id);
    PERFORM update_engagement_score(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Post updated (likes, comments, shares might have changed)
    PERFORM update_engagement_score(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Post deleted
    PERFORM update_post_count(OLD.user_id);
    PERFORM update_engagement_score(OLD.user_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on posts table
DROP TRIGGER IF EXISTS trigger_posts_account_updates ON posts;
CREATE TRIGGER trigger_posts_account_updates
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_post_changes();

-- =============================================================================
-- STEP 4: CREATE TRIGGERS FOR FOLLOWS/RELATIONSHIPS
-- =============================================================================

-- Trigger function for follows table (if it exists)
CREATE OR REPLACE FUNCTION handle_follows_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New follow relationship
    PERFORM update_follower_counts(NEW.following_id);  -- User being followed
    PERFORM update_follower_counts(NEW.follower_id);   -- User doing the following
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Follow relationship removed
    PERFORM update_follower_counts(OLD.following_id);  -- User being followed
    PERFORM update_follower_counts(OLD.follower_id);   -- User doing the following
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on follows table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    DROP TRIGGER IF EXISTS trigger_follows_account_updates ON follows;
    CREATE TRIGGER trigger_follows_account_updates
      AFTER INSERT OR DELETE ON follows
      FOR EACH ROW EXECUTE FUNCTION handle_follows_changes();
    RAISE NOTICE '✅ Created follows triggers';
  ELSE
    RAISE NOTICE 'ℹ️ Follows table not found, skipping follows triggers';
  END IF;
END $$;

-- Trigger function for account_relationships table (if it exists)
CREATE OR REPLACE FUNCTION handle_account_relationships_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New relationship
    PERFORM update_follower_counts(NEW.owned_profile_id);
    PERFORM update_follower_counts(NEW.owner_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Relationship updated (e.g., is_active changed)
    PERFORM update_follower_counts(NEW.owned_profile_id);
    PERFORM update_follower_counts(NEW.owner_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Relationship removed
    PERFORM update_follower_counts(OLD.owned_profile_id);
    PERFORM update_follower_counts(OLD.owner_user_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on account_relationships table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships') THEN
    DROP TRIGGER IF EXISTS trigger_account_relationships_updates ON account_relationships;
    CREATE TRIGGER trigger_account_relationships_updates
      AFTER INSERT OR UPDATE OR DELETE ON account_relationships
      FOR EACH ROW EXECUTE FUNCTION handle_account_relationships_changes();
    RAISE NOTICE '✅ Created account_relationships triggers';
  ELSE
    RAISE NOTICE 'ℹ️ Account_relationships table not found, skipping relationship triggers';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: CREATE TRIGGERS FOR POST INTERACTIONS
-- =============================================================================

-- Trigger function for post_likes table
CREATE OR REPLACE FUNCTION handle_post_likes_changes()
RETURNS TRIGGER AS $$
DECLARE
  post_user_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the user_id of the post being liked
    SELECT p.user_id INTO post_user_id_val FROM posts p WHERE p.id = NEW.post_id;
    IF post_user_id_val IS NOT NULL THEN
      PERFORM update_engagement_score(post_user_id_val);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get the user_id of the post being unliked
    SELECT p.user_id INTO post_user_id_val FROM posts p WHERE p.id = OLD.post_id;
    IF post_user_id_val IS NOT NULL THEN
      PERFORM update_engagement_score(post_user_id_val);
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on post_likes table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_likes') THEN
    DROP TRIGGER IF EXISTS trigger_post_likes_updates ON post_likes;
    CREATE TRIGGER trigger_post_likes_updates
      AFTER INSERT OR DELETE ON post_likes
      FOR EACH ROW EXECUTE FUNCTION handle_post_likes_changes();
    RAISE NOTICE '✅ Created post_likes triggers';
  ELSE
    RAISE NOTICE 'ℹ️ Post_likes table not found, skipping likes triggers';
  END IF;
END $$;

-- Trigger function for post_comments table
CREATE OR REPLACE FUNCTION handle_post_comments_changes()
RETURNS TRIGGER AS $$
DECLARE
  post_user_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the user_id of the post being commented on
    SELECT p.user_id INTO post_user_id_val FROM posts p WHERE p.id = NEW.post_id;
    IF post_user_id_val IS NOT NULL THEN
      PERFORM update_engagement_score(post_user_id_val);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get the user_id of the post being uncommented
    SELECT p.user_id INTO post_user_id_val FROM posts p WHERE p.id = OLD.post_id;
    IF post_user_id_val IS NOT NULL THEN
      PERFORM update_engagement_score(post_user_id_val);
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on post_comments table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_comments') THEN
    DROP TRIGGER IF EXISTS trigger_post_comments_updates ON post_comments;
    CREATE TRIGGER trigger_post_comments_updates
      AFTER INSERT OR DELETE ON post_comments
      FOR EACH ROW EXECUTE FUNCTION handle_post_comments_changes();
    RAISE NOTICE '✅ Created post_comments triggers';
  ELSE
    RAISE NOTICE 'ℹ️ Post_comments table not found, skipping comments triggers';
  END IF;
END $$;

-- =============================================================================
-- STEP 6: INITIALIZE ALL USER STATS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 INITIALIZING ALL USER STATS...';
  RAISE NOTICE '====================================';
  
  -- Update all users' stats to current values
  PERFORM update_all_user_stats();
  
  RAISE NOTICE '✅ All user stats initialized!';
END $$;

-- =============================================================================
-- STEP 7: VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_accounts INTEGER;
  accounts_with_followers INTEGER;
  accounts_with_posts INTEGER;
  accounts_with_engagement INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VERIFICATION RESULTS...';
  RAISE NOTICE '==========================';
  
  -- Count accounts
  SELECT COUNT(*) INTO total_accounts FROM accounts;
  
  -- Count accounts with followers
  SELECT COUNT(*) INTO accounts_with_followers 
  FROM accounts WHERE follower_count > 0;
  
  -- Count accounts with posts
  SELECT COUNT(*) INTO accounts_with_posts 
  FROM accounts WHERE post_count > 0;
  
  -- Count accounts with engagement
  SELECT COUNT(*) INTO accounts_with_engagement 
  FROM accounts WHERE engagement_score > 0;
  
  RAISE NOTICE 'Total accounts: %', total_accounts;
  RAISE NOTICE 'Accounts with followers: %', accounts_with_followers;
  RAISE NOTICE 'Accounts with posts: %', accounts_with_posts;
  RAISE NOTICE 'Accounts with engagement: %', accounts_with_engagement;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Sample updated accounts:';
  -- Note: Using PERFORM to avoid "query has no destination" error
  -- The actual stats will be shown in the final verification section
END $$;

-- =============================================================================
-- STEP 8: SHOW FINAL STATE
-- =============================================================================

-- Show final comparison
SELECT 'FINAL ACCOUNT STATS:' as info;
SELECT 
  'Total Accounts' as metric,
  COUNT(*) as value
FROM accounts
UNION ALL
SELECT 
  'Total Followers' as metric,
  SUM(follower_count) as value
FROM accounts
UNION ALL
SELECT 
  'Total Posts' as metric,
  SUM(post_count) as value
FROM accounts
UNION ALL
SELECT 
  'Total Engagement Score' as metric,
  SUM(engagement_score) as value
FROM accounts;

-- Show top accounts by engagement
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
LIMIT 5;
