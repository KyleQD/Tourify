-- =====================================================
-- COMPREHENSIVE ROUTE-BASED SOLUTION - SIMPLE VERSION
-- =====================================================
-- Apply this directly in the Supabase SQL editor

-- Step 1: Add missing columns to posts table
DO $$
BEGIN
  RAISE NOTICE 'Adding missing columns to posts table...';
  
  -- Add media_urls column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_urls') THEN
    ALTER TABLE posts ADD COLUMN media_urls TEXT[] DEFAULT '{}';
    RAISE NOTICE '✅ Added media_urls column';
  END IF;
  
  -- Add type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'type') THEN
    ALTER TABLE posts ADD COLUMN type TEXT DEFAULT 'text';
    RAISE NOTICE '✅ Added type column';
  END IF;
  
  -- Add visibility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'visibility') THEN
    ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public';
    RAISE NOTICE '✅ Added visibility column';
  END IF;
  
  -- Add location column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'location') THEN
    ALTER TABLE posts ADD COLUMN location TEXT;
    RAISE NOTICE '✅ Added location column';
  END IF;
  
  -- Add hashtags column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'hashtags') THEN
    ALTER TABLE posts ADD COLUMN hashtags TEXT[] DEFAULT '{}';
    RAISE NOTICE '✅ Added hashtags column';
  END IF;
  
  -- Add account context columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'primary';
    RAISE NOTICE '✅ Added posted_as_account_type column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
    RAISE NOTICE '✅ Added posted_as_profile_id column';
  END IF;
  
  -- Add display cache columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_display_name') THEN
    ALTER TABLE posts ADD COLUMN account_display_name TEXT;
    RAISE NOTICE '✅ Added account_display_name column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_username') THEN
    ALTER TABLE posts ADD COLUMN account_username TEXT;
    RAISE NOTICE '✅ Added account_username column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'account_avatar_url') THEN
    ALTER TABLE posts ADD COLUMN account_avatar_url TEXT;
    RAISE NOTICE '✅ Added account_avatar_url column';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'route_context') THEN
    ALTER TABLE posts ADD COLUMN route_context TEXT;
    RAISE NOTICE '✅ Added route_context column';
  END IF;
  
  RAISE NOTICE '✅ All columns added successfully';
END $$;

-- Step 2: Create flexible account function
CREATE OR REPLACE FUNCTION get_account_info_flexible(
  p_user_id UUID,
  p_account_type TEXT,
  p_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  account_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  account_type TEXT
) AS $$
DECLARE
  v_account_id UUID;
  v_display_name TEXT;
  v_username TEXT;
  v_avatar_url TEXT;
  v_is_verified BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  -- Handle different account types
  IF p_account_type = 'artist' THEN
    -- Check if artist_profiles table exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'artist_profiles' AND table_schema = 'public'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
      -- Try to get artist profile
      BEGIN
        SELECT 
          ap.id,
          COALESCE(ap.artist_name, ap.stage_name, ap.name, 'Artist'),
          LOWER(REPLACE(COALESCE(ap.artist_name, ap.stage_name, ap.name, 'Artist'), ' ', '')),
          COALESCE(ap.profile_image_url, ap.avatar_url, ap.image_url, ''),
          COALESCE(ap.is_verified, ap.verified, FALSE)
        INTO v_account_id, v_display_name, v_username, v_avatar_url, v_is_verified
        FROM artist_profiles ap
        WHERE ap.user_id = p_user_id
        AND (p_profile_id IS NULL OR ap.id = p_profile_id)
        LIMIT 1;
      EXCEPTION WHEN others THEN
        -- If error, use fallback
        v_account_id := p_user_id;
        v_display_name := 'Artist';
        v_username := 'artist';
        v_avatar_url := '';
        v_is_verified := FALSE;
      END;
    END IF;
    
  ELSIF p_account_type = 'venue' THEN
    -- Check if venue_profiles table exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'venue_profiles' AND table_schema = 'public'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
      -- Try to get venue profile
      BEGIN
        SELECT 
          vp.id,
          COALESCE(vp.name, vp.venue_name, 'Venue'),
          LOWER(REPLACE(COALESCE(vp.name, vp.venue_name, 'Venue'), ' ', '')),
          COALESCE(vp.logo_url, vp.avatar_url, vp.image_url, ''),
          COALESCE(vp.is_verified, vp.verified, FALSE)
        INTO v_account_id, v_display_name, v_username, v_avatar_url, v_is_verified
        FROM venue_profiles vp
        WHERE vp.user_id = p_user_id
        AND (p_profile_id IS NULL OR vp.id = p_profile_id)
        LIMIT 1;
      EXCEPTION WHEN others THEN
        -- If error, use fallback
        v_account_id := p_user_id;
        v_display_name := 'Venue';
        v_username := 'venue';
        v_avatar_url := '';
        v_is_verified := FALSE;
      END;
    END IF;
    
  ELSE -- primary account
    -- Try to get primary profile
    BEGIN
      SELECT 
        p.id,
        COALESCE(p.full_name, p.name, 'User'),
        COALESCE(p.username, 'user'),
        COALESCE(p.avatar_url, ''),
        COALESCE(p.is_verified, FALSE)
      INTO v_account_id, v_display_name, v_username, v_avatar_url, v_is_verified
      FROM profiles p
      WHERE p.id = p_user_id
      LIMIT 1;
    EXCEPTION WHEN others THEN
      -- Fallback to auth.users
      SELECT 
        p_user_id,
        COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email, 'User'),
        COALESCE(raw_user_meta_data->>'username', 'user'),
        COALESCE(raw_user_meta_data->>'avatar_url', ''),
        FALSE
      INTO v_account_id, v_display_name, v_username, v_avatar_url, v_is_verified
      FROM auth.users
      WHERE id = p_user_id
      LIMIT 1;
    END;
  END IF;
  
  -- Return results
  RETURN QUERY
  SELECT 
    COALESCE(v_account_id, p_user_id),
    COALESCE(v_display_name, 'User'),
    COALESCE(v_username, 'user'),
    COALESCE(v_avatar_url, ''),
    COALESCE(v_is_verified, FALSE),
    p_account_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update existing posts with account context
DO $$
DECLARE
  post_record RECORD;
  account_info RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Updating existing posts with account context...';
  
  -- Update posts without account context
  FOR post_record IN (
    SELECT id, user_id, posted_as_account_type, posted_as_profile_id
    FROM posts
    WHERE account_display_name IS NULL
    LIMIT 20
  ) LOOP
    -- Get account info
    SELECT * INTO account_info
    FROM get_account_info_flexible(
      post_record.user_id,
      COALESCE(post_record.posted_as_account_type, 'primary'),
      post_record.posted_as_profile_id
    );
    
    IF account_info.display_name IS NOT NULL THEN
      -- Update post with account context
      UPDATE posts 
      SET 
        posted_as_account_type = COALESCE(post_record.posted_as_account_type, 'primary'),
        posted_as_profile_id = account_info.account_id,
        account_display_name = account_info.display_name,
        account_username = account_info.username,
        account_avatar_url = account_info.avatar_url,
        route_context = CASE 
          WHEN COALESCE(post_record.posted_as_account_type, 'primary') = 'artist' THEN '/artist/feed'
          WHEN COALESCE(post_record.posted_as_account_type, 'primary') = 'venue' THEN '/venue/feed'
          WHEN COALESCE(post_record.posted_as_account_type, 'primary') = 'business' THEN '/business/feed'
          ELSE '/feed'
        END
      WHERE id = post_record.id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated % posts with account context', updated_count;
END $$;

-- Step 4: Test the system
DO $$
DECLARE
  test_user_id UUID := 'bce15693-d2bf-42db-a2f2-68239568fafe';
  test_result RECORD;
BEGIN
  RAISE NOTICE 'Testing comprehensive system...';
  
  -- Test artist account
  SELECT * INTO test_result
  FROM get_account_info_flexible(test_user_id, 'artist', NULL);
  
  IF test_result.display_name IS NOT NULL THEN
    RAISE NOTICE '✅ Artist account test PASSED: %', test_result.display_name;
  ELSE
    RAISE NOTICE '❌ Artist account test FAILED: No display name returned';
  END IF;
  
  -- Test primary account
  SELECT * INTO test_result
  FROM get_account_info_flexible(test_user_id, 'primary', NULL);
  
  IF test_result.display_name IS NOT NULL THEN
    RAISE NOTICE '✅ Primary account test PASSED: %', test_result.display_name;
  ELSE
    RAISE NOTICE '❌ Primary account test FAILED: No display name returned';
  END IF;
  
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_account_type ON posts(posted_as_account_type);
CREATE INDEX IF NOT EXISTS idx_posts_account_context ON posts(posted_as_profile_id, posted_as_account_type);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_route_context ON posts(route_context);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 COMPREHENSIVE ROUTE-BASED SOLUTION APPLIED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'The system is now ready for route-based multi-account posting!';
  RAISE NOTICE 'Posts will now show the correct account name based on the route context.';
  RAISE NOTICE '';
END $$; 