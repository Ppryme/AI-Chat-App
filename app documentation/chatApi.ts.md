# chatApi.ts

## Purpose of the File
`chatApi.ts` serves as the frontend HTTP API client module. It defines clean promise-based wrapper functions around native browser `fetch` calls to perform CRUD operations on conversations and retrieve message history from backend endpoints (`/api/chats`).

---

## Line-by-Line Code Breakdown

- **L1**: Imports domain types `Chat` and `Message` from `types/chat.ts`.
- **L3**: Defines the constant `API_BASE` endpoint path (`'/api/chats'`).
- **L5–L12**: `fetchChats()`: Executes `GET /api/chats`, validates HTTP status, parses response JSON, and returns an array of `Chat` objects (or empty array).
- **L14–L25**: `createChat(title)`: Executes `POST /api/chats` with `{ title }` payload, parses response, and returns the newly created `Chat` record.
- **L27–L34**: `fetchChatMessages(chatId)`: Executes `GET /api/chats/${chatId}/messages`, validates response, and returns chronological array of `Message` records for the specified conversation.
- **L36–L47**: `renameChat(chatId, title)`: Executes `PATCH /api/chats/${chatId}` with `{ title }` payload to update conversation title, returning updated `Chat`.
- **L49–L56**: `deleteChat(chatId)`: Executes `DELETE /api/chats/${chatId}` to delete a conversation and its messages via database CASCADE.
