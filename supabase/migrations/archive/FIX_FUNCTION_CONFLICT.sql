-- =====================================================
-- FIX FUNCTION CONFLICT ISSUE
-- =====================================================
-- Run this first to fix the function conflict error
-- Then run the main comprehensive system

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS get_user_accounts(UUID);
DROP FUNCTION IF EXISTS get_account_display_info(UUID);
DROP FUNCTION IF EXISTS refresh_account_display_info(UUID);
DROP FUNCTION IF EXISTS upsert_account(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_post_with_context(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[]);

-- Drop any other variations that might exist
DROP FUNCTION IF EXISTS get_user_accounts(TEXT);
DROP FUNCTION IF EXISTS get_user_accounts(uuid);
DROP FUNCTION IF EXISTS get_account_display_info(uuid);
DROP FUNCTION IF EXISTS refresh_account_display_info(uuid);
DROP FUNCTION IF EXISTS upsert_account(uuid, TEXT, TEXT, uuid);

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '✅ Existing functions dropped successfully';
  RAISE NOTICE '✅ You can now run the comprehensive system migration';
END $$; 