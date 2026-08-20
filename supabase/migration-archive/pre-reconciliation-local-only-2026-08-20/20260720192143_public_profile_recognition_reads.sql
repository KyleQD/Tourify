-- Additive: allow public read of completed achievements and visible badges
-- so forward-facing profile pages can show recognition without owner-only RLS.
-- Does not drop or modify existing policies/data.

-- Completed achievements are safe to show on public profiles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_achievements'
      AND policyname = 'Public can view completed achievements'
  ) THEN
    CREATE POLICY "Public can view completed achievements"
      ON public.user_achievements
      FOR SELECT
      USING (
        is_completed = true
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = user_achievements.user_id
            AND coalesce(
              (p.account_settings -> 'privacy' ->> 'profile_public')::boolean,
              true
            ) = true
        )
      );
  END IF;
END $$;

-- Visible active badges (is_visible not explicitly false).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_badges'
      AND policyname = 'Public can view visible active badges'
  ) THEN
    CREATE POLICY "Public can view visible active badges"
      ON public.user_badges
      FOR SELECT
      USING (
        is_active = true
        AND coalesce((metadata ->> 'is_visible')::boolean, true) = true
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = user_badges.user_id
            AND coalesce(
              (p.account_settings -> 'privacy' ->> 'profile_public')::boolean,
              true
            ) = true
        )
      );
  END IF;
END $$;
