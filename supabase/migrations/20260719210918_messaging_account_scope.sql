-- Account-scoped DM inboxes: tag each conversation side with the account
-- (general / artist / venue / organization / …) that owns that inbox.
-- Participants remain auth user ids; profile_id + account_type select which inbox.

set client_min_messages = warning;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS participant_1_profile_id uuid,
  ADD COLUMN IF NOT EXISTS participant_1_account_type text,
  ADD COLUMN IF NOT EXISTS participant_2_profile_id uuid,
  ADD COLUMN IF NOT EXISTS participant_2_account_type text;

-- Backfill legacy rows into the personal (general) inbox for both sides.
UPDATE conversations
SET
  participant_1_profile_id = COALESCE(participant_1_profile_id, participant_1),
  participant_1_account_type = COALESCE(participant_1_account_type, 'general'),
  participant_2_profile_id = COALESCE(participant_2_profile_id, participant_2),
  participant_2_account_type = COALESCE(participant_2_account_type, 'general')
WHERE participant_1_profile_id IS NULL
   OR participant_1_account_type IS NULL
   OR participant_2_profile_id IS NULL
   OR participant_2_account_type IS NULL;

ALTER TABLE conversations
  ALTER COLUMN participant_1_profile_id SET DEFAULT NULL,
  ALTER COLUMN participant_2_profile_id SET DEFAULT NULL,
  ALTER COLUMN participant_1_account_type SET DEFAULT 'general',
  ALTER COLUMN participant_2_account_type SET DEFAULT 'general';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_p1_account_type_check'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_p1_account_type_check
      CHECK (
        participant_1_account_type IS NULL
        OR participant_1_account_type IN (
          'general', 'artist', 'service', 'venue', 'organization', 'admin', 'staff'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_p2_account_type_check'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_p2_account_type_check
      CHECK (
        participant_2_account_type IS NULL
        OR participant_2_account_type IN (
          'general', 'artist', 'service', 'venue', 'organization', 'admin', 'staff'
        )
      );
  END IF;
END
$$;

-- Replace user-pair uniqueness with account-aware uniqueness.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_participant_2_key;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_participants_account_uidx
ON conversations (
  participant_1,
  participant_2,
  COALESCE(participant_1_profile_id, participant_1),
  COALESCE(participant_2_profile_id, participant_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1_account_inbox
ON conversations (participant_1, participant_1_profile_id, participant_1_account_type);

CREATE INDEX IF NOT EXISTS idx_conversations_p2_account_inbox
ON conversations (participant_2, participant_2_profile_id, participant_2_account_type);

-- Account-aware find-or-create (6-arg). Replaces body of 2-arg wrapper below.
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id uuid,
  user2_id uuid,
  user1_profile_id uuid,
  user1_account_type text,
  user2_profile_id uuid,
  user2_account_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id uuid;
  v_p1_profile uuid := COALESCE(user1_profile_id, user1_id);
  v_p2_profile uuid := COALESCE(user2_profile_id, user2_id);
  v_p1_type text := COALESCE(NULLIF(trim(user1_account_type), ''), 'general');
  v_p2_type text := COALESCE(NULLIF(trim(user2_account_type), ''), 'general');
BEGIN
  IF user1_id IS NULL OR user2_id IS NULL OR user1_id = user2_id THEN
    RAISE EXCEPTION 'invalid_participants';
  END IF;

  SELECT id INTO conversation_id
  FROM conversations
  WHERE (
      participant_1 = user1_id
      AND participant_2 = user2_id
      AND COALESCE(participant_1_profile_id, participant_1) = v_p1_profile
      AND COALESCE(participant_2_profile_id, participant_2) = v_p2_profile
    )
    OR (
      participant_1 = user2_id
      AND participant_2 = user1_id
      AND COALESCE(participant_1_profile_id, participant_1) = v_p2_profile
      AND COALESCE(participant_2_profile_id, participant_2) = v_p1_profile
    )
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations (
      participant_1,
      participant_2,
      participant_1_profile_id,
      participant_1_account_type,
      participant_2_profile_id,
      participant_2_account_type
    )
    VALUES (
      user1_id,
      user2_id,
      v_p1_profile,
      v_p1_type,
      v_p2_profile,
      v_p2_type
    )
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_or_create_conversation(
    user1_id,
    user2_id,
    user1_id,
    'general'::text,
    user2_id,
    'general'::text
  );
$$;

GRANT EXECUTE ON FUNCTION get_or_create_conversation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(uuid, uuid, uuid, text, uuid, text) TO authenticated, service_role;

-- Replace 3-arg send_dm_request with account-aware overload (defaults preserve call sites).
DROP FUNCTION IF EXISTS public.send_dm_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.send_dm_request(
  p_sender uuid,
  p_recipient uuid,
  p_content text,
  p_sender_profile_id uuid DEFAULT NULL,
  p_sender_account_type text DEFAULT 'general',
  p_recipient_profile_id uuid DEFAULT NULL,
  p_recipient_account_type text DEFAULT 'general'
)
RETURNS TABLE (
  conversation_id uuid,
  message_id uuid,
  trust_tier text,
  context_type text,
  context_id uuid,
  created_new boolean,
  message_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context_row record;
  v_conversation_id uuid;
  v_message_id uuid;
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - interval '24 hours';
  v_rate record;
  v_created_new boolean := false;
  v_message_created_at timestamptz;
  v_sender_profile uuid := COALESCE(p_sender_profile_id, p_sender);
  v_recipient_profile uuid := COALESCE(p_recipient_profile_id, p_recipient);
  v_sender_type text := COALESCE(NULLIF(trim(p_sender_account_type), ''), 'general');
  v_recipient_type text := COALESCE(NULLIF(trim(p_recipient_account_type), ''), 'general');
BEGIN
  IF p_sender IS NULL OR p_recipient IS NULL OR p_sender = p_recipient THEN
    RAISE EXCEPTION 'invalid_participants';
  END IF;

  IF coalesce(trim(p_content), '') = '' THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_sender AND role = 'viewer') THEN
    RAISE EXCEPTION 'viewer_cannot_send';
  END IF;

  SELECT * INTO v_context_row
  FROM resolve_message_context(p_sender, p_recipient);

  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (
      participant_1 = p_sender
      AND participant_2 = p_recipient
      AND COALESCE(participant_1_profile_id, participant_1) = v_sender_profile
      AND COALESCE(participant_2_profile_id, participant_2) = v_recipient_profile
    )
    OR (
      participant_1 = p_recipient
      AND participant_2 = p_sender
      AND COALESCE(participant_1_profile_id, participant_1) = v_recipient_profile
      AND COALESCE(participant_2_profile_id, participant_2) = v_sender_profile
    )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    v_created_new := true;

    IF v_context_row.tier = 'request' THEN
      SELECT * INTO v_rate
      FROM dm_request_rate_limits
      WHERE sender_id = p_sender AND recipient_id = p_recipient
      FOR UPDATE;

      IF FOUND THEN
        IF v_rate.window_started_at < v_window_start THEN
          UPDATE dm_request_rate_limits
            SET request_count = 1,
                window_started_at = v_now,
                updated_at = v_now
            WHERE sender_id = p_sender AND recipient_id = p_recipient;
        ELSIF v_rate.request_count >= 3 THEN
          RAISE EXCEPTION 'rate_limited';
        ELSE
          UPDATE dm_request_rate_limits
            SET request_count = v_rate.request_count + 1,
                updated_at = v_now
            WHERE sender_id = p_sender AND recipient_id = p_recipient;
        END IF;
      ELSE
        INSERT INTO dm_request_rate_limits(
          sender_id, recipient_id, request_count, window_started_at, updated_at
        )
        VALUES (p_sender, p_recipient, 1, v_now, v_now);
      END IF;
    END IF;

    INSERT INTO conversations (
      participant_1,
      participant_2,
      participant_1_profile_id,
      participant_1_account_type,
      participant_2_profile_id,
      participant_2_account_type,
      trust_tier,
      context_type,
      context_id,
      accepted_at,
      accepted_by,
      created_at,
      updated_at
    )
    VALUES (
      p_sender,
      p_recipient,
      v_sender_profile,
      v_sender_type,
      v_recipient_profile,
      v_recipient_type,
      v_context_row.tier,
      v_context_row.context_type,
      v_context_row.context_id,
      CASE WHEN v_context_row.tier = 'request' THEN NULL ELSE v_now END,
      CASE WHEN v_context_row.tier = 'request' THEN NULL ELSE p_sender END,
      v_now,
      v_now
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  IF v_context_row.tier = 'request' AND EXISTS (
    SELECT 1 FROM messages WHERE messages.conversation_id = v_conversation_id
  ) THEN
    IF EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = v_conversation_id
        AND m.sender_id = p_sender
    ) THEN
      RAISE EXCEPTION 'request_pending_accept';
    END IF;

    IF (SELECT accepted_at FROM conversations WHERE id = v_conversation_id) IS NULL THEN
      RAISE EXCEPTION 'request_must_accept_first';
    END IF;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content)
  VALUES (v_conversation_id, p_sender, p_content)
  RETURNING id, created_at INTO v_message_id, v_message_created_at;

  UPDATE conversations
    SET last_message_id = v_message_id,
        updated_at = v_message_created_at
    WHERE id = v_conversation_id;

  RETURN QUERY
  SELECT v_conversation_id,
         v_message_id,
         v_context_row.tier,
         v_context_row.context_type,
         v_context_row.context_id,
         v_created_new,
         v_message_created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_dm_request(uuid, uuid, text, uuid, text, uuid, text)
  TO authenticated, service_role;
