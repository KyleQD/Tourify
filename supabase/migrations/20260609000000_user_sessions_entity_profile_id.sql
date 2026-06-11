-- Migration: Fix user_sessions so active_profile_id stores the real entity UUID.
--
-- Previously active_profile_id referenced profiles(id) via FK, which prevented
-- storing artist / venue / organizer UUIDs (those live in separate tables).
-- We drop that FK constraint and instead record it as an opaque UUID plus the
-- known account type. We also broaden the CHECK to include organization / service.

-- 1. Drop the existing FK on active_profile_id (constraint name may vary by env).
DO $$
BEGIN
  -- Try by conventional name first; swallow error if already gone.
  EXECUTE 'ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_active_profile_id_fkey';
EXCEPTION WHEN others THEN
  NULL; -- already absent
END $$;

-- 2. Broaden the active_account_type CHECK to include all canonical types.
ALTER TABLE user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_active_account_type_check;

ALTER TABLE user_sessions
  ADD CONSTRAINT user_sessions_active_account_type_check
  CHECK (active_account_type IN (
    'general',
    'artist',
    'service',
    'venue',
    'organization',
    'admin',   -- legacy alias accepted
    'staff'    -- deprecated but kept for backwards compat
  ));

-- 3. Back-fill rows that stored userId as active_profile_id for non-general accounts.
--    These rows have session_data->>'account_profile_id' set to the real entity UUID.
UPDATE user_sessions
SET
  active_profile_id = (session_data->>'account_profile_id')::uuid,
  session_data = session_data - 'account_profile_id'
WHERE
  active_account_type <> 'general'
  AND session_data ? 'account_profile_id'
  AND session_data->>'account_profile_id' IS NOT NULL
  AND session_data->>'account_profile_id' <> '';

-- 4. Index to speed up the per-user active session lookup.
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_type
  ON user_sessions (user_id, active_account_type);
