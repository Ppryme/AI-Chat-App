# schema.sql

## Purpose of the File
`schema.sql` defines the relational database architecture in PostgreSQL. It establishes the two primary tables (`chats` and `messages`), configures UUID primary keys with automatic generation, enforces referential integrity with cascading deletes, restricts allowed message roles, and creates performance indexes for conversation lookups.

---

## Line-by-Line Code Breakdown

- **L1–L6**: Header documentation detailing the schema design and two-table relational structure.
- **L8–L14**: Creates the `chats` table if it does not already exist:
  - `id`: UUID primary key with default generation via `gen_random_uuid()`.
  - `title`: `TEXT NOT NULL` storing conversation name.
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` recording creation timestamp with timezone.
  - `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` recording latest modification/message timestamp.
- **L16–L23**: Creates the `messages` table:
  - `id`: UUID primary key defaulting to `gen_random_uuid()`.
  - `chat_id`: `UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE` foreign key linking to `chats`; ensures deleting a chat automatically purges all child messages.
  - `role`: `TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system'))` check constraint restricting message personas.
  - `content`: `TEXT NOT NULL` storing raw text or Markdown content.
  - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` for chronological sorting.
- **L25–L26**: Creates a B-tree index `idx_messages_chat_id` on `messages(chat_id)` to ensure fast message retrieval when fetching full conversation threads.
