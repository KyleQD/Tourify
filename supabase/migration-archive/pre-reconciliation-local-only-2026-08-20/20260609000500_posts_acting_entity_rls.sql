-- Strengthen posts INSERT policy to enforce entity ownership on posted_as_profile_id.
-- This is defense-in-depth: API routes use resolveActingContext to verify ownership before
-- writing, but the RLS policy prevents any direct client writes with spoofed entity IDs.

-- Drop the existing simple insert policy
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;

-- Replacement: allow insert only when:
--   1. user_id matches the authenticated user, AND
--   2. posted_as_profile_id is NULL, OR
--      posted_as_profile_id == auth.uid() (general / personal post), OR
--      the profile belongs to one of the user's owned entities
CREATE POLICY "Users can create posts attributed to owned entities"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      posted_as_profile_id IS NULL
      OR posted_as_profile_id = auth.uid()
      -- Artist / service profile owned by the user
      OR EXISTS (
        SELECT 1 FROM artist_profiles
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
      -- Venue profile owned by the user
      OR EXISTS (
        SELECT 1 FROM venue_profiles
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
      -- Organizer / organization account owned by the user
      OR EXISTS (
        SELECT 1 FROM organizer_accounts
        WHERE id = posted_as_profile_id
          AND user_id = auth.uid()
      )
      -- Delegated access via account_relationships
      OR EXISTS (
        SELECT 1 FROM account_relationships
        WHERE owned_profile_id = posted_as_profile_id
          AND owner_user_id = auth.uid()
      )
    )
  );

-- Keep existing update / delete policies unchanged (they check user_id already).
