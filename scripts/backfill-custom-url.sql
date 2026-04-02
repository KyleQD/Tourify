-- Backfill profiles.custom_url for existing users
-- Usage: run this SQL against your Supabase DB (psql or migration runner)

-- Ensure helper functions exist (copied from the custom_url setup)
CREATE OR REPLACE FUNCTION generate_unique_custom_url(base_url TEXT)
RETURNS TEXT AS $$
DECLARE
  counter INTEGER := 0;
  test_url TEXT;
BEGIN
  test_url := base_url;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE custom_url = test_url) LOOP
    counter := counter + 1;
    test_url := base_url || '-' || counter;
  END LOOP;

  RETURN test_url;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_custom_url(profile_id UUID, new_url TEXT)
RETURNS JSONB AS $$
DECLARE
  cleaned_url TEXT;
  final_url TEXT;
BEGIN
  cleaned_url := LOWER(REGEXP_REPLACE(new_url, '[^a-zA-Z0-9_-]', '', 'g'));

  IF LENGTH(cleaned_url) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'URL must be at least 3 characters long');
  END IF;

  IF LENGTH(cleaned_url) > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'URL must be no more than 30 characters long');
  END IF;

  -- Generate unique URL
  final_url := generate_unique_custom_url(cleaned_url);

  UPDATE profiles
  SET custom_url = final_url,
      updated_at = NOW()
  WHERE id = profile_id;

  RETURN jsonb_build_object('success', true, 'custom_url', final_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill rows where custom_url is NULL
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id, username
    FROM profiles
    WHERE custom_url IS NULL
  LOOP
    PERFORM set_custom_url(
      r.id,
      COALESCE(r.username, 'user-' || SUBSTRING(r.id::text, 1, 8))
    );
  END LOOP;
END;
$$;
