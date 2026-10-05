import { pool } from '../db/pool.ts';

export interface ChatRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// 1. SELECT with JOIN and GROUP BY: Retrieves all conversations along with their total message count
export async function listChatsWithCount(): Promise<ChatRow[]> {
  const query = `
    SELECT 
      c.id, 
      c.title, 
      c.created_at, 
      c.updated_at, 
      COUNT(m.id)::int AS message_count
    FROM chats c
    LEFT JOIN messages m ON c.id = m.chat_id
    GROUP BY c.id
    ORDER BY c.updated_at DESC;
  `;
  const result = await pool.query<ChatRow>(query);
  return result.rows;
}

// 2. INSERT: Creates a new chat record and returns the created row
export async function createChat(title: string): Promise<ChatRow> {
  const query = `
    INSERT INTO chats (title)
    VALUES ($1)
    RETURNING id, title, created_at, updated_at;
  `;
  const result = await pool.query<ChatRow>(query, [title]);
  return result.rows[0];
}

// 3. SELECT with WHERE: Checks whether a specific chat exists
export async function getChatById(chatId: string): Promise<ChatRow | null> {
  const query = `
    SELECT id, title, created_at, updated_at
    FROM chats
    WHERE id = $1;
  `;
  const result = await pool.query<ChatRow>(query, [chatId]);
  return result.rows[0] ?? null;
}

// 4. SELECT with WHERE and ORDER BY: Loads full conversation history ordered chronologically
export async function getMessagesByChatId(chatId: string): Promise<MessageRow[]> {
  const query = `
    SELECT id, chat_id, role, content, created_at
    FROM messages
    WHERE chat_id = $1
    ORDER BY created_at ASC;
  `;
  const result = await pool.query<MessageRow>(query, [chatId]);
  return result.rows;
}

// 5. UPDATE with WHERE: Renames a conversation and updates its timestamp
export async function renameChat(chatId: string, title: string): Promise<ChatRow | null> {
  const query = `
    UPDATE chats
    SET title = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, title, created_at, updated_at;
  `;
  const result = await pool.query<ChatRow>(query, [title, chatId]);
  return result.rows[0] ?? null;
}

// 6. DELETE with WHERE: Deletes a conversation; ON DELETE CASCADE removes associated messages
export async function deleteChat(chatId: string): Promise<boolean> {
  const query = `
    DELETE FROM chats
    WHERE id = $1
    RETURNING id;
  `;
  const result = await pool.query(query, [chatId]);
  return (result.rowCount ?? 0) > 0;
}

// 7. INSERT: Persists a single message linked to a conversation
export async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<MessageRow> {
  const query = `
    INSERT INTO messages (chat_id, role, content)
    VALUES ($1, $2, $3)
    RETURNING id, chat_id, role, content, created_at;
  `;
  const result = await pool.query<MessageRow>(query, [chatId, role, content]);
  return result.rows[0];
}

// 8. UPDATE with WHERE: Updates the updated_at timestamp when new messages arrive
export async function touchChat(chatId: string): Promise<void> {
  const query = `
    UPDATE chats
    SET updated_at = NOW()
    WHERE id = $1;
  `;
  await pool.query(query, [chatId]);
}
