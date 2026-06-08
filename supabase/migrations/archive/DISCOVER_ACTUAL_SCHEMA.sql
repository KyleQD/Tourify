-- =====================================================
-- COMPREHENSIVE SCHEMA DISCOVERY SCRIPT
-- =====================================================
-- Run this FIRST to discover the actual column names in your database
-- This will help us create a solution that matches your exact schema

-- =====================================================
-- DISCOVER ARTIST_PROFILES TABLE SCHEMA
-- =====================================================

DO $$
DECLARE
    column_info RECORD;
    table_exists BOOLEAN;
BEGIN
    -- Check if artist_profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'artist_profiles' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎨 ARTIST_PROFILES TABLE DISCOVERY';
    RAISE NOTICE '=====================================';
    
    IF table_exists THEN
        RAISE NOTICE '✅ artist_profiles table EXISTS';
        RAISE NOTICE '';
        RAISE NOTICE 'Columns in artist_profiles:';
        RAISE NOTICE '----------------------------';
        
        FOR column_info IN (
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'artist_profiles' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '• % (%) - nullable: % - default: %', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
        -- Check for image/avatar columns specifically
        RAISE NOTICE '';
        RAISE NOTICE '🖼️  IMAGE/AVATAR COLUMNS FOUND:';
        FOR column_info IN (
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'artist_profiles' 
            AND table_schema = 'public'
            AND (column_name LIKE '%image%' OR column_name LIKE '%avatar%' OR column_name LIKE '%photo%' OR column_name LIKE '%picture%')
        ) LOOP
            RAISE NOTICE '• %', column_info.column_name;
        END LOOP;
        
        -- Sample data from artist_profiles for Clive Malone
        RAISE NOTICE '';
        RAISE NOTICE '📊 SAMPLE DATA FOR CLIVE MALONE:';
        DECLARE
            sample_data RECORD;
        BEGIN
            SELECT * INTO sample_data
            FROM artist_profiles 
            WHERE user_id = 'bce15693-d2bf-42db-a2f2-68239568fafe'
            LIMIT 1;
            
            IF sample_data.id IS NOT NULL THEN
                RAISE NOTICE '• ID: %', sample_data.id;
                RAISE NOTICE '• User ID: %', sample_data.user_id;
                RAISE NOTICE '• Artist Name: %', sample_data.artist_name;
                RAISE NOTICE '• Bio: %', COALESCE(sample_data.bio, 'null');
                
                -- Try to show image column value if it exists
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'profile_image_url') THEN
                    RAISE NOTICE '• Profile Image URL: %', sample_data.profile_image_url;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'avatar_url') THEN
                    RAISE NOTICE '• Avatar URL: %', sample_data.avatar_url;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'image_url') THEN
                    RAISE NOTICE '• Image URL: %', sample_data.image_url;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'is_verified') THEN
                    RAISE NOTICE '• Is Verified: %', sample_data.is_verified;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_profiles' AND column_name = 'verified') THEN
                    RAISE NOTICE '• Verified: %', sample_data.verified;
                END IF;
            ELSE
                RAISE NOTICE '❌ No artist profile found for Clive Malone';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error reading sample data: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ artist_profiles table does NOT exist';
    END IF;
END $$;

-- =====================================================
-- DISCOVER VENUE_PROFILES TABLE SCHEMA
-- =====================================================

DO $$
DECLARE
    column_info RECORD;
    table_exists BOOLEAN;
BEGIN
    -- Check if venue_profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'venue_profiles' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '🏢 VENUE_PROFILES TABLE DISCOVERY';
    RAISE NOTICE '==================================';
    
    IF table_exists THEN
        RAISE NOTICE '✅ venue_profiles table EXISTS';
        RAISE NOTICE '';
        RAISE NOTICE 'Columns in venue_profiles:';
        RAISE NOTICE '--------------------------';
        
        FOR column_info IN (
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'venue_profiles' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '• % (%) - nullable: % - default: %', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
        -- Check for image/logo columns specifically
        RAISE NOTICE '';
        RAISE NOTICE '🖼️  IMAGE/LOGO COLUMNS FOUND:';
        FOR column_info IN (
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'venue_profiles' 
            AND table_schema = 'public'
            AND (column_name LIKE '%image%' OR column_name LIKE '%logo%' OR column_name LIKE '%avatar%' OR column_name LIKE '%photo%')
        ) LOOP
            RAISE NOTICE '• %', column_info.column_name;
        END LOOP;
        
    ELSE
        RAISE NOTICE '❌ venue_profiles table does NOT exist';
    END IF;
END $$;

-- =====================================================
-- DISCOVER PROFILES TABLE SCHEMA
-- =====================================================

DO $$
DECLARE
    column_info RECORD;
    table_exists BOOLEAN;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '👤 PROFILES TABLE DISCOVERY';
    RAISE NOTICE '===========================';
    
    IF table_exists THEN
        RAISE NOTICE '✅ profiles table EXISTS';
        RAISE NOTICE '';
        RAISE NOTICE 'Columns in profiles:';
        RAISE NOTICE '-------------------';
        
        FOR column_info IN (
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '• % (%) - nullable: % - default: %', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
        -- Sample data from profiles for Clive Malone
        RAISE NOTICE '';
        RAISE NOTICE '📊 SAMPLE DATA FOR CLIVE MALONE:';
        DECLARE
            sample_data RECORD;
        BEGIN
            SELECT * INTO sample_data
            FROM profiles 
            WHERE id = 'bce15693-d2bf-42db-a2f2-68239568fafe'
            LIMIT 1;
            
            IF sample_data.id IS NOT NULL THEN
                RAISE NOTICE '• ID: %', sample_data.id;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
                    RAISE NOTICE '• Username: %', COALESCE(sample_data.username, 'null');
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
                    RAISE NOTICE '• Full Name: %', COALESCE(sample_data.full_name, 'null');
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
                    RAISE NOTICE '• Name: %', COALESCE(sample_data.name, 'null');
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
                    RAISE NOTICE '• Avatar URL: %', COALESCE(sample_data.avatar_url, 'null');
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
                    RAISE NOTICE '• Is Verified: %', COALESCE(sample_data.is_verified::text, 'null');
                END IF;
                
            ELSE
                RAISE NOTICE '❌ No profile found for Clive Malone';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error reading sample data: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE '❌ profiles table does NOT exist';
    END IF;
END $$;

-- =====================================================
-- DISCOVER POSTS TABLE SCHEMA
-- =====================================================

DO $$
DECLARE
    column_info RECORD;
    table_exists BOOLEAN;
BEGIN
    -- Check if posts table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'posts' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 POSTS TABLE DISCOVERY';
    RAISE NOTICE '========================';
    
    IF table_exists THEN
        RAISE NOTICE '✅ posts table EXISTS';
        RAISE NOTICE '';
        RAISE NOTICE 'Columns in posts:';
        RAISE NOTICE '----------------';
        
        FOR column_info IN (
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'posts' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '• % (%) - nullable: % - default: %', 
                column_info.column_name, 
                column_info.data_type, 
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'none');
        END LOOP;
        
        -- Check for specific columns we need
        RAISE NOTICE '';
        RAISE NOTICE '🔍 CRITICAL COLUMNS CHECK:';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'media_urls') THEN
            RAISE NOTICE '✅ media_urls column EXISTS';
        ELSE
            RAISE NOTICE '❌ media_urls column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_profile_id') THEN
            RAISE NOTICE '✅ posted_as_profile_id column EXISTS';
        ELSE
            RAISE NOTICE '❌ posted_as_profile_id column MISSING';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'posted_as_account_type') THEN
            RAISE NOTICE '✅ posted_as_account_type column EXISTS';
        ELSE
            RAISE NOTICE '❌ posted_as_account_type column MISSING';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ posts table does NOT exist';
    END IF;
END $$;

-- =====================================================
-- SUMMARY AND NEXT STEPS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SCHEMA DISCOVERY COMPLETE';
    RAISE NOTICE '============================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Review the column names above';
    RAISE NOTICE '2. Note any missing columns (marked with ❌)';
    RAISE NOTICE '3. Use the EXACT column names found in the corrected solution';
    RAISE NOTICE '';
    RAISE NOTICE 'READY TO CREATE SCHEMA-SPECIFIC SOLUTION!';
END $$; 