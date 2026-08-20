-- Canonical public handle for artist personas (mirrors venue_profiles.url_slug).
-- artist_name remains display-only and mutable; url_slug is stable after create.

ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS url_slug TEXT;

-- Backfill missing slugs.
-- Prefer profiles.username when it is unused as another artist's slug,
-- otherwise slugify(artist_name) with numeric suffixes on collision.
DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  base_slug TEXT;
  suffix INT;
BEGIN
  FOR rec IN
    SELECT
      ap.id,
      ap.artist_name,
      ap.user_id,
      p.username AS profile_username
    FROM public.artist_profiles ap
    LEFT JOIN public.profiles p ON p.id = ap.user_id
    WHERE ap.url_slug IS NULL OR btrim(ap.url_slug) = ''
    ORDER BY ap.created_at NULLS LAST, ap.id
  LOOP
    candidate := NULL;

    IF rec.profile_username IS NOT NULL
       AND btrim(rec.profile_username) <> ''
       AND NOT EXISTS (
         SELECT 1
         FROM public.artist_profiles other
         WHERE other.url_slug = lower(btrim(rec.profile_username))
           AND other.id <> rec.id
       )
    THEN
      candidate := lower(btrim(rec.profile_username));
    END IF;

    IF candidate IS NULL THEN
      base_slug := lower(regexp_replace(coalesce(nullif(btrim(rec.artist_name), ''), 'artist'), '[^a-z0-9]+', '-', 'g'));
      base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
      IF base_slug = '' THEN
        base_slug := 'artist-' || substr(replace(rec.id::text, '-', ''), 1, 8);
      END IF;

      candidate := base_slug;
      suffix := 0;
      WHILE EXISTS (
        SELECT 1
        FROM public.artist_profiles other
        WHERE other.url_slug = candidate
          AND other.id <> rec.id
      ) LOOP
        suffix := suffix + 1;
        candidate := base_slug || '-' || suffix::text;
      END LOOP;
    END IF;

    UPDATE public.artist_profiles
    SET url_slug = candidate
    WHERE id = rec.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_profiles_url_slug
  ON public.artist_profiles (url_slug)
  WHERE url_slug IS NOT NULL;
