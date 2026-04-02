-- Artist music pinning support
-- Adds `artist_music.is_pinned` and indexes to support pinned-first ordering.

ALTER TABLE artist_music
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Helps pinned-first feeds and profile track lists.
CREATE INDEX IF NOT EXISTS idx_artist_music_user_pinned_created_at
  ON artist_music (user_id, is_pinned DESC, created_at DESC);

-- Helps “featured” fallbacks while still prioritizing pinned tracks.
CREATE INDEX IF NOT EXISTS idx_artist_music_user_featured_pinned_created_at
  ON artist_music (user_id, is_featured DESC, is_pinned DESC, created_at DESC);

-- Faster public queries when only public tracks are selected.
CREATE INDEX IF NOT EXISTS idx_artist_music_public_pinned_created_at
  ON artist_music (user_id, is_pinned DESC, created_at DESC)
  WHERE is_public = true;

