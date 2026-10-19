# chat.schema.ts

## Purpose of the File
`chat.schema.ts` defines the Zod runtime validation schema for chat requests received by `/api/chat/stream` and `/api/chat/structured`. It enforces constraints on message roles, content length, array boundaries, and validates UUID formatting for optional conversation IDs.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `z` from `zod`.
- **L3**: Exports `chatRequestSchema` defining the expected shape of incoming chat requests:
  - **L4**: `chatId`: `z.string().uuid().optional()` validates that if a conversation ID is provided, it must be a valid RFC 4122 UUID.
  - **L5–L14**: `messages`: Validates an array of message objects:
    - **L8**: `role`: Must be one of `'user'`, `'assistant'`, or `'system'`.
    - **L9–L12**: `content`: Must be a string with a minimum of 1 character and a maximum of 10,000 characters.
  - **L15**: `.min(1)`: Ensures the `messages` array contains at least one message.
  - **L16**: `.max(100)`: Caps conversation history in a single request to 100 messages to prevent payload bloat.
