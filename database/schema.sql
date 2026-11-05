-- ==============================================================================
-- Schema: PostgreSQL Chat History
-- ==============================================================================
-- storing conversation metadata in chats and linked messages in messages table

-- chats table storing conversation metadata
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
);

-- messages table storing individual chat messages linked to a chat
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
);

-- indexing chat_id for fast message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
