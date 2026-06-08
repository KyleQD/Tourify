-- Remove Demo Tables for Production Readiness
-- This script removes all demo tables and data to ensure production readiness

-- Drop demo tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS demo_likes CASCADE;
DROP TABLE IF EXISTS demo_posts CASCADE;
DROP TABLE IF EXISTS demo_follows CASCADE;
DROP TABLE IF EXISTS demo_profiles CASCADE;

-- Verify demo tables are removed
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'demo_%';

-- If the query above returns any rows, those tables still exist
-- If it returns no rows, all demo tables have been successfully removed



