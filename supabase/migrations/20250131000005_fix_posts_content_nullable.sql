-- =============================================================================
-- Fix Posts Content Field to Allow NULL for Photo-Only Posts
-- =============================================================================
-- This migration allows posts to have NULL content when they only contain media

-- Allow content to be NULL for photo-only posts
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;

-- Update existing empty content posts to have a default message
UPDATE posts 
SET content = 'Shared a photo' 
WHERE content = '' OR content IS NULL;

-- Add a check constraint to ensure posts have either content or media
ALTER TABLE posts ADD CONSTRAINT posts_content_or_media_check 
CHECK (content IS NOT NULL OR array_length(media_urls, 1) > 0);
