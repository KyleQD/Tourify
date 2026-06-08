-- Tourify Migration 06: RLS Policies & Performance Indexes
-- Run this after 05_account_jobs_tables.sql

-- =============================================================================
-- CREATE SAFE RLS POLICIES FOR EVENTS TABLE
-- =============================================================================

DO $$
DECLARE
  user_column TEXT;
BEGIN
  -- Only create policies if events table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    -- Determine the correct user column
    user_column := get_events_user_column();
    
    -- Only proceed if we have a valid user column
    IF column_exists('events', user_column) THEN
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can manage their own events" ON events;
      DROP POLICY IF EXISTS "Users can view public events" ON events;
      DROP POLICY IF EXISTS "Users can view events" ON events;
      
      -- Create policies based on actual column structure
      IF column_exists('events', 'is_public') THEN
        EXECUTE format('CREATE POLICY "Users can view public events" ON events FOR SELECT USING (is_public = true OR auth.uid() = %I)', user_column);
      ELSE
        EXECUTE format('CREATE POLICY "Users can view events" ON events FOR SELECT USING (true)');
      END IF;
      
      EXECUTE format('CREATE POLICY "Users can manage their own events" ON events FOR ALL USING (auth.uid() = %I)', user_column);
      
      RAISE NOTICE 'Created events policies using column: %', user_column;
    ELSE
      RAISE NOTICE 'Skipping events policies - no valid user column found';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping events policies - events table does not exist';
  END IF;
END $$;

-- =============================================================================
-- CREATE RLS POLICIES FOR CORE TABLES
-- =============================================================================

DO $$
BEGIN
  -- Tours policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours' AND table_schema = 'public') 
     AND column_exists('tours', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own tours" ON tours;
    CREATE POLICY "Users can manage their own tours" ON tours FOR ALL USING (auth.uid() = user_id);
    RAISE NOTICE 'Created tours policies';
  END IF;
  
  -- Bookings policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') 
     AND column_exists('bookings', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own bookings" ON bookings;
    CREATE POLICY "Users can manage their own bookings" ON bookings FOR ALL USING (auth.uid() = user_id);
    RAISE NOTICE 'Created bookings policies';
  END IF;
  
  -- Booking requests policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_requests' AND table_schema = 'public') 
     AND column_exists('booking_requests', 'artist_user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own booking requests" ON booking_requests;
    CREATE POLICY "Users can manage their own booking requests" ON booking_requests FOR ALL USING (auth.uid() = artist_user_id);
    RAISE NOTICE 'Created booking_requests policies';
  END IF;
END $$;

-- =============================================================================
-- CREATE RLS POLICIES FOR ARTIST CONTENT TABLES
-- =============================================================================

DO $$
BEGIN
  -- Artist works policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_works' AND table_schema = 'public') 
     AND column_exists('artist_works', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own artist works" ON artist_works;
    DROP POLICY IF EXISTS "Users can view public artist works" ON artist_works;
    CREATE POLICY "Users can manage their own artist works" ON artist_works FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users can view public artist works" ON artist_works FOR SELECT USING (true);
    RAISE NOTICE 'Created artist_works policies';
  END IF;
  
  -- Artist events policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_events' AND table_schema = 'public') 
     AND column_exists('artist_events', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own artist events" ON artist_events;
    DROP POLICY IF EXISTS "Users can view public artist events" ON artist_events;
    CREATE POLICY "Users can manage their own artist events" ON artist_events FOR ALL USING (auth.uid() = user_id);
    IF column_exists('artist_events', 'is_public') THEN
      CREATE POLICY "Users can view public artist events" ON artist_events FOR SELECT USING (is_public = true OR auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can view public artist events" ON artist_events FOR SELECT USING (true);
    END IF;
    RAISE NOTICE 'Created artist_events policies';
  END IF;
  
  -- Artist blog posts policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_blog_posts' AND table_schema = 'public') 
     AND column_exists('artist_blog_posts', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own blog posts" ON artist_blog_posts;
    DROP POLICY IF EXISTS "Users can view published blog posts" ON artist_blog_posts;
    CREATE POLICY "Users can manage their own blog posts" ON artist_blog_posts FOR ALL USING (auth.uid() = user_id);
    IF column_exists('artist_blog_posts', 'status') THEN
      CREATE POLICY "Users can view published blog posts" ON artist_blog_posts FOR SELECT USING (status = 'published' OR auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can view published blog posts" ON artist_blog_posts FOR SELECT USING (true);
    END IF;
    RAISE NOTICE 'Created artist_blog_posts policies';
  END IF;
  
  -- Artist documents policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_documents' AND table_schema = 'public') 
     AND column_exists('artist_documents', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own documents" ON artist_documents;
    DROP POLICY IF EXISTS "Users can view public documents" ON artist_documents;
    CREATE POLICY "Users can manage their own documents" ON artist_documents FOR ALL USING (auth.uid() = user_id);
    IF column_exists('artist_documents', 'is_public') THEN
      CREATE POLICY "Users can view public documents" ON artist_documents FOR SELECT USING (is_public = true OR auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can view public documents" ON artist_documents FOR SELECT USING (auth.uid() = user_id);
    END IF;
    RAISE NOTICE 'Created artist_documents policies';
  END IF;
  
  -- Artist merchandise policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_merchandise' AND table_schema = 'public') 
     AND column_exists('artist_merchandise', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own merchandise" ON artist_merchandise;
    DROP POLICY IF EXISTS "Users can view active merchandise" ON artist_merchandise;
    CREATE POLICY "Users can manage their own merchandise" ON artist_merchandise FOR ALL USING (auth.uid() = user_id);
    IF column_exists('artist_merchandise', 'status') THEN
      CREATE POLICY "Users can view active merchandise" ON artist_merchandise FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can view active merchandise" ON artist_merchandise FOR SELECT USING (true);
    END IF;
    RAISE NOTICE 'Created artist_merchandise policies';
  END IF;
END $$;

-- =============================================================================
-- CREATE RLS POLICIES FOR EVENT MANAGEMENT TABLES
-- =============================================================================

DO $$
DECLARE
  events_user_col TEXT;
  policy_sql TEXT;
BEGIN
  -- Skip event management policies if events table doesn't exist or has no user column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    events_user_col := get_events_user_column();
    
    IF column_exists('events', events_user_col) THEN
      -- Event analytics policies (event owners can view)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_analytics' AND table_schema = 'public') 
         AND column_exists('event_analytics', 'event_id') THEN
        DROP POLICY IF EXISTS "Event owners can view analytics" ON event_analytics;
        
        policy_sql := format('CREATE POLICY "Event owners can view analytics" ON event_analytics FOR SELECT 
        USING (EXISTS (
          SELECT 1 FROM events WHERE events.id = event_analytics.event_id 
          AND auth.uid() = events.%I
        ))', events_user_col);
        
        EXECUTE policy_sql;
        RAISE NOTICE 'Created event_analytics policies using %', events_user_col;
      END IF;
      
      -- Event team members policies
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_team_members' AND table_schema = 'public') 
         AND column_exists('event_team_members', 'user_id') THEN
        DROP POLICY IF EXISTS "Users can view their team memberships" ON event_team_members;
        DROP POLICY IF EXISTS "Event owners can manage team" ON event_team_members;
        
        CREATE POLICY "Users can view their team memberships" ON event_team_members FOR SELECT USING (auth.uid() = user_id);
        
        policy_sql := format('CREATE POLICY "Event owners can manage team" ON event_team_members FOR ALL 
        USING (EXISTS (
          SELECT 1 FROM events WHERE events.id = event_team_members.event_id 
          AND auth.uid() = events.%I
        ))', events_user_col);
        
        EXECUTE policy_sql;
        RAISE NOTICE 'Created event_team_members policies using %', events_user_col;
      END IF;
    ELSE
      RAISE NOTICE 'Skipping event management policies - no valid user column in events table';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping event management policies - events table does not exist';
  END IF;
END $$;

-- =============================================================================
-- CREATE RLS POLICIES FOR ACCOUNT & JOBS TABLES
-- =============================================================================

DO $$
BEGIN
  -- Notifications policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') 
     AND column_exists('notifications', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
    CREATE POLICY "Users can manage their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
    RAISE NOTICE 'Created notifications policies';
  END IF;
  
  -- Staff jobs policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_jobs' AND table_schema = 'public') 
     AND column_exists('staff_jobs', 'posted_by') THEN
    DROP POLICY IF EXISTS "Users can view and apply to jobs" ON staff_jobs;
    DROP POLICY IF EXISTS "Job posters can manage their jobs" ON staff_jobs;
    CREATE POLICY "Users can view and apply to jobs" ON staff_jobs FOR SELECT USING (true);
    CREATE POLICY "Job posters can manage their jobs" ON staff_jobs 
    FOR ALL USING (auth.uid() = posted_by);
    RAISE NOTICE 'Created staff_jobs policies';
  END IF;
  
  -- Staff applications policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_applications' AND table_schema = 'public') 
     AND column_exists('staff_applications', 'applicant_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_jobs' AND table_schema = 'public')
     AND column_exists('staff_jobs', 'posted_by') THEN
    DROP POLICY IF EXISTS "Users can manage their own applications" ON staff_applications;
    DROP POLICY IF EXISTS "Job posters can view applications" ON staff_applications;
    CREATE POLICY "Users can manage their own applications" ON staff_applications FOR ALL USING (auth.uid() = applicant_id);
    CREATE POLICY "Job posters can view applications" ON staff_applications FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM staff_jobs WHERE staff_jobs.id = staff_applications.job_id 
      AND auth.uid() = staff_jobs.posted_by
    ));
    RAISE NOTICE 'Created staff_applications policies';
  ELSE
    RAISE NOTICE 'Skipping staff_applications policies - missing required tables or columns';
  END IF;
  
  -- Account relationships policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships' AND table_schema = 'public') 
     AND column_exists('account_relationships', 'owner_user_id') THEN
    DROP POLICY IF EXISTS "Users can manage their account relationships" ON account_relationships;
    CREATE POLICY "Users can manage their account relationships" ON account_relationships 
    FOR ALL USING (auth.uid() = owner_user_id OR auth.uid() = owned_user_id);
    RAISE NOTICE 'Created account_relationships policies';
  END IF;
  
  -- Account activity log policies (read-only for users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log' AND table_schema = 'public') 
     AND column_exists('account_activity_log', 'user_id') THEN
    DROP POLICY IF EXISTS "Users can view their activity log" ON account_activity_log;
    CREATE POLICY "Users can view their activity log" ON account_activity_log FOR SELECT USING (auth.uid() = user_id);
    RAISE NOTICE 'Created account_activity_log policies';
  END IF;
END $$;

-- =============================================================================
-- CREATE PERFORMANCE INDEXES
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Creating performance indexes...';
  
  -- Events indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    IF column_exists('events', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    ELSIF column_exists('events', 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
    END IF;
    
    IF column_exists('events', 'event_date') THEN
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    ELSIF column_exists('events', 'date') THEN
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    END IF;
    
    IF column_exists('events', 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    END IF;
    
    IF column_exists('events', 'type') THEN
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    END IF;
  END IF;
  
  -- Tours indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours' AND table_schema = 'public') THEN
    IF column_exists('tours', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_tours_user_id ON tours(user_id);
    END IF;
    IF column_exists('tours', 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
    END IF;
    IF column_exists('tours', 'start_date') AND column_exists('tours', 'end_date') THEN
      CREATE INDEX IF NOT EXISTS idx_tours_dates ON tours(start_date, end_date);
    END IF;
  END IF;
  
  -- Bookings indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    IF column_exists('bookings', 'event_id') THEN
      CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
    END IF;
    IF column_exists('bookings', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
    END IF;
    IF column_exists('bookings', 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    END IF;
  END IF;
  
  -- Artist works indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_works' AND table_schema = 'public') THEN
    IF column_exists('artist_works', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_works_user_id ON artist_works(user_id);
    END IF;
    IF column_exists('artist_works', 'media_type') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_works_type ON artist_works(media_type);
    END IF;
    IF column_exists('artist_works', 'is_featured') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_works_featured ON artist_works(is_featured);
    END IF;
  END IF;
  
  -- Artist events indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_events' AND table_schema = 'public') THEN
    IF column_exists('artist_events', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_events_user_id ON artist_events(user_id);
    END IF;
    IF column_exists('artist_events', 'event_date') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_events_date ON artist_events(event_date);
    END IF;
    IF column_exists('artist_events', 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_artist_events_status ON artist_events(status);
    END IF;
  END IF;
  
  -- Notifications indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    IF column_exists('notifications', 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    END IF;
    IF column_exists('notifications', 'is_read') THEN
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    END IF;
    IF column_exists('notifications', 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    END IF;
  END IF;
  
  -- Staff jobs indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_jobs' AND table_schema = 'public') THEN
    IF column_exists('staff_jobs', 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_staff_jobs_status ON staff_jobs(status);
    END IF;
    IF column_exists('staff_jobs', 'posted_by') THEN
      CREATE INDEX IF NOT EXISTS idx_staff_jobs_posted_by ON staff_jobs(posted_by);
    END IF;
    IF column_exists('staff_jobs', 'department') THEN
      CREATE INDEX IF NOT EXISTS idx_staff_jobs_department ON staff_jobs(department);
    END IF;
  END IF;
  
  RAISE NOTICE 'Completed performance indexes creation';
END $$;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$ 
DECLARE
  total_tables INTEGER;
  total_policies INTEGER;
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '🎉 TOURIFY PLATFORM SETUP COMPLETE!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Count what we've created
  SELECT COUNT(*) INTO total_tables FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name IN (
    'events', 'tours', 'bookings', 'booking_requests',
    'artist_works', 'artist_events', 'artist_blog_posts', 'artist_documents', 'artist_merchandise',
    'event_analytics', 'event_analytics_daily', 'event_marketing_campaigns', 'event_promo_codes', 
    'event_expenses', 'event_budgets', 'event_team_members',
    'account_relationships', 'account_activity_log', 'notifications', 'staff_jobs', 'staff_applications'
  );
  
  SELECT COUNT(*) INTO total_policies FROM pg_policies WHERE schemaname = 'public';
  
  RAISE NOTICE 'FINAL STATISTICS:';
  RAISE NOTICE '📊 Tourify tables created: %', total_tables;
  RAISE NOTICE '🔒 RLS policies created: %', total_policies;
  RAISE NOTICE '';
  
  RAISE NOTICE 'PLATFORM FEATURES NOW AVAILABLE:';
  RAISE NOTICE '✅ Core Events & Booking System';
  RAISE NOTICE '✅ Artist Content Management';
  RAISE NOTICE '✅ Event Analytics & Marketing Tools';
  RAISE NOTICE '✅ Team Collaboration System';
  RAISE NOTICE '✅ Multi-Account Relationships';
  RAISE NOTICE '✅ Job Posting & Application System';
  RAISE NOTICE '✅ Enhanced Notifications';
  RAISE NOTICE '✅ Row Level Security';
  RAISE NOTICE '';
  RAISE NOTICE 'Your Tourify platform is now fully equipped! 🚀';
  RAISE NOTICE '============================================================';
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_events_user_column(); 