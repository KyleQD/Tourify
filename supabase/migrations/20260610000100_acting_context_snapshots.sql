-- Migration: acting_context_snapshots — optional audit trail for mutations.
--
-- Records WHICH acting entity performed a mutation, so attribution can be audited
-- after the fact (e.g. "which venue posted this?", "who reposted as the org?").
-- This is an ACTIVITY log (live-events-ontology.md §15) — append-only.
--
-- Writing a snapshot is best-effort and must never block the underlying mutation.

CREATE TABLE IF NOT EXISTS acting_context_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authenticated user who performed the action
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Acting entity at the time of the mutation
  acting_profile_id   UUID NOT NULL,
  acting_account_type TEXT NOT NULL
                      CHECK (acting_account_type IN (
                        'general', 'artist', 'service', 'venue', 'organization'
                      )),

  -- What happened: a short action key + the affected resource
  action              TEXT NOT NULL,          -- e.g. 'post.create', 'job.create', 'job.repost', 'post.share'
  resource_type       TEXT,                   -- e.g. 'post', 'artist_job'
  resource_id         UUID,

  -- Optional Work Mode assignment in effect
  work_assignment_id  UUID REFERENCES employment_assignments(id) ON DELETE SET NULL,

  -- Free-form context (request id, route, etc.)
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acting_snapshots_user
  ON acting_context_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acting_snapshots_entity
  ON acting_context_snapshots (acting_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acting_snapshots_resource
  ON acting_context_snapshots (resource_type, resource_id);

-- RLS: a user can read their own snapshots; inserts go through service role / API.
ALTER TABLE acting_context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acting_snapshots_read_own"
  ON acting_context_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "acting_snapshots_insert_own"
  ON acting_context_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());
