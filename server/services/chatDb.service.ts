import { pool } from '../db/pool.ts';

export interface ChatRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// retrieving all conversations joined with message counts grouped by chat id
export async function listChatsWithCount(): Promise<ChatRow[]> {
  const query = `
    SELECT 
      c.id, 
      c.title, 
      c.created_at, 
      c.updated_at, 
      COUNT(m.id) AS message_count
    FROM chats c
    LEFT JOIN messages m ON c.id = m.chat_id
    GROUP BY c.id
    ORDER BY c.updated_at DESC;
  `;
  const result = await pool.query<ChatRow>(query);
  return result.rows;
}

// inserting a new chat record and returning the created row
export async function createChat(title: string): Promise<ChatRow> {
  const query = `
    INSERT INTO chats (title)
    VALUES ($1)
    RETURNING id, title, created_at, updated_at;
  `;
  const result = await pool.query<ChatRow>(query, [title]);
  return result.rows[0];
}

// querying a chat record by its id
export async function getChatById(chatId: string): Promise<ChatRow | null> {
  const query = `
    SELECT id, title, created_at, updated_at
    FROM chats
    WHERE id = $1;
  `;
  const result = await pool.query<ChatRow>(query, [chatId]);
  return result.rows[0] ?? null;
}

// querying messages for a conversation ordered chronologically by creation timestamp
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

// updating conversation title and timestamp by chat id
export async function renameChat(chatId: string, title: string): Promise<ChatRow | null> {
  const query = `
    UPDATE chats
    SET title = $1
    WHERE id = $2
    RETURNING id, title, created_at, updated_at;
    
  `;
  const result = await pool.query<ChatRow>(query, [title, chatId]);
  return result.rows[0] ?? null;
}

// deleting a conversation record by id with cascade removal of messages
export async function deleteChat(chatId: string): Promise<boolean> {
  const query = `
    DELETE FROM chats
    WHERE id = $1
    
  `;
  const result = await pool.query(query, [chatId]);
  return (result.rowCount ?? 0) > 0;
}

// inserting a single message record linked to a conversation
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

// updating the updated_at timestamp for a conversation
export async function touchChat(chatId: string): Promise<void> {
  const query = `
    UPDATE chats
    SET updated_at = NOW()
    WHERE id = $1;
  `;
  await pool.query(query, [chatId]);
}
