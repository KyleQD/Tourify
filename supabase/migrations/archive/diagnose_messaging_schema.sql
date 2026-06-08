-- =============================================================================
-- DIAGNOSTIC SCRIPT - Check Current Messaging Schema State
-- =============================================================================
-- Run this SQL first to see what's actually in your database

-- Check if messages table exists and its structure
SELECT 'MESSAGES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check if conversations table exists
SELECT 'CONVERSATIONS TABLE EXISTS:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
) as table_exists;

-- Check existing foreign key constraints on messages table
SELECT 'EXISTING FOREIGN KEY CONSTRAINTS ON MESSAGES:' as info;
SELECT 
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.referential_constraints rc 
    ON kcu.constraint_name = rc.constraint_name
JOIN information_schema.key_column_usage kcu2 
    ON rc.unique_constraint_name = kcu2.constraint_name
WHERE kcu.table_schema = 'public' 
AND kcu.table_name = 'messages'
AND kcu.constraint_name LIKE '%_fkey';

-- Check if profiles table exists and has id column
SELECT 'PROFILES TABLE ID COLUMN:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'id';

-- Check current RLS policies on messages
SELECT 'CURRENT RLS POLICIES ON MESSAGES:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'messages';

-- Check if there are any existing messages
SELECT 'EXISTING MESSAGES COUNT:' as info;
SELECT COUNT(*) as message_count FROM messages;

-- Show any constraint violations that might exist
SELECT 'CONSTRAINT CHECK:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid = 'messages'::regclass; 