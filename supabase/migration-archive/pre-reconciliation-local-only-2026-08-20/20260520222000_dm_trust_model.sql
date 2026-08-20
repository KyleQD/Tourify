set client_min_messages = warning;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS trust_tier text NOT NULL DEFAULT 'open';

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS context_type text;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS context_id uuid;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS accepted_by uuid references auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_trust_tier_check'
  ) THEN
    ALTER TABLE conversations
    ADD CONSTRAINT conversations_trust_tier_check
    CHECK (trust_tier IN ('open', 'request', 'context'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_conversations_participant_1_tier
ON conversations(participant_1, trust_tier);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_2_tier
ON conversations(participant_2, trust_tier);

CREATE TABLE IF NOT EXISTS dm_request_rate_limits (
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sender_id, recipient_id)
);

CREATE OR REPLACE FUNCTION resolve_message_context(sender uuid, recipient uuid)
RETURNS TABLE(tier text, context_type text, context_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  shared_event_id uuid;
  shared_job_application_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM follows f1
    JOIN follows f2
      ON f2.follower_id = recipient
     AND f2.following_id = sender
    WHERE f1.follower_id = sender
      AND f1.following_id = recipient
  ) THEN
    RETURN QUERY SELECT 'open'::text, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT ep1.event_id
  INTO shared_event_id
  FROM event_participants ep1
  JOIN event_participants ep2
    ON ep1.event_id = ep2.event_id
  WHERE ep1.participant_type = 'Individual'
    AND ep2.participant_type = 'Individual'
    AND ep1.participant_id = sender
    AND ep2.participant_id = recipient
  LIMIT 1;

  IF shared_event_id IS NOT NULL THEN
    RETURN QUERY SELECT 'context'::text, 'event_team'::text, shared_event_id;
    RETURN;
  END IF;

  SELECT ja.id
  INTO shared_job_application_id
  FROM job_applications ja
  WHERE (ja.applicant_id = sender AND ja.reviewed_by = recipient)
     OR (ja.applicant_id = recipient AND ja.reviewed_by = sender)
  ORDER BY ja.applied_at DESC NULLS LAST, ja.created_at DESC NULLS LAST
  LIMIT 1;

  IF shared_job_application_id IS NOT NULL THEN
    RETURN QUERY SELECT 'context'::text, 'job_application'::text, shared_job_application_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'request'::text, NULL::text, NULL::uuid;
END;
$$;
