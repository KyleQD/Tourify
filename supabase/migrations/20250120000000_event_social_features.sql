-- =============================================================================
-- EVENT SOCIAL FEATURES MIGRATION
-- Comprehensive system for event pages with social features and attendance
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- EVENT ATTENDANCE TABLE
-- Track who's attending events (like Facebook Events attendance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL, -- References artist_events(id) or events(id)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_table TEXT NOT NULL DEFAULT 'artist_events' CHECK (event_table IN ('artist_events', 'events')),
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'interested', 'not_going')),
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one attendance record per user per event
  UNIQUE(event_id, user_id, event_table)
);

-- =============================================================================
-- EVENT POSTS TABLE
-- Event-specific posts and updates (like Facebook Event posts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL, -- References artist_events(id) or events(id)
  event_table TEXT NOT NULL DEFAULT 'artist_events' CHECK (event_table IN ('artist_events', 'events')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'announcement')),
  media_urls TEXT[], -- Array of media URLs
  is_announcement BOOLEAN DEFAULT FALSE, -- Special posts from event organizers
  is_pinned BOOLEAN DEFAULT FALSE, -- Pinned posts appear at top
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'attendees', 'organizers')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- EVENT POST LIKES TABLE
-- Track likes on event posts
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES event_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one like per user per post
  UNIQUE(post_id, user_id)
);

-- =============================================================================
-- EVENT POST COMMENTS TABLE
-- Comments on event posts
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES event_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES event_post_comments(id) ON DELETE CASCADE, -- For nested comments
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- EVENT POST COMMENT LIKES TABLE
-- Track likes on event post comments
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_post_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES event_post_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one like per user per comment
  UNIQUE(comment_id, user_id)
);

-- =============================================================================
-- ENHANCE ARTIST_EVENTS TABLE
-- Add missing fields for comprehensive event management
-- =============================================================================

-- Add slug field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'slug') THEN
    ALTER TABLE artist_events ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- Add social_links field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'social_links') THEN
    ALTER TABLE artist_events ADD COLUMN social_links JSONB DEFAULT '{"facebook": "", "twitter": "", "instagram": "", "website": ""}'::jsonb;
  END IF;
END $$;

-- Add tags field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'tags') THEN
    ALTER TABLE artist_events ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add venue_coordinates field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'venue_coordinates') THEN
    ALTER TABLE artist_events ADD COLUMN venue_coordinates JSONB; -- {"lat": 40.7128, "lng": -74.0060}
  END IF;
END $$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Event attendance indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id, event_table);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(status);

-- Event posts indexes
CREATE INDEX IF NOT EXISTS idx_event_posts_event_id ON event_posts(event_id, event_table);
CREATE INDEX IF NOT EXISTS idx_event_posts_user_id ON event_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_created_at ON event_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_posts_is_pinned ON event_posts(is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_event_posts_visibility ON event_posts(visibility);

-- Event post likes indexes
CREATE INDEX IF NOT EXISTS idx_event_post_likes_post_id ON event_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_event_post_likes_user_id ON event_post_likes(user_id);

-- Event post comments indexes
CREATE INDEX IF NOT EXISTS idx_event_post_comments_post_id ON event_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_event_post_comments_user_id ON event_post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_post_comments_parent_id ON event_post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_post_comments_created_at ON event_post_comments(created_at DESC);

-- Event post comment likes indexes
CREATE INDEX IF NOT EXISTS idx_event_post_comment_likes_comment_id ON event_post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_event_post_comment_likes_user_id ON event_post_comment_likes(user_id);

-- Artist events indexes
CREATE INDEX IF NOT EXISTS idx_artist_events_slug ON artist_events(slug);
CREATE INDEX IF NOT EXISTS idx_artist_events_user_id ON artist_events(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_events_event_date ON artist_events(event_date);
CREATE INDEX IF NOT EXISTS idx_artist_events_is_public ON artist_events(is_public);
CREATE INDEX IF NOT EXISTS idx_artist_events_status ON artist_events(status);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update likes_count when likes are added/removed
CREATE OR REPLACE FUNCTION update_event_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_post_likes_count ON event_post_likes;
CREATE TRIGGER trg_event_post_likes_count
  AFTER INSERT OR DELETE ON event_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_event_post_likes_count();

-- Update comments_count when comments are added/removed
CREATE OR REPLACE FUNCTION update_event_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_post_comments_count ON event_post_comments;
CREATE TRIGGER trg_event_post_comments_count
  AFTER INSERT OR DELETE ON event_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_post_comments_count();

-- Update comment likes_count when comment likes are added/removed
CREATE OR REPLACE FUNCTION update_event_post_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_post_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_post_comment_likes_count ON event_post_comment_likes;
CREATE TRIGGER trg_event_post_comment_likes_count
  AFTER INSERT OR DELETE ON event_post_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_event_post_comment_likes_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_post_comment_likes ENABLE ROW LEVEL SECURITY;

-- Event attendance policies
CREATE POLICY "Users can view attendance for public events" ON event_attendance
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own attendance" ON event_attendance
  FOR ALL USING (auth.uid() = user_id);

-- Event posts policies
CREATE POLICY "Users can view public event posts" ON event_posts
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can create posts for events they're attending or organizing" ON event_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      visibility = 'public' OR
      EXISTS (
        SELECT 1 FROM event_attendance 
        WHERE event_id = event_posts.event_id 
        AND user_id = auth.uid() 
        AND status = 'attending'
      )
    )
  );

CREATE POLICY "Users can update their own posts" ON event_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts or event organizers can delete any post" ON event_posts
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM artist_events 
      WHERE id = event_posts.event_id 
      AND user_id = auth.uid()
    )
  );

-- Event post likes policies
CREATE POLICY "Users can view all post likes" ON event_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON event_post_likes
  FOR ALL USING (auth.uid() = user_id);

-- Event post comments policies
CREATE POLICY "Users can view all comments" ON event_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON event_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON event_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments or event organizers can delete any comment" ON event_post_comments
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM artist_events 
      WHERE id = (
        SELECT event_id FROM event_posts WHERE id = event_post_comments.post_id
      )
      AND user_id = auth.uid()
    )
  );

-- Event post comment likes policies
CREATE POLICY "Users can view all comment likes" ON event_post_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own comment likes" ON event_post_comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Function to get event page data
CREATE OR REPLACE FUNCTION get_event_page_data(
  p_event_id UUID,
  p_event_table TEXT DEFAULT 'artist_events'
)
RETURNS JSON AS $$
DECLARE
  event_data JSON;
  attendance_data JSON;
  posts_data JSON;
BEGIN
  -- Get event data
  SELECT to_json(e.*) INTO event_data
  FROM artist_events e
  WHERE e.id = p_event_id;
  
  -- Get attendance data
  SELECT json_build_object(
    'attending', COUNT(*) FILTER (WHERE status = 'attending'),
    'interested', COUNT(*) FILTER (WHERE status = 'interested'),
    'not_going', COUNT(*) FILTER (WHERE status = 'not_going'),
    'user_status', (
      SELECT status FROM event_attendance 
      WHERE event_id = p_event_id 
      AND user_id = auth.uid() 
      AND event_table = p_event_table
    )
  ) INTO attendance_data
  FROM event_attendance
  WHERE event_id = p_event_id AND event_table = p_event_table;
  
  -- Get posts data
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'content', p.content,
      'type', p.type,
      'media_urls', p.media_urls,
      'is_announcement', p.is_announcement,
      'is_pinned', p.is_pinned,
      'visibility', p.visibility,
      'likes_count', p.likes_count,
      'comments_count', p.comments_count,
      'created_at', p.created_at,
      'user', json_build_object(
        'id', u.id,
        'username', u.username,
        'full_name', u.full_name,
        'avatar_url', u.avatar_url,
        'is_verified', u.is_verified
      )
    )
  ) INTO posts_data
  FROM event_posts p
  LEFT JOIN profiles u ON p.user_id = u.id
  WHERE p.event_id = p_event_id AND p.event_table = p_event_table
  ORDER BY p.is_pinned DESC, p.created_at DESC;
  
  RETURN json_build_object(
    'event', event_data,
    'attendance', attendance_data,
    'posts', COALESCE(posts_data, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create event with automatic post
CREATE OR REPLACE FUNCTION create_event_with_post(
  p_event_data JSONB,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  new_event_id UUID;
  event_slug TEXT;
  post_content TEXT;
BEGIN
  -- Generate slug from title
  event_slug := lower(regexp_replace(p_event_data->>'title', '[^a-z0-9]+', '-', 'g'));
  event_slug := regexp_replace(event_slug, '^-|-$', '', 'g');
  event_slug := substring(event_slug from 1 for 60);
  event_slug := event_slug || '-' || substring(md5(random()::text) from 1 for 8);
  
  -- Insert event
  INSERT INTO artist_events (
    user_id,
    title,
    description,
    type,
    venue_name,
    venue_address,
    venue_city,
    venue_state,
    venue_country,
    event_date,
    start_time,
    end_time,
    doors_open,
    ticket_url,
    ticket_price_min,
    ticket_price_max,
    capacity,
    status,
    is_public,
    poster_url,
    setlist,
    tags,
    social_links,
    slug,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_event_data->>'title',
    p_event_data->>'description',
    p_event_data->>'type',
    p_event_data->>'venue_name',
    p_event_data->>'venue_address',
    p_event_data->>'venue_city',
    p_event_data->>'venue_state',
    p_event_data->>'venue_country',
    (p_event_data->>'event_date')::date,
    p_event_data->>'start_time',
    p_event_data->>'end_time',
    p_event_data->>'doors_open',
    p_event_data->>'ticket_url',
    (p_event_data->>'ticket_price_min')::numeric,
    (p_event_data->>'ticket_price_max')::numeric,
    (p_event_data->>'capacity')::integer,
    p_event_data->>'status',
    (p_event_data->>'is_public')::boolean,
    p_event_data->>'poster_url',
    (p_event_data->>'setlist')::text[],
    (p_event_data->>'tags')::text[],
    p_event_data->'social_links',
    event_slug,
    NOW(),
    NOW()
  ) RETURNING id INTO new_event_id;
  
  -- Create automatic social post
  post_content := format(
    '🎵 New Event: %s

📅 %s
📍 %s, %s

%s

#%s #live #music',
    p_event_data->>'title',
    (p_event_data->>'event_date')::date,
    p_event_data->>'venue_name',
    p_event_data->>'venue_city',
    COALESCE(p_event_data->>'description', ''),
    p_event_data->>'type'
  );
  
  INSERT INTO posts (
    user_id,
    content,
    type,
    visibility,
    media_urls,
    hashtags,
    metadata
  ) VALUES (
    p_user_id,
    post_content,
    'event',
    'public',
    CASE WHEN p_event_data->>'poster_url' IS NOT NULL 
         THEN ARRAY[p_event_data->>'poster_url'] 
         ELSE NULL 
    END,
    COALESCE((p_event_data->>'tags')::text[], ARRAY[]::text[]) || 
    ARRAY[p_event_data->>'type', 'live', 'music'],
    jsonb_build_object(
      'event_id', new_event_id,
      'event_title', p_event_data->>'title',
      'event_date', p_event_data->>'event_date',
      'event_venue', p_event_data->>'venue_name'
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'event_id', new_event_id,
    'slug', event_slug
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log successful migration
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('20250120000000_event_social_features', NOW())
ON CONFLICT (version) DO NOTHING;
