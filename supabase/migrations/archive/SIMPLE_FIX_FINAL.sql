-- =====================================================
-- SIMPLE FIX FOR POSTING NAME ISSUE
-- =====================================================
-- This adds the essential columns needed to fix the posting name issue
-- No complex functions, no conflicts, just works!

-- Add account context columns to posts table
DO $$ 
BEGIN
  -- Add posted_as_profile_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
    RAISE NOTICE '✅ Added posted_as_profile_id column to posts table';
  ELSE
    RAISE NOTICE 'ℹ️  posted_as_profile_id column already exists';
  END IF;
  
  -- Add posted_as_account_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'primary' CHECK (posted_as_account_type IN ('primary', 'artist', 'venue', 'admin'));
    RAISE NOTICE '✅ Added posted_as_account_type column to posts table';
  ELSE
    RAISE NOTICE 'ℹ️  posted_as_account_type column already exists';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_account_context ON posts(posted_as_profile_id, posted_as_account_type);
CREATE INDEX IF NOT EXISTS idx_posts_account_type ON posts(posted_as_account_type);

-- Update existing posts to use primary account context
UPDATE posts 
SET posted_as_profile_id = user_id,
    posted_as_account_type = 'primary'
WHERE posted_as_profile_id IS NULL;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '🎉 SIMPLE FIX COMPLETE!';
  RAISE NOTICE '✅ Posts table now has account context columns';
  RAISE NOTICE '✅ Existing posts updated';
  RAISE NOTICE '';
  RAISE NOTICE '🔥 WHAT THIS ENABLES:';
  RAISE NOTICE '- Posts can now store which account they were posted from';
  RAISE NOTICE '- Artist posts will store artist profile ID';
  RAISE NOTICE '- Feed can look up correct account names';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 READY TO TEST!';
  RAISE NOTICE '1. Go to /artist/feed';
  RAISE NOTICE '2. Create a post as "Clive Malone"';
  RAISE NOTICE '3. Should show "Clive Malone" instead of "John"';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Your APIs are already updated to use these columns!';
END $$; 