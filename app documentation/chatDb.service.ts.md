# chatDb.service.ts

## Purpose of the File
`chatDb.service.ts` is the central Data Access Object (DAO) service for the backend. It encapsulates all parameterized SQL statements executed against PostgreSQL via `pool.query`, including conversation listing with aggregated message counts, conversation creation, single conversation retrieval, thread message history retrieval, conversation renaming, conversation deletion, message persistence, and timestamp updates.

---

## Line-by-Line Code Breakdown

- **L1**: Imports the shared `pool` instance from `../db/pool.ts`.
- **L3–L9**: Defines `ChatRow` TypeScript interface representing columns returned from the `chats` table (`id`, `title`, `created_at`, `updated_at`, `message_count`).
- **L11–L17**: Defines `MessageRow` TypeScript interface representing columns in the `messages` table (`id`, `chat_id`, `role`, `content`, `created_at`).
- **L19–L35**: `listChatsWithCount()`: Executes a `SELECT` with `LEFT JOIN` and `COUNT(m.id)::int AS message_count`, grouped by `c.id` and sorted chronologically descending by `c.updated_at DESC`. Returns array of `ChatRow`.
- **L37–L46**: `createChat(title)`: Executes `INSERT INTO chats (title) VALUES ($1) RETURNING ...` using parameterized query to safely prevent SQL injection. Returns newly created `ChatRow`.
- **L48–L57**: `getChatById(chatId)`: Queries `SELECT ... FROM chats WHERE id = $1` to verify if a conversation exists. Returns matching row or `null`.
- **L59–L69**: `getMessagesByChatId(chatId)`: Queries `SELECT ... FROM messages WHERE chat_id = $1 ORDER BY created_at ASC` to fetch the chronological message history for a conversation.
- **L71–L81**: `renameChat(chatId, title)`: Executes `UPDATE chats SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING ...`. Returns updated `ChatRow` or `null`.
- **L83–L92**: `deleteChat(chatId)`: Executes `DELETE FROM chats WHERE id = $1 RETURNING id`. Returns boolean indicating if a row was deleted (`rowCount > 0`). Cascading foreign keys automatically delete child messages.
- **L94–L107**: `saveMessage(chatId, role, content)`: Inserts a single message into `messages` (`INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING ...`). Returns persisted `MessageRow`.
- **L109–L117**: `touchChat(chatId)`: Executes `UPDATE chats SET updated_at = NOW() WHERE id = $1` to move the conversation to the top of the conversation list after new messages are streamed.
