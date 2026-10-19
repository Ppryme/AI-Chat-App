# chat.controller.ts

## Purpose of the File
`chat.controller.ts` contains the HTTP controller handlers for chat inference and streaming. Its primary handler, `streamChat`, validates the message payload, creates a new chat in PostgreSQL if needed, persists the user message to the database, initiates a streaming completion with Groq AI, streams text deltas to the client via Server-Sent Events (SSE), persists the completed assistant response to the database, and touches the chat timestamp. It also provides `structuredChat` for JSON-schema-constrained responses.

---

## Line-by-Line Code Breakdown

- **L1**: Imports Express `Request` and `Response` types.
- **L2–L4**: Imports `chatRequestSchema`, `PersonSchema`, and `zodToJsonSchema` for payload and schema validation.
- **L5**: Imports `groq` client instance from `../services/groq.service.ts`.
- **L6**: Imports `* as chatDb` from `../services/chatDb.service.ts` for database operations.
- **L8**: Defines default `SYSTEM_PROMPT` string (`'You are a helpful assistant.'`).
- **L10**: Declares and exports async `streamChat(req, res)` controller handler.
- **L12–L19**: Validates request body with `chatRequestSchema.safeParse`. Returns HTTP 400 with validation details if parsing fails.
- **L21**: Extracts `messages` array and incoming `chatId` from validated data.
- **L24–L25**: Initializes `currentChatId` and locates the latest message with role `'user'`.
- **L27–L33**: Chat Creation Branch: If `currentChatId` is not provided, extracts text from the first user message, truncates to 50 characters as a title, and calls `chatDb.createChat(title)` to insert a new conversation into the database.
- **L34–L39**: Existing Chat Branch: If `currentChatId` was provided, verifies the conversation exists with `chatDb.getChatById`. Returns HTTP 404 if not found.
- **L42–L44**: User Message Persistence: Calls `chatDb.saveMessage(currentChatId, 'user', lastUserMessage.content)` to save the user prompt to PostgreSQL before streaming begins.
- **L46–L53**: Sets Server-Sent Events (SSE) HTTP headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`) and flushes headers immediately.
- **L56**: Writes the first SSE data event with `{ chatId: currentChatId }` so the client receives the assigned conversation ID immediately.
- **L58–L61**: Prepares the model messages array, prepending the system prompt and filtering out duplicate client system messages.
- **L63–L70**: Calls `groq.chat.completions.create` requesting streaming completion (`stream: true`) with the `openai/gpt-oss-120b` model.
- **L73–L75**: Initializes `totalUsage` accumulator and `fullAssistantResponse` string.
- **L76–L84**: Iterates through stream chunks with `for await (const chunk of stream)`:
  - Extracts text delta (`content`).
  - Records usage statistics if present.
  - Appends delta to `fullAssistantResponse`.
  - Streams chunk to client with `res.write('data: ...\n\n')`.
- **L85**: Emits token usage event if usage metadata was received.
- **L88–L91**: Assistant Message Persistence: Calls `chatDb.saveMessage(currentChatId, 'assistant', fullAssistantResponse)` to save the complete response to PostgreSQL, then calls `chatDb.touchChat(currentChatId)` to update the conversation's `updated_at` timestamp.
- **L93–L94**: Emits terminating `data: [DONE]\n\n` event and ends HTTP response (`res.end()`).
- **L95–L104**: Catch block: Emits HTTP 500 or SSE error event depending on whether headers were already sent.
- **L107–L158**: `structuredChat(req, res)`: Handler demonstrating JSON schema enforcement using `PersonSchema` and `zodToJsonSchema`, requesting structured output from Groq.
