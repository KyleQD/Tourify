-- Race-safe DM creation. Combines:
--   1. resolve_message_context() — decides tier (open/context/request)
--   2. rate limit check & increment for tier='request'
--   3. find-or-create conversation
--   4. insert message
--   5. update conversations.last_message_id + updated_at
-- The Next.js /api/messages route can call this RPC instead of issuing 4 separate
-- service-role statements that can race with each other or with the trigger that
-- updates last_message_id.
set client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.send_dm_request(
  p_sender uuid,
  p_recipient uuid,
  p_content text
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
BEGIN
  IF p_sender IS NULL OR p_recipient IS NULL OR p_sender = p_recipient THEN
    RAISE EXCEPTION 'invalid_participants';
  END IF;

  IF coalesce(trim(p_content), '') = '' THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  -- Block viewer accounts (defense in depth; messages RLS also enforces this).
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_sender AND role = 'viewer') THEN
    RAISE EXCEPTION 'viewer_cannot_send';
  END IF;

  SELECT * INTO v_context_row
  FROM resolve_message_context(p_sender, p_recipient);

  -- Look up the existing direct conversation between the two users.
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (participant_1 = p_sender AND participant_2 = p_recipient)
     OR (participant_1 = p_recipient AND participant_2 = p_sender)
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    v_created_new := true;

    IF v_context_row.tier = 'request' THEN
      -- Enforce rate limit on creation of new request conversations.
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

  -- For pending requests we still only allow ONE intro message and only from the
  -- original sender. Mirrors the RLS rule shipped in 20260526100200.
  IF v_context_row.tier = 'request' AND EXISTS (
    SELECT 1 FROM messages WHERE messages.conversation_id = v_conversation_id
  ) THEN
    -- Already has an intro; refuse from the same sender, defer accept flow.
    IF EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = v_conversation_id
        AND m.sender_id = p_sender
    ) THEN
      RAISE EXCEPTION 'request_pending_accept';
    END IF;

    -- The other party hasn't accepted yet; recipient must use the accept endpoint
    -- before replying.
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

GRANT EXECUTE ON FUNCTION public.send_dm_request(uuid, uuid, text) TO authenticated, service_role;
