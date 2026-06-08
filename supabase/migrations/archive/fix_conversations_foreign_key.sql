-- =============================================================================
-- FIX CONVERSATIONS FOREIGN KEY RELATIONSHIP
-- =============================================================================
-- This specifically fixes the missing foreign key between conversations and messages

-- Add the missing foreign key constraint from conversations.last_message_id to messages.id
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_last_message_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_last_message_id_fkey 
        FOREIGN KEY (last_message_id) 
        REFERENCES messages(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint: conversations_last_message_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists: conversations_last_message_id_fkey';
    END IF;
END $$;

-- Also ensure the foreign key from messages.conversation_id to conversations.id exists
DO $$
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_conversation_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE messages 
        ADD CONSTRAINT messages_conversation_id_fkey 
        FOREIGN KEY (conversation_id) 
        REFERENCES conversations(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: messages_conversation_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists: messages_conversation_id_fkey';
    END IF;
END $$;

-- Verify the foreign key relationships were created
SELECT 
    'FOREIGN KEY VERIFICATION' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'conversations' OR tc.table_name = 'messages')
    AND (tc.constraint_name LIKE '%conversation%' OR tc.constraint_name LIKE '%message%')
ORDER BY tc.table_name, tc.constraint_name; 