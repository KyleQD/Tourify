-- =============================================================================
-- CHECK MESSAGES TABLE STRUCTURE & CONSTRAINTS
-- =============================================================================
-- Run this to see the current messages table structure and constraints

-- Check messages table structure
SELECT 'MESSAGES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check existing foreign key constraints on messages table
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

-- Check if conversation_id column exists in messages
SELECT 'CONVERSATION_ID COLUMN IN MESSAGES:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
AND column_name = 'conversation_id';

-- Check profiles table id column
SELECT 'PROFILES TABLE ID COLUMN:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'id';

-- Check if there are any existing messages
SELECT 'EXISTING MESSAGES COUNT:' as info;
SELECT COUNT(*) as message_count FROM messages; 