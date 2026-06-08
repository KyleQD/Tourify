-- =============================================================================
-- FINAL MESSAGING SCHEMA FIX - HANDLES SEQUENCE ISSUES
-- =============================================================================

-- First, let's ensure the conversations table exists
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 UUID NOT NULL,
    participant_2 UUID NOT NULL,
    last_message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(participant_1, participant_2),
    CHECK (participant_1 != participant_2)
);

-- Drop existing problematic constraints if they exist
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Now add the foreign key constraints with explicit references
ALTER TABLE messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_participant_1_fkey 
FOREIGN KEY (participant_1) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_participant_2_fkey 
FOREIGN KEY (participant_2) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update their messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

-- Grant permissions (without sequences that might not exist)
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Grant sequence permissions only if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'conversations_id_seq') THEN
        GRANT USAGE ON SEQUENCE conversations_id_seq TO authenticated;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'messages_id_seq') THEN
        GRANT USAGE ON SEQUENCE messages_id_seq TO authenticated;
    END IF;
END $$;

-- Create or replace the conversation function
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    ordered_user1 UUID;
    ordered_user2 UUID;
BEGIN
    -- Ensure consistent ordering
    IF user1_id < user2_id THEN
        ordered_user1 := user1_id;
        ordered_user2 := user2_id;
    ELSE
        ordered_user1 := user2_id;
        ordered_user2 := user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE participant_1 = ordered_user1 AND participant_2 = ordered_user2;
    
    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (participant_1, participant_2)
        VALUES (ordered_user1, ordered_user2)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;

-- Final verification
SELECT 'FINAL VERIFICATION - FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'messages'
AND tc.table_schema = 'public';

SELECT 'Schema fix completed successfully!' as status; 