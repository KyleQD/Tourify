-- Tourify Migration 03: Artist Content Tables
-- Run this after 02_core_tables.sql

-- =============================================================================
-- ARTIST WORKS TABLE (Portfolio)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_works' AND table_schema = 'public') THEN
    CREATE TABLE artist_works (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document')),
      media_url TEXT NOT NULL,
      thumbnail_url TEXT,
      file_size BIGINT,
      duration INTEGER,
      tags TEXT[] DEFAULT '{}',
      is_featured BOOLEAN DEFAULT false,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created artist_works table';
  ELSE
    RAISE NOTICE 'Artist_works table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ARTIST EVENTS TABLE (Separate from main events)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_events' AND table_schema = 'public') THEN
    CREATE TABLE artist_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('concert', 'festival', 'tour', 'recording', 'interview', 'other')),
      venue_name TEXT,
      venue_address TEXT,
      venue_city TEXT,
      venue_state TEXT,
      venue_country TEXT,
      venue_coordinates JSONB,
      event_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      doors_open TIME,
      ticket_url TEXT,
      ticket_price_min DECIMAL(10,2),
      ticket_price_max DECIMAL(10,2),
      capacity INTEGER,
      expected_attendance INTEGER,
      status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled', 'postponed')),
      is_public BOOLEAN DEFAULT true,
      poster_url TEXT,
      setlist TEXT[],
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created artist_events table';
  ELSE
    RAISE NOTICE 'Artist_events table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ARTIST BLOG POSTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_blog_posts' AND table_schema = 'public') THEN
    CREATE TABLE artist_blog_posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created artist_blog_posts table';
  ELSE
    RAISE NOTICE 'Artist_blog_posts table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ARTIST DOCUMENTS TABLE (Press kits, contracts, etc.)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_documents' AND table_schema = 'public') THEN
    CREATE TABLE artist_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('press_release', 'biography', 'rider', 'contract', 'setlist', 'other')),
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size BIGINT,
      is_public BOOLEAN DEFAULT false,
      download_count INTEGER DEFAULT 0,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created artist_documents table';
  ELSE
    RAISE NOTICE 'Artist_documents table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ARTIST MERCHANDISE TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_merchandise' AND table_schema = 'public') THEN
    CREATE TABLE artist_merchandise (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('clothing', 'accessories', 'music', 'collectibles', 'other')),
      price DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      inventory_count INTEGER DEFAULT 0,
      sku TEXT,
      images TEXT[] DEFAULT '{}',
      sizes TEXT[] DEFAULT '{}',
      colors TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created artist_merchandise table';
  ELSE
    RAISE NOTICE 'Artist_merchandise table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

DO $$
DECLARE
  tbl_name TEXT;
  table_names TEXT[] := ARRAY['artist_works', 'artist_events', 'artist_blog_posts', 'artist_documents', 'artist_merchandise'];
BEGIN
  FOREACH tbl_name IN ARRAY table_names
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE 'Enabled RLS on % table', tbl_name;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- CREATE UPDATE TRIGGERS
-- =============================================================================

DO $$
DECLARE
  tbl_name TEXT;
  table_names TEXT[] := ARRAY['artist_works', 'artist_events', 'artist_blog_posts', 'artist_documents', 'artist_merchandise'];
BEGIN
  FOREACH tbl_name IN ARRAY table_names
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') 
       AND column_exists(tbl_name, 'updated_at') THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
        CREATE TRIGGER update_%I_updated_at
          BEFORE UPDATE ON %I
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      ', tbl_name, tbl_name, tbl_name, tbl_name);
      RAISE NOTICE 'Created update trigger for % table', tbl_name;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$ 
DECLARE
  table_exists BOOLEAN;
  col_exists BOOLEAN;
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ ARTIST CONTENT TABLES MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Verify artist content tables
  RAISE NOTICE 'VERIFICATION - Artist content tables created:';
  
  -- Check artist_works table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_works' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('artist_works', 'user_id');
    RAISE NOTICE '✅ artist_works table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ artist_works table: NOT FOUND';
  END IF;
  
  -- Check artist_events table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_events' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('artist_events', 'user_id');
    RAISE NOTICE '✅ artist_events table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ artist_events table: NOT FOUND';
  END IF;
  
  -- Check artist_blog_posts table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_blog_posts' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('artist_blog_posts', 'user_id');
    RAISE NOTICE '✅ artist_blog_posts table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ artist_blog_posts table: NOT FOUND';
  END IF;
  
  -- Check artist_documents table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_documents' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('artist_documents', 'user_id');
    RAISE NOTICE '✅ artist_documents table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ artist_documents table: NOT FOUND';
  END IF;
  
  -- Check artist_merchandise table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_merchandise' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('artist_merchandise', 'user_id');
    RAISE NOTICE '✅ artist_merchandise table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ artist_merchandise table: NOT FOUND';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run 04_event_management_tables.sql next!';
  RAISE NOTICE '============================================================';
END $$; 