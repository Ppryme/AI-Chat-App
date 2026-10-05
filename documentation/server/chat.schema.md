# chat.schema.ts

## 1. Purpose

`chat.schema.ts` defines the **Zod validation schema** for the chat request payload. It specifies exactly what shape the `req.body` must have for the request to be accepted by the backend.

This schema ensures that:

1. The request body is an object with a `messages` key.
2. `messages` is an array of 1 to 100 objects.
3. Each message has a `role` that is one of `'user'`, `'assistant'`, or `'system'`.
4. Each message has a `content` string that is 1 to 10,000 characters long.

Any request that does not match this schema is rejected with a 400 error.

## 2. Where It Fits Into The Backend

### Files that use this file

- **`chat.controller.ts`** imports `chatRequestSchema` and calls `chatRequestSchema.safeParse(req.body)` to validate incoming requests.

### Files this file imports

| Import | From | Purpose |
|---|---|---|
| `z` | `zod` | The Zod schema builder object |

### Position in the request flow

```
chat.controller.ts
       ↓
chat.schema.ts (validates req.body)
       ↓
If valid → Groq API call
If invalid → 400 error response
```

This file does not interact with Express directly. It is a pure data validation module.

### Why this file exists as a separate component

1. **Reusability** — The schema can be used in tests, documentation generators, or other controllers.
2. **Readability** — Validation rules are in one place, separate from the controller's streaming logic.
3. **Maintainability** — Changing validation rules does not require modifying the controller.

---

## 3. Imports

### `z` from `zod`

```ts
import { z } from 'zod';
```

- **What is being imported:** The `z` object from the Zod library. `z` is the main entry point for creating Zod schemas.
- **Why it is needed:** Every Zod schema starts with `z.` followed by a type builder (e.g., `z.object()`, `z.string()`, `z.array()`, `z.enum()`).
- **Where it comes from:** The `zod` npm package (version `^3.25.76` in `package.json`).
- **How it is used:** Used to construct the `chatRequestSchema` on lines 3–16.

#### Syntax: Named import

The curly braces indicate a **named import**. The `zod` package exports an object named `z`, and this import extracts it.

---

## 4. Code Walkthrough

### The complete schema

#### Code

```ts
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z
          .string()
          .min(1, 'Content cannot be empty')
          .max(10000, 'Content is too long'),
      })
    )
    .min(1, 'Messages array must contain at least one message')
    .max(100, 'Conversation history is too long'),
});
```

#### Syntax

- **`export const`** — Declares a constant that is exported as a named export.
- **`z.object({...})`** — Creates a schema that validates objects. The keys inside define the expected properties.
- **`z.array(...)`** — Creates a schema that validates arrays. The argument defines the schema for each element.
- **`z.object({...})`** (nested) — Each element of the array must be an object.
- **`z.enum([...])`** — Creates a schema that validates a value is one of the specified strings.
- **`z.string()`** — Creates a schema that validates a value is a string.
- **`.min(n, message)`** — Adds a minimum length constraint. If the value is shorter than `n`, validation fails with the given message.
- **`.max(n, message)`** — Adds a maximum length constraint. If the value is longer than `n`, validation fails with the given message.
- **Method chaining** — Zod methods like `.min()` and `.max()` return a new schema, allowing you to chain constraints: `z.string().min(1).max(10000)`.

---

### Breaking down the schema layer by layer

#### Outer layer: The request body

```ts
z.object({
  messages: ...
})
```

The request body must be an **object** with a property called `messages`. If `req.body` is not an object, or if it does not have a `messages` key, validation fails.

---

#### Second layer: The messages array

```ts
z.array(...)
  .min(1, 'Messages array must contain at least one message')
  .max(100, 'Conversation history is too long')
```

The `messages` property must be an **array** with:

- **At least 1 element** — An empty array is not allowed. The frontend always sends at least the system message.
- **At most 100 elements** — Prevents excessively long conversation histories from being sent to the Groq API.

---

#### Third layer: Each message object

```ts
z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content is too long'),
})
```

Each element of the `messages` array must be an **object** with exactly two properties:

##### `role`

```ts
z.enum(['user', 'assistant', 'system'])
```

Must be one of three specific strings:

| Value | Meaning |
|---|---|
| `'user'` | A message from the human user |
| `'assistant'` | A message from the AI assistant |
| `'system'` | A system instruction that sets the assistant's behavior |

Any other string (e.g., `'admin'`, `'bot'`, `''`) causes validation to fail.

##### `content`

```ts
z.string()
  .min(1, 'Content cannot be empty')
  .max(10000, 'Content is too long')
```

Must be a **string** that is:

- **At least 1 character** — Empty strings are not allowed.
- **At most 10,000 characters** — Prevents excessively long messages.

---

### How validation works at runtime

The controller calls:

```ts
const validationResult = chatRequestSchema.safeParse(req.body);
```

`safeParse` returns one of two shapes:

**Success case:**

```ts
{
  success: true,
  data: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' }
    ]
  }
}
```

`data` contains the validated, typed data. The controller destructures `messages` from `data`.

**Failure case:**

```ts
{
  success: false,
  error: ZodError  // contains details about what failed
}
```

`error.format()` produces a nested object showing which fields failed:

```json
{
  "messages": {
    "0": {
      "content": {
        "_errors": ["Content cannot be empty"]
      }
    }
  }
}
```

This detailed error is sent in the 400 response, allowing the frontend (or developer) to identify exactly which field caused the failure.

---

### Validation examples

| Input | Valid? | Reason |
|---|---|---|
| `{ messages: [{ role: 'user', content: 'Hello' }] }` | ✅ Yes | Correct structure |
| `{ messages: [] }` | ❌ No | Array is empty (min 1) |
| `{ messages: [{ role: 'user', content: '' }] }` | ❌ No | Content is empty (min 1 char) |
| `{ messages: [{ role: 'admin', content: 'Hi' }] }` | ❌ No | 'admin' is not a valid role |
| `{ messages: [{ content: 'Hi' }] }` | ❌ No | Missing `role` |
| `{ }` | ❌ No | Missing `messages` |
| `"hello"` | ❌ No | Not an object |
| `{ messages: [{ role: 'user', content: 'x'.repeat(10001) }] }` | ❌ No | Content exceeds 10,000 chars |

---

## Frontend Impact

- Defines the contract that the frontend must follow when sending chat requests.
- If the frontend sends invalid data, this schema produces a detailed 400 error that the frontend displays.
- The constraints (max 10,000 characters per message, max 100 messages) set practical limits on what the frontend can send.
- The allowed roles (`'user'`, `'assistant'`, `'system'`) must match the roles the frontend uses in its message objects.
