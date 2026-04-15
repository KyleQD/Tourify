set client_min_messages = warning;

-- Event Task Messages & Secure Uploads
-- Provides actionable task assignments with deep-link routing
-- and encrypted document storage with full audit trails

-- ============================================================
-- EVENT TASK MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS event_task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_name TEXT NOT NULL DEFAULT '',
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  task_action TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  require_completion BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_task_messages_event_id ON event_task_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_event_task_messages_status ON event_task_messages(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_task_messages_recipients ON event_task_messages USING gin(recipient_ids);

-- ============================================================
-- EVENT SECURE UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_secure_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  classification TEXT NOT NULL DEFAULT 'internal' CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
  task_message_id UUID REFERENCES event_task_messages(id) ON DELETE SET NULL,
  access_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_secure_uploads_event_id ON event_secure_uploads(event_id);
CREATE INDEX IF NOT EXISTS idx_event_secure_uploads_uploader ON event_secure_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_event_secure_uploads_hash ON event_secure_uploads(file_hash);

-- ============================================================
-- SECURE AUDIT LOG (for sensitive operations)
-- ============================================================
CREATE TABLE IF NOT EXISTS secure_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events_v2(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secure_audit_log_event_id ON secure_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_secure_audit_log_actor_id ON secure_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_secure_audit_log_action ON secure_audit_log(action, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE event_task_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_secure_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on event_task_messages"
  ON event_task_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on event_secure_uploads"
  ON event_secure_uploads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on secure_audit_log"
  ON secure_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Task messages: participants can read tasks assigned to them or sent by them
CREATE POLICY "Authenticated users read own task messages"
  ON event_task_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR auth.uid() = ANY(recipient_ids)
    OR event_id IN (SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid())
  );

-- Secure uploads: uploaders see their own, admins see all for their events
CREATE POLICY "Authenticated users read own secure uploads"
  ON event_secure_uploads FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR event_id IN (SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid())
  );

-- Audit log: only service role and event owners
CREATE POLICY "Event owners read audit log"
  ON secure_audit_log FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR event_id IN (SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid())
  );
