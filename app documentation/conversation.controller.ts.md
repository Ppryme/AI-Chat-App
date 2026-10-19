# conversation.controller.ts

## Purpose of the File
`conversation.controller.ts` contains the HTTP controller handlers for conversation lifecycle endpoints (`/api/chats`). It handles listing all conversations with counts, manually creating conversations, fetching message history for a specific chat ID, updating/renaming chat titles, and deleting conversations with their related messages.

---

## Line-by-Line Code Breakdown

- **L1**: Imports Express `Request` and `Response` types.
- **L2–L6**: Imports Zod schemas `chatIdParamSchema`, `createChatSchema`, `updateChatSchema` from `../schemas/conversation.schema.ts`.
- **L7**: Imports the database operations module `* as chatDb` from `../services/chatDb.service.ts`.
- **L9–L18**: `getConversations(req, res)`: Handler for `GET /api/chats`. Queries `chatDb.listChatsWithCount()` and responds with `{ chats }` (HTTP 200) or an error object (HTTP 500).
- **L20–L35**: `createConversation(req, res)`: Handler for `POST /api/chats`. Validates request body using `createChatSchema` (returns HTTP 400 if invalid). Calls `chatDb.createChat(title)` and returns `{ chat: newChat }` (HTTP 201).
- **L37–L59**: `getConversationMessages(req, res)`: Handler for `GET /api/chats/:chatId/messages`. Validates that `:chatId` is a valid UUID via `chatIdParamSchema`. Checks if conversation exists with `chatDb.getChatById` (returns HTTP 404 if not found). Fetches message history with `chatDb.getMessagesByChatId(chatId)` and returns `{ messages }` (HTTP 200).
- **L61–L89**: `renameConversation(req, res)`: Handler for `PATCH /api/chats/:chatId`. Validates route parameter UUID and request body title via `updateChatSchema`. Executes `chatDb.renameChat(chatId, title)` and responds with `{ chat: updated }` (HTTP 200) or 404 if conversation was not found.
- **L91–L113**: `deleteConversation(req, res)`: Handler for `DELETE /api/chats/:chatId`. Validates `:chatId` parameter format. Invokes `chatDb.deleteChat(chatId)`. Returns success message (HTTP 200) or 404 if not found.
