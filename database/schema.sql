-- ==============================================================================
-- Schema: PostgreSQL Chat History
-- ==============================================================================
-- Exactly two tables:
-- 1. chats: stores conversation metadata (id, title, timestamps)
-- 2. messages: stores individual chat messages linked to a chat

-- Table 1: chats
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
);

-- Table 2: messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
);

-- Index on chat_id for fast message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
