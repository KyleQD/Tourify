-- Tourify Migration 04: Event Management Tables
-- Run this after 03_artist_content_tables.sql

-- =============================================================================
-- EVENT ANALYTICS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_analytics' AND table_schema = 'public') THEN
    CREATE TABLE event_analytics (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      total_views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      conversion_rate DECIMAL(5,2) DEFAULT 0,
      average_ticket_price DECIMAL(10,2) DEFAULT 0,
      total_revenue DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created event_analytics table';
  ELSE
    RAISE NOTICE 'Event_analytics table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- DAILY EVENT ANALYTICS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_analytics_daily' AND table_schema = 'public') THEN
    CREATE TABLE event_analytics_daily (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      tickets_sold INTEGER DEFAULT 0,
      revenue DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created event_analytics_daily table';
  ELSE
    RAISE NOTICE 'Event_analytics_daily table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- EVENT MARKETING CAMPAIGNS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_marketing_campaigns' AND table_schema = 'public') THEN
    CREATE TABLE event_marketing_campaigns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('email', 'social', 'promo', 'paid_ads')),
      status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      budget DECIMAL(10,2) DEFAULT 0,
      spent DECIMAL(10,2) DEFAULT 0,
      target_audience JSONB DEFAULT '{}',
      metrics JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created event_marketing_campaigns table';
  ELSE
    RAISE NOTICE 'Event_marketing_campaigns table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- EVENT PROMO CODES TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_promo_codes' AND table_schema = 'public') THEN
    CREATE TABLE event_promo_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value DECIMAL(10,2) NOT NULL,
      max_uses INTEGER,
      uses_count INTEGER DEFAULT 0,
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, code)
    );
    RAISE NOTICE 'Created event_promo_codes table';
  ELSE
    RAISE NOTICE 'Event_promo_codes table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- EVENT EXPENSES TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_expenses' AND table_schema = 'public') THEN
    CREATE TABLE event_expenses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      description TEXT,
      amount DECIMAL(10,2) NOT NULL,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
      payment_method TEXT,
      receipt_url TEXT,
      vendor TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created event_expenses table';
  ELSE
    RAISE NOTICE 'Event_expenses table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- EVENT BUDGETS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_budgets' AND table_schema = 'public') THEN
    CREATE TABLE event_budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      allocated_amount DECIMAL(10,2) NOT NULL,
      spent_amount DECIMAL(10,2) DEFAULT 0,
      remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, category)
    );
    RAISE NOTICE 'Created event_budgets table';
  ELSE
    RAISE NOTICE 'Event_budgets table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- EVENT TEAM MEMBERS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_team_members' AND table_schema = 'public') THEN
    CREATE TABLE event_team_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      permissions TEXT[] DEFAULT '{}',
      status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'inactive')),
      invited_by UUID REFERENCES auth.users(id),
      joined_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );
    RAISE NOTICE 'Created event_team_members table';
  ELSE
    RAISE NOTICE 'Event_team_members table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

DO $$
DECLARE
  tbl_name TEXT;
  table_names TEXT[] := ARRAY[
    'event_analytics', 'event_analytics_daily', 'event_marketing_campaigns', 
    'event_promo_codes', 'event_expenses', 'event_budgets', 'event_team_members'
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
    'event_analytics', 'event_marketing_campaigns', 'event_promo_codes', 
    'event_expenses', 'event_budgets', 'event_team_members'
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
  event_management_tables TEXT[] := ARRAY[
    'event_analytics', 'event_analytics_daily', 'event_marketing_campaigns',
    'event_promo_codes', 'event_expenses', 'event_budgets', 'event_team_members'
  ];
  tbl_name TEXT;
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ EVENT MANAGEMENT TABLES MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Verify event management tables
  RAISE NOTICE 'VERIFICATION - Event management tables created:';
  
  FOREACH tbl_name IN ARRAY event_management_tables
  LOOP
    table_exists := EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public');
    IF table_exists THEN
      RAISE NOTICE '✅ % table: EXISTS', tbl_name;
    ELSE
      RAISE NOTICE '❌ % table: NOT FOUND', tbl_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Event management features now available:';
  RAISE NOTICE '- 📊 Event analytics and daily tracking';
  RAISE NOTICE '- 📢 Marketing campaigns management';
  RAISE NOTICE '- 🎟️ Promo codes and discounts';
  RAISE NOTICE '- 💰 Expense and budget tracking';
  RAISE NOTICE '- 👥 Team collaboration and permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run 05_account_jobs_tables.sql next!';
  RAISE NOTICE '============================================================';
END $$; 