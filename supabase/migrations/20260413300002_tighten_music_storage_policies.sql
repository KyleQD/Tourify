set client_min_messages = warning;

-- Tighten artist-music storage bucket policies
-- Ensure only the owner can directly access objects via RLS.
-- All public access goes through the application's signed URL endpoints.

-- Drop any overly permissive policies that may have been applied manually.
-- [CP-059 replay guard] each storage-owned statement runs in its own
-- subtransaction so a replay role outside the storage owning role set warns
-- (sqlstate/sqlerrm) instead of aborting the whole chain with SQLSTATE 42501.
do $music_storage_drop_public_read$
begin
  drop policy if exists "Users can view public music files" on storage.objects;
  drop policy if exists "Anyone can view artist music" on storage.objects;
  drop policy if exists "Authenticated users can view artist music" on storage.objects;
exception when others then
  raise warning
    'Skipping public-read policy drops on %.%: % %',
    'storage', 'objects', sqlstate, sqlerrm;
end;
$music_storage_drop_public_read$;

-- Ensure the bucket is private
do $music_storage_bucket_private$
begin
  update storage.buckets
  set public = false
  where id = 'artist-music';
exception when others then
  raise warning
    'Skipping artist-music bucket visibility update on %.%: % %',
    'storage', 'buckets', sqlstate, sqlerrm;
end;
$music_storage_bucket_private$;

-- Owner-only SELECT: users can only read their own uploaded files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can view own music files'
  ) THEN
    -- [CP-059 replay guard] attempt in its own subtransaction; the server decides.
    BEGIN
      CREATE POLICY "Users can view own music files" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'artist-music' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING
        'Skipping policy Users can view own music files on %.%: % %',
        'storage', 'objects', SQLSTATE, SQLERRM;
    END;
  END IF;
END $$;

-- Owner-only INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can upload own music files'
  ) THEN
    -- [CP-059 replay guard] attempt in its own subtransaction; the server decides.
    BEGIN
      CREATE POLICY "Users can upload own music files" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'artist-music' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING
        'Skipping policy Users can upload own music files on %.%: % %',
        'storage', 'objects', SQLSTATE, SQLERRM;
    END;
  END IF;
END $$;

-- Owner-only DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can delete own music files'
  ) THEN
    -- [CP-059 replay guard] attempt in its own subtransaction; the server decides.
    BEGIN
      CREATE POLICY "Users can delete own music files" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'artist-music' AND
          auth.uid()::text = (storage.foldername(name))[1]
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING
        'Skipping policy Users can delete own music files on %.%: % %',
        'storage', 'objects', SQLSTATE, SQLERRM;
    END;
  END IF;
END $$;

-- Note: do not COMMENT ON storage.objects here; Supabase owns that table and the
-- migration role typically lacks ownership (42501 on remote push).
