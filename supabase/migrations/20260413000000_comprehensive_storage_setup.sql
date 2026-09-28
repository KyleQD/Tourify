set client_min_messages = warning;
-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_0$
  begin


    -- =============================================================================
    -- Comprehensive Storage Buckets Migration
    -- Creates all application storage buckets that were previously only defined in
    -- ad-hoc SQL scripts and not tracked in the migration chain. Safe to run on
    -- databases where some buckets already exist (ON CONFLICT DO NOTHING).
    -- All policies use DROP POLICY IF EXISTS to prevent duplicate-policy errors
    -- on replay or partial application.
    -- =============================================================================

    -- ---------------------------------------------------------------------------
    -- BUCKETS
    -- ---------------------------------------------------------------------------

    -- avatars: public profile photos for all user types
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars', 'avatars', true,
      10485760,  -- 10 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed avatars on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_0$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_1$
  begin


    -- post-media: public images / short video attached to feed posts
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'post-media', 'post-media', true,
      52428800,  -- 50 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed post-media on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_1$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_2$
  begin


    -- venue-media: public venue photos / banners
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'venue-media', 'venue-media', true,
      52428800,  -- 50 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed venue-media on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_2$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_3$
  begin


    -- event-media: public event flyers, photos, promo images
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'event-media', 'event-media', true,
      52428800,  -- 50 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed event-media on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_3$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_4$
  begin


    -- documents: private general-purpose documents (contracts, PDFs, etc.)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'documents', 'documents', false,
      26214400,  -- 25 MB
      ARRAY['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'application/rtf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed documents on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_4$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_5$
  begin


    -- portfolio: private artist / venue portfolio items
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'portfolio', 'portfolio', false,
      52428800,  -- 50 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/webm',
            'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed portfolio on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_5$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_6$
  begin


    -- artist-videos: private artist promo / performance videos
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'artist-videos', 'artist-videos', false,
      524288000,  -- 500 MB
      ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-msvideo']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed artist-videos on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_6$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_7$
  begin


    -- artist-documents: private artist business documents (rider, press kit, etc.)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'artist-documents', 'artist-documents', false,
      26214400,  -- 25 MB
      ARRAY['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'application/rtf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed artist-documents on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_7$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_8$
  begin


    -- artist-merchandise: public merch product images
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'artist-merchandise', 'artist-merchandise', true,
      10485760,  -- 10 MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed artist-merchandise on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_8$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_9$
  begin


    -- venue-documents: private venue-specific documents
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'venue-documents', 'venue-documents', false,
      26214400,  -- 25 MB
      ARRAY['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'application/rtf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  exception when others then
    raise warning
      'Skipping bucket seed venue-documents on %.%: % %',
      'storage', 'buckets', sqlstate, sqlerrm;
  end;
$storage_replay_guard_9$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_10$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — avatars
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;

    CREATE POLICY "avatars: public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  exception when others then
    raise warning
      'Skipping policy avatars: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_10$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_11$
  begin


    DROP POLICY IF EXISTS "avatars: owner insert" ON storage.objects;

    CREATE POLICY "avatars: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy avatars: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_11$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_12$
  begin


    DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;

    CREATE POLICY "avatars: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy avatars: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_12$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_13$
  begin


    DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;

    CREATE POLICY "avatars: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy avatars: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_13$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_14$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — post-media
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "post-media: public read" ON storage.objects;

    CREATE POLICY "post-media: public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'post-media');
  exception when others then
    raise warning
      'Skipping policy post-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_14$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_15$
  begin


    DROP POLICY IF EXISTS "post-media: authenticated insert" ON storage.objects;

    CREATE POLICY "post-media: authenticated insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'post-media');
  exception when others then
    raise warning
      'Skipping policy post-media: authenticated insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_15$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_16$
  begin


    DROP POLICY IF EXISTS "post-media: owner update" ON storage.objects;

    CREATE POLICY "post-media: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'post-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy post-media: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_16$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_17$
  begin


    DROP POLICY IF EXISTS "post-media: owner delete" ON storage.objects;

    CREATE POLICY "post-media: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'post-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy post-media: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_17$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_18$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — venue-media
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "venue-media: public read" ON storage.objects;

    CREATE POLICY "venue-media: public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'venue-media');
  exception when others then
    raise warning
      'Skipping policy venue-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_18$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_19$
  begin


    DROP POLICY IF EXISTS "venue-media: authenticated insert" ON storage.objects;

    CREATE POLICY "venue-media: authenticated insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'venue-media');
  exception when others then
    raise warning
      'Skipping policy venue-media: authenticated insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_19$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_20$
  begin


    DROP POLICY IF EXISTS "venue-media: owner update" ON storage.objects;

    CREATE POLICY "venue-media: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'venue-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-media: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_20$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_21$
  begin


    DROP POLICY IF EXISTS "venue-media: owner delete" ON storage.objects;

    CREATE POLICY "venue-media: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'venue-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-media: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_21$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_22$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — event-media
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "event-media: public read" ON storage.objects;

    CREATE POLICY "event-media: public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'event-media');
  exception when others then
    raise warning
      'Skipping policy event-media: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_22$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_23$
  begin


    DROP POLICY IF EXISTS "event-media: authenticated insert" ON storage.objects;

    CREATE POLICY "event-media: authenticated insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'event-media');
  exception when others then
    raise warning
      'Skipping policy event-media: authenticated insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_23$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_24$
  begin


    DROP POLICY IF EXISTS "event-media: owner update" ON storage.objects;

    CREATE POLICY "event-media: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'event-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy event-media: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_24$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_25$
  begin


    DROP POLICY IF EXISTS "event-media: owner delete" ON storage.objects;

    CREATE POLICY "event-media: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'event-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy event-media: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_25$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_26$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — documents (private)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "documents: owner read" ON storage.objects;

    CREATE POLICY "documents: owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy documents: owner read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_26$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_27$
  begin


    DROP POLICY IF EXISTS "documents: owner insert" ON storage.objects;

    CREATE POLICY "documents: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy documents: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_27$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_28$
  begin


    DROP POLICY IF EXISTS "documents: owner update" ON storage.objects;

    CREATE POLICY "documents: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy documents: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_28$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_29$
  begin


    DROP POLICY IF EXISTS "documents: owner delete" ON storage.objects;

    CREATE POLICY "documents: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy documents: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_29$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_30$
  begin


    -- service_role can manage all documents (for server-side operations)
    DROP POLICY IF EXISTS "documents: service_role all" ON storage.objects;

    CREATE POLICY "documents: service_role all" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'documents')
      WITH CHECK (bucket_id = 'documents');
  exception when others then
    raise warning
      'Skipping policy documents: service_role all on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_30$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_31$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — portfolio (private)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "portfolio: owner read" ON storage.objects;

    CREATE POLICY "portfolio: owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy portfolio: owner read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_31$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_32$
  begin


    DROP POLICY IF EXISTS "portfolio: owner insert" ON storage.objects;

    CREATE POLICY "portfolio: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy portfolio: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_32$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_33$
  begin


    DROP POLICY IF EXISTS "portfolio: owner update" ON storage.objects;

    CREATE POLICY "portfolio: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy portfolio: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_33$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_34$
  begin


    DROP POLICY IF EXISTS "portfolio: owner delete" ON storage.objects;

    CREATE POLICY "portfolio: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy portfolio: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_34$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_35$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — artist-videos (private)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "artist-videos: owner read" ON storage.objects;

    CREATE POLICY "artist-videos: owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'artist-videos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-videos: owner read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_35$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_36$
  begin


    DROP POLICY IF EXISTS "artist-videos: owner insert" ON storage.objects;

    CREATE POLICY "artist-videos: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artist-videos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-videos: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_36$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_37$
  begin


    DROP POLICY IF EXISTS "artist-videos: owner update" ON storage.objects;

    CREATE POLICY "artist-videos: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'artist-videos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-videos: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_37$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_38$
  begin


    DROP POLICY IF EXISTS "artist-videos: owner delete" ON storage.objects;

    CREATE POLICY "artist-videos: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artist-videos'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-videos: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_38$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_39$
  begin


    DROP POLICY IF EXISTS "artist-videos: service_role all" ON storage.objects;

    CREATE POLICY "artist-videos: service_role all" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'artist-videos')
      WITH CHECK (bucket_id = 'artist-videos');
  exception when others then
    raise warning
      'Skipping policy artist-videos: service_role all on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_39$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_40$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — artist-documents (private)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "artist-documents: owner read" ON storage.objects;

    CREATE POLICY "artist-documents: owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'artist-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-documents: owner read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_40$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_41$
  begin


    DROP POLICY IF EXISTS "artist-documents: owner insert" ON storage.objects;

    CREATE POLICY "artist-documents: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artist-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-documents: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_41$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_42$
  begin


    DROP POLICY IF EXISTS "artist-documents: owner update" ON storage.objects;

    CREATE POLICY "artist-documents: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'artist-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-documents: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_42$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_43$
  begin


    DROP POLICY IF EXISTS "artist-documents: owner delete" ON storage.objects;

    CREATE POLICY "artist-documents: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artist-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-documents: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_43$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_44$
  begin


    DROP POLICY IF EXISTS "artist-documents: service_role all" ON storage.objects;

    CREATE POLICY "artist-documents: service_role all" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'artist-documents')
      WITH CHECK (bucket_id = 'artist-documents');
  exception when others then
    raise warning
      'Skipping policy artist-documents: service_role all on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_44$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_45$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — artist-merchandise (public)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "artist-merchandise: public read" ON storage.objects;

    CREATE POLICY "artist-merchandise: public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'artist-merchandise');
  exception when others then
    raise warning
      'Skipping policy artist-merchandise: public read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_45$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_46$
  begin


    DROP POLICY IF EXISTS "artist-merchandise: owner insert" ON storage.objects;

    CREATE POLICY "artist-merchandise: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'artist-merchandise'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-merchandise: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_46$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_47$
  begin


    DROP POLICY IF EXISTS "artist-merchandise: owner update" ON storage.objects;

    CREATE POLICY "artist-merchandise: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'artist-merchandise'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-merchandise: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_47$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_48$
  begin


    DROP POLICY IF EXISTS "artist-merchandise: owner delete" ON storage.objects;

    CREATE POLICY "artist-merchandise: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'artist-merchandise'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy artist-merchandise: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_48$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_49$
  begin


    -- ---------------------------------------------------------------------------
    -- RLS POLICIES — venue-documents (private)
    -- ---------------------------------------------------------------------------

    DROP POLICY IF EXISTS "venue-documents: owner read" ON storage.objects;

    CREATE POLICY "venue-documents: owner read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'venue-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-documents: owner read on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_49$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_50$
  begin


    DROP POLICY IF EXISTS "venue-documents: owner insert" ON storage.objects;

    CREATE POLICY "venue-documents: owner insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'venue-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-documents: owner insert on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_50$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_51$
  begin


    DROP POLICY IF EXISTS "venue-documents: owner update" ON storage.objects;

    CREATE POLICY "venue-documents: owner update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'venue-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-documents: owner update on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_51$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_52$
  begin


    DROP POLICY IF EXISTS "venue-documents: owner delete" ON storage.objects;

    CREATE POLICY "venue-documents: owner delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'venue-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  exception when others then
    raise warning
      'Skipping policy venue-documents: owner delete on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_52$;

-- [CP-059 replay guard] storage-owned DDL in its own subtransaction: a replay role
-- outside the owning role set warns (sqlstate/sqlerrm) instead of aborting the chain.
do $storage_replay_guard_53$
  begin


    DROP POLICY IF EXISTS "venue-documents: service_role all" ON storage.objects;

    CREATE POLICY "venue-documents: service_role all" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'venue-documents')
      WITH CHECK (bucket_id = 'venue-documents');
  exception when others then
    raise warning
      'Skipping policy venue-documents: service_role all on %.%: % %',
      'storage', 'objects', sqlstate, sqlerrm;
  end;
$storage_replay_guard_53$;
