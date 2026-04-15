set client_min_messages = warning;

-- =============================================================================
-- Fix get_venue_image_url helper function
--
-- The original implementation in storage_setup.sql contained:
--   SELECT ref FROM storage.buckets WHERE id = 'venue-media'
-- Supabase's storage.buckets table has no `ref` column, so this always
-- errors at runtime.
--
-- The corrected version uses the `app.supabase_url` custom GUC, which can be
-- set per-session or via Supabase's vault/config.  If the setting is absent
-- the function falls back to returning the relative path so the application
-- layer can prepend the base URL.
-- =============================================================================

-- DROP the old signature so CREATE OR REPLACE doesn't fail on renamed params.
DROP FUNCTION IF EXISTS get_venue_image_url(uuid, text);

CREATE OR REPLACE FUNCTION get_venue_image_url(
  p_user_id   uuid,
  p_image_name text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  rel_path text;
BEGIN
  rel_path := 'venue-media/' || p_user_id::text || '/' || p_image_name;

  -- app.supabase_url should be set to e.g. 'https://<ref>.supabase.co'
  -- via the Supabase project's custom database settings or a SET command.
  base_url := nullif(trim(current_setting('app.supabase_url', true)), '');

  IF base_url IS NOT NULL THEN
    RETURN base_url || '/storage/v1/object/public/' || rel_path;
  END IF;

  -- Fallback: return a relative path the application can prefix with its own
  -- NEXT_PUBLIC_SUPABASE_URL value.
  RETURN '/storage/v1/object/public/' || rel_path;
END;
$$;

COMMENT ON FUNCTION get_venue_image_url(uuid, text) IS
  'Returns the public URL for a venue image. Set the app.supabase_url GUC to your '
  'project URL (e.g. https://<ref>.supabase.co) to get absolute URLs. Without it '
  'a root-relative path is returned.';
