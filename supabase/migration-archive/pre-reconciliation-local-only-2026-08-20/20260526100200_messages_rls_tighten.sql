-- Defense in depth for direct messages. The /api/messages route already enforces the
-- trust model + viewer block + rate limits, but mobile, the realtime hook, and any
-- future client could write directly to the `messages` table. Tighten RLS so direct
-- inserts respect participation, accepted-request rules, and the viewer role.
set client_min_messages = warning;

-- Helper: is the caller a viewer?
CREATE OR REPLACE FUNCTION public.is_viewer(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
      AND role = 'viewer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_viewer(uuid) TO authenticated;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Read: participants of the parent conversation only.
DROP POLICY IF EXISTS messages_select_participants ON messages;
CREATE POLICY messages_select_participants ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Insert: must be the sender, must be a participant, viewer accounts blocked. For
-- pending requests, only one intro message is allowed and only the original sender
-- may add it (the recipient must accept first via /api/messages/{id}/accept).
DROP POLICY IF EXISTS messages_insert_with_trust_model ON messages;
CREATE POLICY messages_insert_with_trust_model ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND NOT public.is_viewer(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
      AND (
        COALESCE(c.trust_tier, 'open') <> 'request'
        OR c.accepted_at IS NOT NULL
        OR NOT EXISTS (
          SELECT 1 FROM messages prior
          WHERE prior.conversation_id = c.id
        )
      )
  )
);

-- Update: senders can update their own row (e.g. mark read receipts on the join
-- table flows that update read state). Restrict to participants.
DROP POLICY IF EXISTS messages_update_participants ON messages;
CREATE POLICY messages_update_participants ON messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Lock down direct writes to rate-limit table; only service role mutates it.
ALTER TABLE dm_request_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_request_rate_limits_owner_read ON dm_request_rate_limits;
CREATE POLICY dm_request_rate_limits_owner_read ON dm_request_rate_limits
FOR SELECT USING (sender_id = auth.uid());
