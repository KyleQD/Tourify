-- Tighten account_relationships INSERT policy: owner must own the linked profile
-- Prevents privilege escalation via link_existing without profile ownership

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'account_relationships'
  ) THEN
    DROP POLICY IF EXISTS account_relationships_insert_own ON account_relationships;
    DROP POLICY IF EXISTS "Users can insert own account relationships" ON account_relationships;

    CREATE POLICY account_relationships_insert_own ON account_relationships
      FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_user_id = auth.uid()
        AND (
          owned_profile_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM artist_profiles ap
            WHERE ap.id = owned_profile_id AND ap.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM venue_profiles vp
            WHERE vp.id = owned_profile_id AND vp.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM organizer_accounts oa
            WHERE oa.id = owned_profile_id AND oa.user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;
