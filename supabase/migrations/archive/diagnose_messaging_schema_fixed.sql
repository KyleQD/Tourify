-- =============================================================================
-- DIAGNOSTIC SCRIPT - FIXED VERSION
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

-- Check existing foreign key constraints on messages table (simplified)
SELECT 'EXISTING FOREIGN KEY CONSTRAINTS ON MESSAGES:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'messages'
AND tc.table_schema = 'public';

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
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'messages';

-- Check if there are any existing messages
SELECT 'EXISTING MESSAGES COUNT:' as info;
SELECT COUNT(*) as message_count FROM messages;

-- Show table constraints for messages table
SELECT 'ALL CONSTRAINTS ON MESSAGES TABLE:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid = 'messages'::regclass;

-- Check if sender_id column exists in messages
SELECT 'SENDER_ID COLUMN IN MESSAGES:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
AND column_name = 'sender_id';

-- Final check - list all tables in public schema
SELECT 'ALL PUBLIC TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name; 