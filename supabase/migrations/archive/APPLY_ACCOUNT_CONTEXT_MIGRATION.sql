-- =====================================================
-- APPLY THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This migration adds the missing account context columns to the posts table
-- so that posts can display the correct account name (e.g., "Clive Malone" instead of "John")

-- Add account context columns to posts table
DO $$ 
BEGIN
  -- Add posted_as_profile_id column to track which profile posted
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
    RAISE NOTICE '✅ Added posted_as_profile_id column to posts table';
  ELSE
    RAISE NOTICE 'ℹ️  posted_as_profile_id column already exists';
  END IF;
  
  -- Add posted_as_account_type column to track account type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
    ALTER TABLE posts ADD COLUMN posted_as_account_type TEXT DEFAULT 'primary' CHECK (posted_as_account_type IN ('primary', 'artist', 'venue', 'admin'));
    RAISE NOTICE '✅ Added posted_as_account_type column to posts table';
  ELSE
    RAISE NOTICE 'ℹ️  posted_as_account_type column already exists';
  END IF;
END $$;

-- Create indexes for better query performance
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
  RAISE NOTICE '🎉 Posts table now supports multi-account context!';
  RAISE NOTICE 'ℹ️  Posts can now track which account they were posted from';
  RAISE NOTICE 'ℹ️  Feed will now display correct account names';
END $$; 