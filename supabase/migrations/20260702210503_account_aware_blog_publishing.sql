set client_min_messages = warning;

-- Account-aware blog publishing.
--
-- Blog rows keep user_id as the authenticated owner while caching the active
-- account that authored the article. The cached author fields make public
-- reads stable for personal, artist/service, venue, and organization posts.

CREATE TABLE IF NOT EXISTS public.artist_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_profile_id UUID REFERENCES public.artist_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  seo_title TEXT,
  seo_description TEXT,
  stats JSONB DEFAULT '{
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0
  }',
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'artist_blog_posts'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'artist_blog_posts'
        AND column_name = 'artist_profile_id'
    ) THEN
      ALTER TABLE public.artist_blog_posts
        ALTER COLUMN artist_profile_id DROP NOT NULL;
    END IF;

    ALTER TABLE public.artist_blog_posts
      ADD COLUMN IF NOT EXISTS posted_as_profile_id UUID,
      ADD COLUMN IF NOT EXISTS posted_as_type TEXT DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS account_display_name TEXT,
      ADD COLUMN IF NOT EXISTS account_username TEXT,
      ADD COLUMN IF NOT EXISTS account_avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS account_is_verified BOOLEAN DEFAULT false;

    ALTER TABLE public.artist_blog_posts
      DROP CONSTRAINT IF EXISTS artist_blog_posts_posted_as_type_check;

    ALTER TABLE public.artist_blog_posts
      ADD CONSTRAINT artist_blog_posts_posted_as_type_check
      CHECK (posted_as_type IN (
        'general', 'artist', 'service', 'venue', 'organization', 'admin', 'staff'
      ));

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'artist_blog_posts'
        AND column_name = 'artist_profile_id'
    ) THEN
      UPDATE public.artist_blog_posts
      SET
        posted_as_profile_id = COALESCE(posted_as_profile_id, artist_profile_id, user_id),
        posted_as_type = COALESCE(posted_as_type, CASE WHEN artist_profile_id IS NOT NULL THEN 'artist' ELSE 'general' END)
      WHERE posted_as_profile_id IS NULL OR posted_as_type IS NULL;
    ELSE
      UPDATE public.artist_blog_posts
      SET
        posted_as_profile_id = COALESCE(posted_as_profile_id, user_id),
        posted_as_type = COALESCE(posted_as_type, 'general')
      WHERE posted_as_profile_id IS NULL OR posted_as_type IS NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'artist_blog_posts'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_artist_blog_posts_acting_entity
      ON public.artist_blog_posts (posted_as_profile_id, posted_as_type);
  END IF;
END $$;

-- The companion feed post uses the same account-attribution snapshot.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS account_display_name TEXT,
  ADD COLUMN IF NOT EXISTS account_username TEXT,
  ADD COLUMN IF NOT EXISTS account_avatar_url TEXT;

-- Normalize older post attribution column names if a database still has them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'posted_as_account_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'posted_as_type'
  ) THEN
    ALTER TABLE public.posts RENAME COLUMN posted_as_account_type TO posted_as_type;
  END IF;

  ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS posted_as_profile_id UUID,
    ADD COLUMN IF NOT EXISTS posted_as_type TEXT DEFAULT 'general';
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_acting_entity_blog_fanout
  ON public.posts (posted_as_profile_id, posted_as_type);

-- Public read and owner write policies for account-aware blog posts.
ALTER TABLE public.artist_blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published blog posts" ON public.artist_blog_posts;
DROP POLICY IF EXISTS "Users can view published blog posts" ON public.artist_blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.artist_blog_posts FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Artists can manage their own blog posts" ON public.artist_blog_posts;
DROP POLICY IF EXISTS "Users can manage their own blog posts" ON public.artist_blog_posts;
DROP POLICY IF EXISTS "Users can create blogs attributed to owned entities" ON public.artist_blog_posts;
DROP POLICY IF EXISTS "Users can delete their own blog posts" ON public.artist_blog_posts;

DO $$
DECLARE
  ownership_check text;
BEGIN
  ownership_check := $check$
    auth.uid() = user_id
    AND (
      posted_as_profile_id IS NULL
      OR posted_as_profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.artist_profiles
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.venue_profiles
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
  $check$;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'organizer_accounts'
  ) THEN
    ownership_check := ownership_check || $check$
      OR EXISTS (
        SELECT 1 FROM public.organizer_accounts
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
    $check$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'account_relationships'
  ) THEN
    ownership_check := ownership_check || $check$
      OR EXISTS (
        SELECT 1 FROM public.account_relationships
        WHERE owned_profile_id = posted_as_profile_id
          AND owner_user_id = auth.uid()
          AND is_active = true
          AND coalesce((permissions ->> 'can_post')::boolean, true) = true
      )
    $check$;
  END IF;

  ownership_check := ownership_check || ')';

  EXECUTE format(
    'CREATE POLICY "Users can create blogs attributed to owned entities" ON public.artist_blog_posts FOR INSERT WITH CHECK (%s)',
    ownership_check
  );

  EXECUTE format(
    'CREATE POLICY "Users can manage their own blog posts" ON public.artist_blog_posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (%s)',
    ownership_check
  );

  EXECUTE
    'CREATE POLICY "Users can delete their own blog posts" ON public.artist_blog_posts FOR DELETE USING (auth.uid() = user_id)';
END $$;
