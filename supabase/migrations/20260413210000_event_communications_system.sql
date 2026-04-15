set client_min_messages = warning;

-- Event Communications System: Bulletins, Group Chats, Documents
-- Provides internal communication capabilities for event teams

-- ============================================================
-- EVENT BULLETINS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'important', 'urgent', 'emergency')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  visible_to TEXT[] NOT NULL DEFAULT ARRAY['all'],
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT FALSE,
  read_by UUID[] NOT NULL DEFAULT '{}',
  acknowledged_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_bulletins_event_id ON event_bulletins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bulletins_pinned ON event_bulletins(event_id, pinned DESC, created_at DESC);

-- ============================================================
-- EVENT GROUP CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'general' CHECK (group_type IN ('general', 'staff', 'crew', 'vendors', 'management', 'custom')),
  member_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_admin_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_group_chats_event_id ON event_group_chats(event_id);

-- ============================================================
-- EVENT GROUP MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS event_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES event_group_chats(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'announcement', 'update')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_group_messages_group_id ON event_group_messages(group_id, created_at);

-- ============================================================
-- EVENT DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events_v2(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general' CHECK (document_type IN ('general', 'runsheet', 'safety', 'contact_list', 'schedule', 'map_notes', 'technical', 'custom')),
  visible_to TEXT[] NOT NULL DEFAULT ARRAY['all'],
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON event_documents(event_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE event_bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on event_bulletins"
  ON event_bulletins FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on event_group_chats"
  ON event_group_chats FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on event_group_messages"
  ON event_group_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on event_documents"
  ON event_documents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users read own event bulletins"
  ON event_bulletins FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR event_id IN (
      SELECT e.id FROM events_v2 e
      WHERE public.is_org_member(auth.uid(), e.org_id)
    )
    OR event_id IN (
      SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users read own event group chats"
  ON event_group_chats FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(member_ids)
    OR event_id IN (
      SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users read group messages"
  ON event_group_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR group_id IN (
      SELECT gc.id FROM event_group_chats gc
      WHERE gc.created_by = auth.uid()
        OR auth.uid() = ANY(gc.member_ids)
        OR gc.event_id IN (SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid())
    )
  );

CREATE POLICY "Authenticated users read own event documents"
  ON event_documents FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR event_id IN (
      SELECT e.id FROM events_v2 e
      WHERE public.is_org_member(auth.uid(), e.org_id)
    )
    OR event_id IN (
      SELECT e.id FROM events_v2 e WHERE e.created_by = auth.uid()
    )
  );
