# chat.ts

## Purpose of the File
`chat.ts` contains the core TypeScript type definitions and interfaces for the chat client. It defines the schema for chat messages, token consumption statistics, and conversation summaries exchanged between the client and backend database.

---

## Line-by-Line Code Breakdown

- **L1–L7**: Declares the `Message` interface:
  - `id`: Optional UUID string identifying the message in the database.
  - `chat_id`: Optional foreign key UUID referencing the parent conversation.
  - `role`: Union literal `'user' | 'assistant' | 'system'` representing the sender persona.
  - `content`: Text payload of the message.
  - `created_at`: Optional ISO timestamp string representing creation time.
- **L9–L13**: Declares the `TokenUsage` interface:
  - `prompt`: Count of tokens consumed by input prompts.
  - `completion`: Count of tokens produced by model completion.
  - `total`: Total tokens consumed by the request.
- **L15–L21**: Declares the `Chat` interface:
  - `id`: UUID string primary key.
  - `title`: User-facing title string of the conversation.
  - `created_at`: Creation ISO timestamp.
  - `updated_at`: Last updated ISO timestamp.
  - `message_count`: Optional number of messages attached to the conversation.
