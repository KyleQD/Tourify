-- Migration: Add / fix acting-entity columns on the posts table.
--
-- posted_as_profile_id  : UUID of the entity doing the post (artist/venue/org/general)
-- posted_as_type        : Canonical ProfileType string
--
-- Idempotent — safe to run against databases that already have the partial
-- version from the archived migration.

-- 1. Add columns if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN posted_as_profile_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'posted_as_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN posted_as_type TEXT DEFAULT 'general';
  END IF;
END $$;

-- 2. Widen / replace the CHECK on posted_as_type (old constraint may not exist).
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_posted_as_account_type_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_posted_as_type_check;

ALTER TABLE posts
  ADD CONSTRAINT posts_posted_as_type_check
  CHECK (posted_as_type IN (
    'general', 'artist', 'service', 'venue', 'organization', 'admin', 'staff'
  ));

-- 3. Rename the old column if the schema already has posted_as_account_type
--    (from the archived migration) so we normalise to posted_as_type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'posted_as_account_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'posted_as_type'
  ) THEN
    ALTER TABLE posts RENAME COLUMN posted_as_account_type TO posted_as_type;
  END IF;
END $$;

-- 4. Back-fill: map legacy 'primary' value to 'general', admin → organization.
UPDATE posts SET posted_as_type = 'general'       WHERE posted_as_type = 'primary';
UPDATE posts SET posted_as_type = 'organization'  WHERE posted_as_type = 'admin';

-- 5. Back-fill rows that have no acting-entity stamp yet.
UPDATE posts
SET
  posted_as_profile_id = user_id,
  posted_as_type = 'general'
WHERE posted_as_profile_id IS NULL OR posted_as_type IS NULL;

-- 6. Also add posted_by_profile_id + posted_by_type to artist_jobs if not present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artist_jobs' AND column_name = 'posted_by_profile_id'
  ) THEN
    ALTER TABLE artist_jobs ADD COLUMN posted_by_profile_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artist_jobs' AND column_name = 'posted_by_type'
  ) THEN
    ALTER TABLE artist_jobs ADD COLUMN posted_by_type TEXT DEFAULT 'artist';
  END IF;
END $$;

-- Back-fill artist_jobs
UPDATE artist_jobs
SET
  posted_by_profile_id = posted_by,
  posted_by_type = 'artist'
WHERE posted_by_profile_id IS NULL;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_posts_acting_entity
  ON posts (posted_as_profile_id, posted_as_type);

CREATE INDEX IF NOT EXISTS idx_artist_jobs_posted_by_profile
  ON artist_jobs (posted_by_profile_id, posted_by_type);
