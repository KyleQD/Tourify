set client_min_messages = warning;

-- MIGRATION ORDERING NOTE
-- This migration intentionally runs AFTER the original event-bulletins RLS
-- definitions (in supabase/migrations/2025*_event_*.sql) and AFTER the Event HQ
-- communications package, because those migrations create the conflicting "event_bulletins_*"
-- policies that this dedup deliberately drops. If you reorder these files (e.g. via squash
-- or rebase) the drops here will silently no-op and re-introduce overly permissive policies.

-- Remove permissive Event HQ policies so the stricter event communications
-- policies remain the single source of truth.
DROP POLICY IF EXISTS "event_bulletins_read" ON event_bulletins;
DROP POLICY IF EXISTS "event_bulletins_insert" ON event_bulletins;
DROP POLICY IF EXISTS "event_bulletins_update" ON event_bulletins;
DROP POLICY IF EXISTS "event_bulletins_delete" ON event_bulletins;
