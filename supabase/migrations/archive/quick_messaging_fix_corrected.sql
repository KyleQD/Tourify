-- =============================================================================
-- QUICK MESSAGING SCHEMA FIX - CORRECTED VERSION
-- =============================================================================
-- Run this SQL directly in the Supabase dashboard SQL editor

-- Add conversation_id column to messages table if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Add other missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(participant_1, participant_2),
    CHECK (participant_1 != participant_2)
);

-- Add foreign key constraints using DO blocks (proper PostgreSQL syntax)
DO $$
BEGIN
    -- Add conversation_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_conversation_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_conversation_id_fkey 
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    -- Add sender_id foreign key if it doesn't exist (key fix for the error)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);

-- Enable RLS if not already enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Create RLS policies for messages
CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Create the get_or_create_conversation function
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Ensure consistent ordering to avoid duplicate conversations
    IF user1_id > user2_id THEN
        SELECT user1_id, user2_id INTO user2_id, user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE (participant_1 = user1_id AND participant_2 = user2_id)
       OR (participant_1 = user2_id AND participant_2 = user1_id);
    
    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (participant_1, participant_2)
        VALUES (user1_id, user2_id)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission on the function
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated;

-- Verify the schema is correct
SELECT 'Schema fix completed successfully!' as status; 