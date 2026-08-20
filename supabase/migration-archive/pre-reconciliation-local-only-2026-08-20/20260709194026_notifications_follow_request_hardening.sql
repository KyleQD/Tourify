-- Additive hardening for notifications + follow-request inbox.
-- Safe / idempotent: no drops of tables, columns, or RLS policies.

-- 1) Entity-scoped notification columns (may already exist from 20260609000400)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_profile_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_account_type TEXT DEFAULT NULL;

COMMENT ON COLUMN public.notifications.target_profile_id IS
  'Profile UUID of the acting entity this notification is directed at. NULL means general / user-level.';

COMMENT ON COLUMN public.notifications.target_account_type IS
  'Account type matching target_profile_id: general | artist | service | venue | organization';

CREATE INDEX IF NOT EXISTS idx_notifications_target_profile
  ON public.notifications (target_profile_id)
  WHERE target_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_target
  ON public.notifications (user_id, target_profile_id, created_at DESC);

-- 2) Enable Realtime for notifications (client subscriptions already filter by user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 3) Pending inbox lookup index
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_pending
  ON public.follow_requests (target_id, created_at DESC)
  WHERE status = 'pending';
