set client_min_messages = warning;

CREATE OR REPLACE FUNCTION notify_dm_recipient()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_row conversations%ROWTYPE;
  recipient_id uuid;
  notification_type text := 'message';
BEGIN
  SELECT * INTO conversation_row
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF conversation_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF conversation_row.participant_1 = NEW.sender_id THEN
    recipient_id := conversation_row.participant_2;
  ELSE
    recipient_id := conversation_row.participant_1;
  END IF;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  IF COALESCE(conversation_row.trust_tier, 'open') = 'request' THEN
    notification_type := 'message_request';
  END IF;

  IF should_send_notification(recipient_id, notification_type) THEN
    INSERT INTO notifications (
      user_id,
      related_user_id,
      type,
      title,
      content,
      metadata,
      created_at
    )
    VALUES (
      recipient_id,
      NEW.sender_id,
      notification_type,
      CASE
        WHEN notification_type = 'message_request' THEN 'New message request'
        ELSE 'New message'
      END,
      LEFT(COALESCE(NEW.content, ''), 140),
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dm_notify ON messages;
CREATE TRIGGER trg_dm_notify
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.message_type = 'text')
EXECUTE FUNCTION notify_dm_recipient();
