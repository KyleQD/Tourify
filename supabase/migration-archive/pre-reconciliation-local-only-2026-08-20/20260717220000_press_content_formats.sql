-- Press ecosystem: content formats + distribution metadata on artist_blog_posts

ALTER TABLE public.artist_blog_posts
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'blog',
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS boilerplate TEXT,
  ADD COLUMN IF NOT EXISTS embargo_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distribution JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artist_blog_posts_format_check'
  ) THEN
    ALTER TABLE public.artist_blog_posts
      ADD CONSTRAINT artist_blog_posts_format_check
      CHECK (format IN ('blog', 'article', 'press_release'));
  END IF;
END $$;

UPDATE public.artist_blog_posts
SET format = 'blog'
WHERE format IS NULL OR format = '';

UPDATE public.artist_blog_posts
SET distribution = CASE format
  WHEN 'blog' THEN jsonb_build_object('feed', true, 'news', false, 'recipients_only', false)
  WHEN 'article' THEN jsonb_build_object('feed', false, 'news', true, 'recipients_only', false)
  WHEN 'press_release' THEN jsonb_build_object('feed', false, 'news', false, 'recipients_only', true)
  ELSE distribution
END
WHERE distribution = '{}'::jsonb OR distribution IS NULL;

CREATE INDEX IF NOT EXISTS idx_artist_blog_posts_format_status_published
  ON public.artist_blog_posts (format, status, published_at DESC NULLS LAST);

COMMENT ON COLUMN public.artist_blog_posts.format IS 'Press format: blog (feed), article (news), press_release (selective share + PDF)';
COMMENT ON COLUMN public.artist_blog_posts.distribution IS 'Distribution flags: feed, news, recipients_only';
