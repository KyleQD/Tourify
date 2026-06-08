-- Tourify Migration 01: Helper Functions and Basic Setup
-- Run this first to set up utility functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if column exists
CREATE OR REPLACE FUNCTION column_exists(tbl_name TEXT, col_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = tbl_name 
    AND column_name = col_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get the user reference column name for events table
CREATE OR REPLACE FUNCTION get_events_user_column()
RETURNS TEXT AS $$
BEGIN
  IF column_exists('events', 'user_id') THEN
    RETURN 'user_id';
  ELSIF column_exists('events', 'created_by') THEN
    RETURN 'created_by';
  ELSE
    RETURN 'user_id'; -- Default fallback
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ HELPER FUNCTIONS SETUP COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created utility functions:';
  RAISE NOTICE '- update_updated_at_column() - for automatic timestamp updates';
  RAISE NOTICE '- column_exists() - for safe column checking';
  RAISE NOTICE '- get_events_user_column() - for dynamic events column detection';
  RAISE NOTICE '';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run the next migration file!';
  RAISE NOTICE '============================================================';
END $$; 