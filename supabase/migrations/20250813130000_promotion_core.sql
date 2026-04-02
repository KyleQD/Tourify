-- Core schema for promotions, organizer pages, follows, and feeds

-- 1) promotion_posts
CREATE TABLE IF NOT EXISTS promotion_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_type TEXT NOT NULL CHECK (author_type IN ('organizer','artist','venue','individual')),
  author_id UUID NOT NULL,
  event_id UUID,
  tour_id UUID,
  title TEXT,
  content TEXT,
  images JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published')),
  publish_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_posts_author ON promotion_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_promotion_posts_event ON promotion_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_promotion_posts_status ON promotion_posts(status);
CREATE INDEX IF NOT EXISTS idx_promotion_posts_visibility ON promotion_posts(visibility);

ALTER TABLE promotion_posts ENABLE ROW LEVEL SECURITY;

-- Policies: public can read published+public
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='promotion_posts' AND policyname='promotion_public_read'
  ) THEN
    CREATE POLICY promotion_public_read ON promotion_posts
      FOR SELECT USING (status = 'published' AND visibility = 'public');
  END IF;
END $$;

-- Author can read/update/delete own posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='promotion_posts' AND policyname='promotion_author_rw'
  ) THEN
    CREATE POLICY promotion_author_rw ON promotion_posts
      FOR ALL USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
  END IF;
END $$;

-- 2) post_collaborators
CREATE TABLE IF NOT EXISTS post_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES promotion_posts(id) ON DELETE CASCADE,
  collaborator_type TEXT NOT NULL CHECK (collaborator_type IN ('organizer','artist','venue','individual')),
  collaborator_id UUID NOT NULL,
  role TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined')),
  can_reshare BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, collaborator_type, collaborator_id)
);

ALTER TABLE post_collaborators ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='post_collaborators' AND policyname='post_collab_read'
  ) THEN
    CREATE POLICY post_collab_read ON post_collaborators
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM promotion_posts p WHERE p.id = post_collaborators.post_id AND (
          p.author_id = auth.uid() OR post_collaborators.collaborator_id = auth.uid()
        ))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='post_collaborators' AND policyname='post_collab_write_author'
  ) THEN
    CREATE POLICY post_collab_write_author ON post_collaborators
      FOR ALL USING (
        EXISTS (SELECT 1 FROM promotion_posts p WHERE p.id = post_collaborators.post_id AND p.author_id = auth.uid())
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM promotion_posts p WHERE p.id = post_collaborators.post_id AND p.author_id = auth.uid())
      );
  END IF;
END $$;

-- 3) organizer_pages
CREATE TABLE IF NOT EXISTS organizer_pages (
  user_id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  socials JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizer_pages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='organizer_pages' AND policyname='organizer_public_read'
  ) THEN
    CREATE POLICY organizer_public_read ON organizer_pages FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='organizer_pages' AND policyname='organizer_owner_rw'
  ) THEN
    CREATE POLICY organizer_owner_rw ON organizer_pages FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4) follows
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('organizer','artist','venue')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, target_type, target_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='follows' AND policyname='follows_owner_rw'
  ) THEN
    CREATE POLICY follows_owner_rw ON follows FOR ALL USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'target_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'target_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_follows_target ON follows(target_type, target_id)';
  END IF;
END $$;

-- 5) feed_events (server-managed fanout)
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES promotion_posts(id) ON DELETE CASCADE,
  rank_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_events_user ON feed_events(user_id, created_at DESC);


