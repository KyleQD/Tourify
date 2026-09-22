-- Additive performance indexes for hiring audit list/filter patterns.
-- Safe: CREATE INDEX only. Does not reset DB, drop tables, or alter RLS.
-- Apply only after review (plan Phase 3 ask-before for production).

CREATE INDEX IF NOT EXISTS idx_hiring_audit_events_employer_created
  ON public.hiring_audit_events (employer_entity_type, employer_entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hiring_audit_events_application_action_created
  ON public.hiring_audit_events (application_id, action, created_at DESC);
