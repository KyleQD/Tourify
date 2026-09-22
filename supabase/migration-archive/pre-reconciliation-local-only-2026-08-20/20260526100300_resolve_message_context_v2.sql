-- Updates `resolve_message_context` to honor the `allow_applicant_messages` flag on
-- the job posting template and to recognize hiring-manager → applicant direction in
-- both ways. Previously the RPC only matched on `job_applications.reviewed_by`, which
-- is null for unreviewed applications.
set client_min_messages = warning;

CREATE OR REPLACE FUNCTION resolve_message_context(sender uuid, recipient uuid)
RETURNS TABLE(tier text, context_type text, context_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  shared_event_id uuid;
  shared_job_application_id uuid;
BEGIN
  -- Mutual follow opens an unrestricted DM channel.
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

  -- Same event team (any role).
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

  -- Job application context. Either (a) the recipient already reviewed the sender's
  -- application, OR (b) the application's job posting opts in via
  -- `allow_applicant_messages` AND the recipient is the posting/template owner.
  SELECT ja.id
  INTO shared_job_application_id
  FROM job_applications ja
  WHERE (
    (ja.applicant_id = sender AND ja.reviewed_by = recipient)
    OR (ja.applicant_id = recipient AND ja.reviewed_by = sender)
  )
  ORDER BY ja.applied_at DESC NULLS LAST, ja.created_at DESC NULLS LAST
  LIMIT 1;

  IF shared_job_application_id IS NOT NULL THEN
    RETURN QUERY SELECT 'context'::text, 'job_application'::text, shared_job_application_id;
    RETURN;
  END IF;

  SELECT ja.id
  INTO shared_job_application_id
  FROM job_applications ja
  JOIN job_posting_templates jpt
    ON jpt.id = ja.job_posting_id
  WHERE jpt.allow_applicant_messages = true
    AND (
      (ja.applicant_id = sender AND jpt.created_by = recipient)
      OR (ja.applicant_id = recipient AND jpt.created_by = sender)
    )
  ORDER BY ja.applied_at DESC NULLS LAST, ja.created_at DESC NULLS LAST
  LIMIT 1;

  IF shared_job_application_id IS NOT NULL THEN
    RETURN QUERY SELECT 'context'::text, 'job_application'::text, shared_job_application_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'request'::text, NULL::text, NULL::uuid;
END;
$$;
