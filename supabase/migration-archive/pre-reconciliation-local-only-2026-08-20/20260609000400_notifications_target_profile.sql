-- Add target_profile_id to notifications so they can be scoped to acting entities
-- (artist, venue, org) not just the auth user.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS target_profile_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_account_type TEXT DEFAULT NULL;

COMMENT ON COLUMN notifications.target_profile_id IS
  'Profile UUID of the acting entity this notification is directed at '
  '(artist_profiles.id, venue_profiles.id, organizer_accounts.id, or profiles.id for general). '
  'NULL means general / user-level notification.';

COMMENT ON COLUMN notifications.target_account_type IS
  'Account type matching target_profile_id: general | artist | service | venue | organization';

-- Index for entity-scoped notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_target_profile
  ON notifications (target_profile_id)
  WHERE target_profile_id IS NOT NULL;

-- Composite index: fetch all notifications for a user+entity in one indexed scan
CREATE INDEX IF NOT EXISTS idx_notifications_user_target
  ON notifications (user_id, target_profile_id, created_at DESC);
