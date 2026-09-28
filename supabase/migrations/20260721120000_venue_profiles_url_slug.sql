-- Add canonical public handle to venue_profiles (mirrors artist_profiles.url_slug).
-- venue_name is the display name and may change; url_slug is stable after creation.
--
-- Also fixes refresh_account_display_info() which referenced non-existent columns
-- `name` and `logo_url` on venue_profiles (correct columns: venue_name, avatar_url).

-- Step 1: Add the column.
ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS url_slug TEXT;

-- Step 2: Fix the broken trigger function so the venue_profiles branch uses the
--         correct column names. We replace only the venue_profiles WHEN branch;
--         all other branches are preserved verbatim.
CREATE OR REPLACE FUNCTION public.refresh_account_display_info(account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  account_record RECORD;
  new_display_name TEXT;
  new_username TEXT;
  new_avatar_url TEXT;
  new_is_verified BOOLEAN;
  has_profile_image_url BOOLEAN;
  has_is_verified BOOLEAN;
BEGIN
  -- Get account record
  SELECT * INTO account_record FROM accounts WHERE id = account_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Refresh from source table based on account type
  CASE account_record.profile_table
    WHEN 'artist_profiles' THEN
      -- Check if columns exist dynamically
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'artist_profiles' AND column_name = 'profile_image_url'
      ) INTO has_profile_image_url;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'artist_profiles' AND column_name = 'is_verified'
      ) INTO has_is_verified;

      -- Use dynamic query based on column existence
      IF has_profile_image_url AND has_is_verified THEN
        SELECT
          COALESCE(artist_name, 'Artist'),
          LOWER(REGEXP_REPLACE(COALESCE(artist_name, 'artist'), '[^a-zA-Z0-9]', '', 'g')),
          profile_image_url,
          COALESCE(is_verified, false)
        INTO new_display_name, new_username, new_avatar_url, new_is_verified
        FROM artist_profiles
        WHERE id = account_record.profile_id;
      ELSIF has_profile_image_url THEN
        SELECT
          COALESCE(artist_name, 'Artist'),
          LOWER(REGEXP_REPLACE(COALESCE(artist_name, 'artist'), '[^a-zA-Z0-9]', '', 'g')),
          profile_image_url,
          false
        INTO new_display_name, new_username, new_avatar_url, new_is_verified
        FROM artist_profiles
        WHERE id = account_record.profile_id;
      ELSIF has_is_verified THEN
        SELECT
          COALESCE(artist_name, 'Artist'),
          LOWER(REGEXP_REPLACE(COALESCE(artist_name, 'artist'), '[^a-zA-Z0-9]', '', 'g')),
          NULL,
          COALESCE(is_verified, false)
        INTO new_display_name, new_username, new_avatar_url, new_is_verified
        FROM artist_profiles
        WHERE id = account_record.profile_id;
      ELSE
        SELECT
          COALESCE(artist_name, 'Artist'),
          LOWER(REGEXP_REPLACE(COALESCE(artist_name, 'artist'), '[^a-zA-Z0-9]', '', 'g')),
          NULL,
          false
        INTO new_display_name, new_username, new_avatar_url, new_is_verified
        FROM artist_profiles
        WHERE id = account_record.profile_id;
      END IF;

    WHEN 'venue_profiles' THEN
      -- FIXED: use venue_name (not name) and avatar_url (not logo_url)
      SELECT
        COALESCE(venue_name, 'Venue'),
        LOWER(REGEXP_REPLACE(COALESCE(venue_name, 'venue'), '[^a-zA-Z0-9]', '', 'g')),
        avatar_url,
        false
      INTO new_display_name, new_username, new_avatar_url, new_is_verified
      FROM venue_profiles
      WHERE id = account_record.profile_id;

    WHEN 'business_profiles' THEN
      SELECT
        COALESCE(name, 'Business'),
        LOWER(REGEXP_REPLACE(COALESCE(name, 'business'), '[^a-zA-Z0-9]', '', 'g')),
        logo_url,
        COALESCE(is_verified, false)
      INTO new_display_name, new_username, new_avatar_url, new_is_verified
      FROM business_profiles
      WHERE id = account_record.profile_id;

    WHEN 'profiles' THEN
      SELECT
        COALESCE(full_name, 'User'),
        COALESCE(username, LOWER(REGEXP_REPLACE(COALESCE(full_name, 'user'), '[^a-zA-Z0-9]', '', 'g'))),
        avatar_url,
        COALESCE(is_verified, false)
      INTO new_display_name, new_username, new_avatar_url, new_is_verified
      FROM profiles
      WHERE id = account_record.profile_id;

    ELSE
      -- Unknown profile table, keep existing values
      RETURN FALSE;
  END CASE;

  -- Update account with refreshed info
  UPDATE accounts SET
    display_name = COALESCE(new_display_name, display_name),
    username     = COALESCE(new_username, username),
    avatar_url   = new_avatar_url,
    is_verified  = COALESCE(new_is_verified, is_verified),
    updated_at   = NOW()
  WHERE id = account_id;

  RETURN TRUE;
END;
$function$;

-- Step 3: Backfill url_slug on existing rows.
--         Temporarily disable the trigger so the UPDATE doesn't re-fire the
--         (now-fixed) function unnecessarily during the bulk backfill.
ALTER TABLE public.venue_profiles DISABLE TRIGGER USER;

DO $$
DECLARE
  rec       RECORD;
  candidate TEXT;
  base_slug TEXT;
  suffix    INT;
BEGIN
  FOR rec IN
    SELECT id, venue_name
    FROM public.venue_profiles
    WHERE url_slug IS NULL OR btrim(url_slug) = ''
    ORDER BY created_at NULLS LAST, id
  LOOP
    base_slug := lower(regexp_replace(
      coalesce(nullif(btrim(rec.venue_name), ''), 'venue'),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    IF base_slug = '' THEN
      base_slug := 'venue-' || substr(replace(rec.id::text, '-', ''), 1, 8);
    END IF;

    candidate := base_slug;
    suffix    := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.venue_profiles other
      WHERE other.url_slug = candidate AND other.id <> rec.id
    ) LOOP
      suffix    := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    END LOOP;

    UPDATE public.venue_profiles SET url_slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.venue_profiles ENABLE TRIGGER USER;

-- Step 4: Unique partial index (same pattern as idx_artist_profiles_url_slug).
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_profiles_url_slug
  ON public.venue_profiles (url_slug)
  WHERE url_slug IS NOT NULL;
