-- Tourify Migration 02: Core Tables (Events, Tours, Bookings)
-- Run this after 01_helper_functions.sql

-- =============================================================================
-- ENHANCED EVENTS TABLE (if it doesn't exist)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      doors_open TIME,
      location TEXT,
      venue_name TEXT,
      venue_address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      capacity INTEGER,
      ticket_price DECIMAL(10,2),
      ticket_url TEXT,
      type TEXT DEFAULT 'concert' CHECK (type IN ('concert', 'festival', 'tour', 'recording', 'interview', 'other')),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
      is_public BOOLEAN DEFAULT true,
      poster_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created events table';
  ELSE
    RAISE NOTICE 'Events table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- TOURS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours' AND table_schema = 'public') THEN
    CREATE TABLE tours (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      budget DECIMAL(12,2),
      status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed', 'cancelled')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created tours table with user_id column';
  ELSE
    RAISE NOTICE 'Tours table already exists, checking columns...';
    IF NOT column_exists('tours', 'user_id') THEN
      RAISE NOTICE 'WARNING: tours table exists but missing user_id column';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- BOOKINGS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    CREATE TABLE bookings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
      ticket_quantity INTEGER NOT NULL CHECK (ticket_quantity > 0),
      total_price DECIMAL(10,2) NOT NULL,
      booking_details JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created bookings table';
  ELSE
    RAISE NOTICE 'Bookings table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- BOOKING REQUESTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_requests' AND table_schema = 'public') THEN
    CREATE TABLE booking_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      artist_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
      email TEXT,
      phone TEXT,
      booking_details JSONB NOT NULL DEFAULT '{}',
      token TEXT UNIQUE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      request_type TEXT DEFAULT 'performance' CHECK (request_type IN ('performance', 'collaboration')),
      response_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      
      CONSTRAINT booking_request_recipient_check CHECK (
        (artist_user_id IS NOT NULL) OR (email IS NOT NULL OR phone IS NOT NULL)
      ),
      
      CONSTRAINT booking_request_target_check CHECK (
        (event_id IS NOT NULL AND tour_id IS NULL) OR 
        (tour_id IS NOT NULL AND event_id IS NULL)
      )
    );
    RAISE NOTICE 'Created booking_requests table';
  ELSE
    RAISE NOTICE 'Booking_requests table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

DO $$
DECLARE
  tbl_name TEXT;
  table_names TEXT[] := ARRAY['events', 'tours', 'bookings', 'booking_requests'];
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
  table_names TEXT[] := ARRAY['events', 'tours', 'bookings', 'booking_requests'];
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
  RAISE NOTICE '✅ CORE TABLES MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Verify core tables
  RAISE NOTICE 'VERIFICATION - Core tables created:';
  
  -- Check events table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('events', 'user_id');
    RAISE NOTICE '✅ events table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ events table: NOT FOUND';
  END IF;
  
  -- Check tours table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('tours', 'user_id');
    RAISE NOTICE '✅ tours table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ tours table: NOT FOUND';
  END IF;
  
  -- Check bookings table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('bookings', 'user_id');
    RAISE NOTICE '✅ bookings table exists, user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ bookings table: NOT FOUND';
  END IF;
  
  -- Check booking_requests table
  table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_requests' AND table_schema = 'public');
  IF table_exists THEN
    col_exists := column_exists('booking_requests', 'artist_user_id');
    RAISE NOTICE '✅ booking_requests table exists, artist_user_id column: %', CASE WHEN col_exists THEN 'YES' ELSE 'NO' END;
  ELSE
    RAISE NOTICE '❌ booking_requests table: NOT FOUND';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run 03_artist_content_tables.sql next!';
  RAISE NOTICE '============================================================';
END $$; 