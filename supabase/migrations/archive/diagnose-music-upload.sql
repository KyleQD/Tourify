-- Comprehensive Music Upload RLS Diagnostic
-- Run this in your Supabase SQL Editor

-- 1. Check current RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'artist_music'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'artist_music';

-- 3. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'artist_music' 
ORDER BY ordinal_position;

-- 4. Test authentication context
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ No authenticated user found (auth.uid() is NULL)';
    ELSE
        RAISE NOTICE '✅ Authenticated user found: %', current_user_id;
    END IF;
END $$;

-- 5. Test a simple insert (this will show the exact error)
DO $$
DECLARE
    current_user_id uuid;
    test_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test insert - no authenticated user';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing insert with user_id: %', current_user_id;
    
    BEGIN
        INSERT INTO artist_music (
            user_id,
            title,
            description,
            type,
            genre,
            file_url,
            tags,
            is_featured,
            is_public
        ) VALUES (
            current_user_id,
            'Test Track',
            'Test description',
            'single',
            'test',
            'https://example.com/test.mp3',
            ARRAY['test'],
            false,
            true
        ) RETURNING id INTO test_id;
        
        RAISE NOTICE '✅ Insert successful! Test record ID: %', test_id;
        
        -- Clean up test data
        DELETE FROM artist_music WHERE id = test_id;
        RAISE NOTICE '✅ Test data cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed with error: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
    END;
END $$;

-- 6. Check for any conflicting policies
SELECT 
    policyname,
    cmd,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'artist_music'
GROUP BY policyname, cmd
HAVING COUNT(*) > 1;

-- 7. Show all policies for reference
SELECT 
    'artist_music' as table_name,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN qual
        WHEN with_check IS NOT NULL THEN with_check
        ELSE 'No condition'
    END as policy_condition
FROM pg_policies 
WHERE tablename = 'artist_music'
ORDER BY cmd, policyname;
