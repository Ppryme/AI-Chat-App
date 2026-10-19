# conversation.schema.ts

## Purpose of the File
`conversation.schema.ts` defines Zod validation schemas for conversation management REST endpoints (`/api/chats`). It validates URL route parameters (`chatId`) and payload bodies for creating and updating conversation titles.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `z` from `zod`.
- **L3–L5**: `chatIdParamSchema`: Validates route parameters (`req.params`), ensuring `chatId` is a valid UUID with a custom error message (`'Invalid chat ID format (must be a valid UUID)'`).
- **L7–L13**: `createChatSchema`: Validates request bodies for creating a conversation (`POST /api/chats`), requiring `title` to be trimmed, non-empty, and at most 100 characters.
- **L15–L21**: `updateChatSchema`: Validates request bodies for updating/renaming a conversation (`PATCH /api/chats/:chatId`), enforcing the same trimmed 1–100 character constraints.
