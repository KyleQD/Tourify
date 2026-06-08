-- Tourify Migration 05: Account Relationships & Jobs System
-- Run this after 04_event_management_tables.sql

-- =============================================================================
-- ACCOUNT RELATIONSHIPS TABLE (Multi-account system)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_relationships' AND table_schema = 'public') THEN
    CREATE TABLE account_relationships (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      owned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      account_type TEXT NOT NULL CHECK (account_type IN ('artist', 'venue', 'admin')),
      permissions JSONB DEFAULT '{
        "can_post": true,
        "can_manage_settings": true,
        "can_view_analytics": true,
        "can_manage_content": true
      }',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(owner_user_id, owned_user_id)
    );
    RAISE NOTICE 'Created account_relationships table';
  ELSE
    RAISE NOTICE 'Account_relationships table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ACCOUNT ACTIVITY LOG TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_activity_log' AND table_schema = 'public') THEN
    CREATE TABLE account_activity_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      account_type TEXT CHECK (account_type IN ('general', 'artist', 'venue', 'admin')),
      action_type TEXT NOT NULL,
      action_details JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created account_activity_log table';
  ELSE
    RAISE NOTICE 'Account_activity_log table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENHANCED NOTIFICATIONS TABLE (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created notifications table';
  ELSE
    RAISE NOTICE 'Notifications table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENHANCED STAFF JOBS TABLE (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_jobs' AND table_schema = 'public') THEN
    CREATE TABLE staff_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      posted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT,
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      pay_rate TEXT,
      requirements TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    RAISE NOTICE 'Created staff_jobs table';
  ELSE
    RAISE NOTICE 'Staff_jobs table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENHANCED STAFF APPLICATIONS TABLE (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_applications' AND table_schema = 'public') THEN
    CREATE TABLE staff_applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id UUID REFERENCES staff_jobs(id) ON DELETE CASCADE NOT NULL,
      applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      cover_letter TEXT,
      resume_url TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(job_id, applicant_id)
    );
    RAISE NOTICE 'Created staff_applications table';
  ELSE
    RAISE NOTICE 'Staff_applications table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

DO $$
DECLARE
  tbl_name TEXT;
  table_names TEXT[] := ARRAY[
    'account_relationships', 'account_activity_log', 'notifications', 
    'staff_jobs', 'staff_applications'
  ];
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
  table_names TEXT[] := ARRAY[
    'account_relationships', 'staff_jobs', 'staff_applications'
  ];
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
  account_jobs_tables TEXT[] := ARRAY[
    'account_relationships', 'account_activity_log', 'notifications',
    'staff_jobs', 'staff_applications'
  ];
  tbl_name TEXT;
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ ACCOUNT & JOBS SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Verify account and jobs tables
  RAISE NOTICE 'VERIFICATION - Account & jobs system tables created:';
  
  FOREACH tbl_name IN ARRAY account_jobs_tables
  LOOP
    table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public');
    IF table_exists THEN
      RAISE NOTICE '✅ % table: EXISTS', tbl_name;
    ELSE
      RAISE NOTICE '❌ % table: NOT FOUND', tbl_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Account & jobs features now available:';
  RAISE NOTICE '- 🔗 Multi-account relationships system';
  RAISE NOTICE '- 📝 Account activity logging';
  RAISE NOTICE '- 🔔 Enhanced notifications system';
  RAISE NOTICE '- 💼 Staff job posting and management';
  RAISE NOTICE '- 📋 Job application tracking system';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run 06_policies_indexes.sql next!';
  RAISE NOTICE '============================================================';
END $$; 