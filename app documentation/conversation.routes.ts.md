# conversation.routes.ts

## Purpose of the File
`conversation.routes.ts` defines the Express router for conversation management endpoints (`/api/chats`). It binds route paths and HTTP verbs to the corresponding controller functions in `conversation.controller.ts` and applies rate limiting middleware.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `Router` from `express`.
- **L2–L8**: Imports controller handlers `getConversations`, `createConversation`, `getConversationMessages`, `renameConversation`, and `deleteConversation` from `../controllers/conversation.controller.ts`.
- **L9**: Imports burst `limiter` middleware from `../middleware/rateLimiter.ts`.
- **L11**: Instantiates an Express `Router` object.
- **L14**: Applies `limiter` to all routes on this router (`router.use(limiter)`).
- **L16**: `router.get('/', getConversations)`: Maps `GET /` to list all conversations with message counts.
- **L17**: `router.post('/', createConversation)`: Maps `POST /` to create a new conversation.
- **L18**: `router.get('/:chatId/messages', getConversationMessages)`: Maps `GET /:chatId/messages` to retrieve chronological message history for a conversation.
- **L19**: `router.patch('/:chatId', renameConversation)`: Maps `PATCH /:chatId` to update a conversation title.
- **L20**: `router.delete('/:chatId', deleteConversation)`: Maps `DELETE /:chatId` to delete a conversation and its messages.
- **L22**: Exports router instance as default export.
