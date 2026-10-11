==============================================================================
DATABASE OPERATION FLOW  -  AI Chat App
==============================================================================
Stack: PostgreSQL (pg Pool)  <-  Express (TypeScript)  <-  fetch/SSE  <-  React + Zustand

PART 1: ALL FILES CONNECTED TO DATABASE OPERATIONS (and their responsibilities)
------------------------------------------------------------------------------

[DATABASE LAYER]
1. database/schema.sql
   - Defines the two tables:
       chats    (id UUID PK, title, created_at, updated_at)
       messages (id UUID PK, chat_id FK -> chats.id ON DELETE CASCADE,
                 role 'user'|'assistant'|'system', content, created_at)
   - Index idx_messages_chat_id for fast "messages of a conversation" lookup.
   - Deleting a chat automatically deletes its messages (CASCADE).

2. server/.env
   - Holds DATABASE_URL (the PostgreSQL / Supabase connection string).

[BACKEND - CONNECTION]
3. server/db/pool.ts
   - Creates the single shared pg connection Pool (max 10 connections, SSL for
     Supabase). Exports `pool` and `testConnection()`.
   - Every SQL query in the app goes through `pool.query(...)`.

[BACKEND - DATA ACCESS (the ONLY place SQL lives)]
4. server/services/chatDb.service.ts
   - Contains every SQL statement:
       listChatsWithCount()   SELECT chats LEFT JOIN messages, COUNT, ORDER BY updated_at DESC
       createChat(title)      INSERT INTO chats ... RETURNING
       getChatById(id)        SELECT ... WHERE id = $1 (existence check)
       getMessagesByChatId(id) SELECT ... WHERE chat_id = $1 ORDER BY created_at ASC
       renameChat(id,title)   UPDATE chats SET title, updated_at
       deleteChat(id)         DELETE FROM chats WHERE id = $1
       saveMessage(chatId, role, content)  INSERT INTO messages ... RETURNING
       touchChat(id)          UPDATE chats SET updated_at = NOW()
   - Also defines the ChatRow / MessageRow TypeScript row types.

[BACKEND - VALIDATION]
5. server/schemas/conversation.schema.ts
   - Zod validation for conversation endpoints: chatIdParamSchema (UUID),
     createChatSchema / updateChatSchema (title 1-100 chars).
6. server/schemas/chat.schema.ts
   - Zod validation for the streaming chat body: optional chatId (UUID) and
     messages[] (role, content <= 10,000 chars).

[BACKEND - BUSINESS LOGIC / CONTROLLERS]
7. server/controllers/conversation.controller.ts
   - HTTP handlers for conversation CRUD; validate input then call chatDb:
       getConversations, createConversation, getConversationMessages,
       renameConversation, deleteConversation.
8. server/controllers/chat.controller.ts
   - streamChat: creates a chat if no chatId, saves the user message, streams
     the AI reply (SSE), then saves the assistant message and touches the chat.
   - (structuredChat does NOT touch the database.)

[BACKEND - ROUTING / ENTRY]
9. server/routes/conversation.routes.ts
   - Maps GET /, POST /, GET /:chatId/messages, PATCH /:chatId, DELETE /:chatId
     to the conversation controller (mounted at /api/chats).
10. server/routes/chat.routes.ts
   - Maps POST /stream and /structured to chat controller (mounted at /api/chat).
11. server/middleware/rateLimiter.ts
   - Rate limiters applied to the routes (protects DB/API from abuse).
12. server/server.ts
   - Express app: mounts routes at /api/chat and /api/chats, calls
     testConnection() at startup to verify the DB connection.
13. server/services/groq.service.ts
   - Groq AI client. Not DB, but produces the assistant text that gets saved.

[FRONTEND - NETWORK BRIDGE]
14. vite.config.ts
   - Dev proxy: forwards /api/* to http://localhost:5000 (the backend).
   (vercel.json handles the same routing in production.)
15. src/services/chatApi.ts
   - fetch wrappers for the REST endpoints: fetchChats, createChat,
     fetchChatMessages, renameChat, deleteChat.
16. src/types/chat.ts
   - Frontend types Chat, Message, TokenUsage mirroring DB rows.

[FRONTEND - STATE & LOGIC]
17. src/stores/chatStore.ts
   - Zustand store holding data from the DB: chats[], messages[],
     currentChatId, chatsLoading, messagesLoading; plus updateChatTitleInStore,
     removeChatFromStore, resetConversation.
18. src/hooks/useChat.ts
   - Orchestrates everything: refreshConversations (load list),
     loadConversation (load messages), handleSubmit (POST /api/chat/stream,
     receives chatId over SSE, refreshes list), startNewChat.

[FRONTEND - DISPLAY]
19. src/App.tsx
   - Reads messages/loading state, renders the message list and "Loading
     conversation..." state, wires Sidebar and ChatInput to useChat.
20. src/components/chat/Sidebar.tsx
   - Displays the conversations list from the DB (chat.title), handles select,
     rename (renameChat) and delete (deleteChat).
21. src/components/chat/ChatMessage.tsx
   - Renders one message (role + content) fetched from DB, with Markdown.
22. src/components/chat/MarkdownTable.tsx
   - Table renderers used by ChatMessage for markdown tables in messages.
23. src/components/chat/ChatInput.tsx
   - Input box where the user types; submits to handleSubmit (which causes
     the DB inserts).
24. src/components/ui/DeleteModal.tsx
   - Confirmation dialog before deleting a conversation from the DB.

[EXISTING DOCS]
   documentation/backend/postgresql-chat-history.md, documentation/server/*.md,
   documentation/frontend/useChat.md, documentation/useStore.md,
   "database operation .md"


PART 2: STUDY ORDER (BACKEND -> FRONTEND)
------------------------------------------------------------------------------
 1. database/schema.sql
 2. server/.env  (only DATABASE_URL)
 3. server/db/pool.ts
 4. server/services/chatDb.service.ts          <- MOST IMPORTANT
 5. server/schemas/conversation.schema.ts
 6. server/schemas/chat.schema.ts
 7. server/controllers/conversation.controller.ts
 8. server/controllers/chat.controller.ts
 9. server/routes/conversation.routes.ts
10. server/routes/chat.routes.ts
11. server/server.ts
12. vite.config.ts
13. src/types/chat.ts
14. src/services/chatApi.ts
15. src/stores/chatStore.ts
16. src/hooks/useChat.ts
17. src/App.tsx
18. src/components/chat/Sidebar.tsx
19. src/components/chat/ChatMessage.tsx
20. src/components/chat/ChatInput.tsx   (+ MarkdownTable.tsx, DeleteModal.tsx)


PART 3: OPERATION FLOWS
------------------------------------------------------------------------------

A) CREATING A CHAT  (happens automatically on first message)
   Frontend: ChatInput -> useChat.handleSubmit()  (chatId is null)
     -> POST /api/chat/stream { messages, chatId: undefined }
   Backend:  chat.routes.ts -> chat.controller.streamChat()
     -> chatRequestSchema validates body
     -> title = first user message (truncated to 50 chars)
     -> chatDb.createChat(title)  =>  INSERT INTO chats (title) RETURNING ...
     -> first SSE event: { chatId }
   Frontend: useChat parser receives { chatId } -> setCurrentChatId()
     -> on [DONE], refreshConversations() -> Sidebar shows the new chat.
   (Also available: POST /api/chats -> conversation.controller.createConversation
    -> chatDb.createChat, via chatApi.createChat. Not currently used by the UI.)

B) CREATING A MESSAGE
   User message:
     streamChat -> chatDb.saveMessage(chatId, 'user', text)
       => INSERT INTO messages (chat_id, role, content) RETURNING ...
     (saved BEFORE the AI starts streaming)
   Assistant message:
     after streaming completes, fullAssistantResponse is accumulated ->
     chatDb.saveMessage(chatId, 'assistant', fullText)
     -> chatDb.touchChat(chatId)  => UPDATE chats SET updated_at = NOW()
     (so the chat moves to top of the sidebar list)
   Frontend displays it: useChat appends streamed chunks into
     chatStore.messages -> App.tsx maps -> ChatMessage.tsx renders.

C) LOADING CONVERSATIONS (sidebar list)
   Frontend: useChat mounts -> refreshConversations()
     -> chatApi.fetchChats() -> GET /api/chats
   Backend:  conversation.routes.ts -> getConversations()
     -> chatDb.listChatsWithCount()
        SELECT c.*, COUNT(m.id) FROM chats c LEFT JOIN messages m ... 
        GROUP BY c.id ORDER BY c.updated_at DESC
     -> { chats }
   Frontend: chatStore.setChats(chats) -> Sidebar.tsx renders chat.title list.

D) GETTING MESSAGES BELONGING TO A CONVERSATION
   Frontend: Sidebar click -> onSelectChat -> useChat.loadConversation(chatId)
     -> setCurrentChatId, setMessagesLoading(true)
     -> chatApi.fetchChatMessages(chatId) -> GET /api/chats/:chatId/messages
   Backend:  conversation.routes.ts -> getConversationMessages()
     -> chatIdParamSchema validates UUID
     -> chatDb.getChatById()   (404 if not found)
     -> chatDb.getMessagesByChatId()
        SELECT ... FROM messages WHERE chat_id = $1 ORDER BY created_at ASC
     -> { messages }
   Frontend: setMessages([system prompt, ...fetchedMessages])
     -> App.tsx messages.map -> ChatMessage.tsx displays each message
        (shows "Loading conversation..." while messagesLoading).

E) (Extra) RENAME / DELETE
   Sidebar -> chatApi.renameChat / deleteChat -> PATCH / DELETE /api/chats/:id
   -> conversation.controller -> chatDb.renameChat / deleteChat
   (DELETE cascades to messages table.)

PART 4: ONE-LINE SUMMARY
------------------------------------------------------------------------------
UI event -> useChat -> chatApi (fetch) -> Vite proxy -> routes -> controller
(zod validation) -> chatDb.service (SQL) -> pool -> PostgreSQL -> and back:
rows -> JSON -> chatStore (Zustand) -> App/Sidebar/ChatMessage render.
==============================================================================
