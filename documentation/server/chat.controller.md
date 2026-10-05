# chat.controller.ts

## 1. Purpose

`chat.controller.ts` is the **core logic file** of the backend. It contains the `streamChat` function, which:

1. Validates the incoming request body using a Zod schema.
2. Configures the HTTP response for Server-Sent Events (SSE).
3. Calls the Groq API to create a streaming chat completion.
4. Iterates over the stream, forwarding each content chunk to the frontend as an SSE event.
5. Sends token usage data and a `[DONE]` signal when the stream finishes.
6. Handles errors that occur before or during streaming.

This is the only controller in the backend, and it contains the most complex logic.

## 2. Where It Fits Into The Backend

### Files that use this file

- **`chat.routes.ts`** imports the `streamChat` function and maps it to `POST /stream`.

### Files this file imports

| Import | From | Purpose |
|---|---|---|
| `Request`, `Response` | `express` | TypeScript types for the Express request and response objects |
| `chatRequestSchema` | `../schemas/chat.schema.ts` | Zod schema used to validate `req.body` |
| `groq` | `../services/groq.service.ts` | Configured Groq SDK client instance |

### Position in the request flow

```
chat.routes.ts
       ↓
chat.controller.ts (streamChat)
  ├── Uses: chat.schema.ts (validation)
  └── Uses: groq.service.ts (API call)
       ↓
SSE response → Frontend
```

### Why this file exists as a separate component

Separating the controller from the route keeps the route file thin and focused on URL mapping. The controller can be tested independently by passing mock `req` and `res` objects.

---

## 3. Imports

### `Request` and `Response` from `express`

```ts
import { type Request, type Response } from 'express';
```

- **What is being imported:** TypeScript **type definitions** for Express's request and response objects.
- **Why they are needed:** They provide type annotations for the `req` and `res` parameters in the `streamChat` function, enabling autocompletion and type checking.
- **Where they come from:** The `express` package, with type definitions provided by `@types/express` in devDependencies.
- **How they are used:** As type annotations: `(req: Request, res: Response)`.

#### Syntax: `type` keyword in imports

```ts
import { type Request, type Response } from 'express';
```

The `type` keyword before `Request` and `Response` tells TypeScript that these imports are **types only**. They are completely erased during compilation to JavaScript and produce no runtime code. This is a TypeScript feature called "type-only imports." Without the `type` keyword, the imports would still work, but including it makes the intent explicit: these are used only for type checking, not as values.

---

### `chatRequestSchema` from `chat.schema.ts`

```ts
import { chatRequestSchema } from '../schemas/chat.schema.ts';
```

- **What is being imported:** A Zod schema object that defines the expected structure of the chat request body.
- **Why it is needed:** To validate `req.body` before using its data. This ensures the messages array has the correct shape, roles, and content lengths.
- **Where it comes from:** `../schemas/chat.schema.ts` — the schema file in the `schemas/` folder.
- **How it is used:** Called as `chatRequestSchema.safeParse(req.body)` on line 7.

---

### `groq` from `groq.service.ts`

```ts
import { groq } from '../services/groq.service.ts';
```

- **What is being imported:** A pre-configured instance of the Groq SDK client.
- **Why it is needed:** To call the Groq API's chat completions endpoint.
- **Where it comes from:** `../services/groq.service.ts` — the service file that creates the Groq client with the API key.
- **How it is used:** Called as `groq.chat.completions.create({...})` on line 27.

---

## 4. Code Walkthrough

### Function declaration

#### Code

```ts
export const streamChat = async (req: Request, res: Response) => {
```

#### Syntax

- **`export`** — Makes `streamChat` available for import by other files.
- **`const`** — Declares a constant variable. The function reference cannot be reassigned.
- **`streamChat`** — The name of the function.
- **`async`** — Marks this function as asynchronous. It can use `await` inside its body and implicitly returns a `Promise`.
- **`(req: Request, res: Response)`** — Two parameters with TypeScript type annotations:
  - `req: Request` — The Express request object. Contains `req.body` (the parsed JSON payload), `req.headers`, `req.params`, etc.
  - `res: Response` — The Express response object. Used to set headers, write data, and end the response.
- **`=>`** — Arrow function syntax. This is equivalent to `function streamChat(req, res) { ... }` but with lexical `this` binding.

#### Purpose

This is the **only exported function** in this file. It is the Express route handler for `POST /api/chat/stream`. When a request arrives at this endpoint (after passing through rate limiters), Express calls this function.

#### Runtime behavior

Express calls `streamChat(req, res)` with the incoming request and a response object. Because the function is `async`, Express does not automatically handle the returned Promise. The `try/catch` inside the function handles all errors.

---

### Try block and validation

#### Code

```ts
try {
    const validationResult = chatRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: validationResult.error.format(),
      });
    }
```

#### Syntax

- **`try { ... } catch (error) { ... }`** — A try/catch block. If any statement inside `try` throws an error (including a rejected `await`), execution jumps to the `catch` block.
- **`chatRequestSchema.safeParse(req.body)`** — Calls the Zod schema's `safeParse` method. Unlike `parse()`, `safeParse()` does **not** throw on invalid data. It returns an object:
  - On success: `{ success: true, data: { messages: [...] } }`
  - On failure: `{ success: false, error: ZodError }`
- **`!validationResult.success`** — The `!` negates the boolean. If `success` is `false`, this condition is `true`.
- **`return res.status(400).json({...})`** — Sets the HTTP status to 400 (Bad Request) and sends a JSON response body. The `return` stops further execution of the function.
- **`validationResult.error.format()`** — Formats the Zod error into a nested object showing which fields failed and why.

#### Purpose

Validation is the **first thing** the controller does. Before setting SSE headers, before calling the Groq API, the incoming data is validated. This prevents malformed data from reaching the external API.

#### Runtime behavior

1. `req.body` (already parsed by `express.json()`) is passed to `safeParse()`.
2. Zod checks: Is it an object? Does it have a `messages` key? Is `messages` an array of 1–100 objects? Does each object have `role` (one of 'user', 'assistant', 'system') and `content` (string, 1–10,000 chars)?
3. If any check fails, `success` is `false` and the 400 response is sent.
4. If all checks pass, `success` is `true` and `data` contains the validated, typed data.

#### Relationship to other files

- `chatRequestSchema` is defined in `schemas/chat.schema.ts`.
- The validation error response is sent directly to the frontend. The frontend's `useChat` hook handles non-OK responses by reading the error JSON.

---

### Extracting validated data

#### Code

```ts
    const { messages } = validationResult.data;
```

#### Syntax

- **`const { messages } = validationResult.data`** — **Destructuring assignment**. This extracts the `messages` property from `validationResult.data` and assigns it to a new constant called `messages`. It is equivalent to:
  ```ts
  const messages = validationResult.data.messages;
  ```

#### Purpose

Extracts the validated `messages` array from the Zod result. After this line, `messages` is a typed array of `{ role, content }` objects that is guaranteed to be valid.

#### Runtime behavior

This line only executes if validation succeeded (because the function returns early on failure). The `messages` variable now holds the conversation history that will be forwarded to the Groq API.

---

### Setting SSE headers

#### Code

```ts
    // SSE headers
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();
```

#### Syntax

- **`res.status(200)`** — Sets the HTTP status code to 200 (OK). This must be called before headers are sent.
- **`res.setHeader(name, value)`** — Sets a single HTTP response header.
- **`res.flushHeaders()`** — Sends the status line and headers to the client **immediately**, without waiting for body data. This is critical for SSE: the browser needs to receive headers before any events arrive.

#### Purpose

These headers establish a **Server-Sent Events** connection:

| Header | Value | Purpose |
|---|---|---|
| `Content-Type` | `text/event-stream; charset=utf-8` | Tells the browser this is an SSE stream |
| `Cache-Control` | `no-cache, no-transform` | Prevents caching of the stream by browsers or proxies |
| `Connection` | `keep-alive` | Keeps the TCP connection open for streaming |
| `X-Accel-Buffering` | `no` | Tells reverse proxies (e.g., Nginx) not to buffer the response |

#### Runtime behavior

1. `res.status(200)` sets the status code internally.
2. The four `setHeader` calls set headers internally.
3. `res.flushHeaders()` writes the HTTP status line and all headers to the TCP socket. After this call, `res.headersSent` becomes `true`.
4. The client (browser) receives the headers and can begin reading SSE events as they arrive.

#### Relationship to other files

- The frontend's `useChat` hook checks `response.ok` (which is `true` for status 200) before reading the stream body.
- The `Content-Type: text/event-stream` header is essential for the frontend's SSE parser to work correctly.

---

### Creating the Groq stream

#### Code

```ts
    const stream = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      stream: true,
    });
```

#### Syntax

- **`await`** — Pauses execution of this `async` function until the Promise returned by `groq.chat.completions.create()` resolves. If the Promise rejects (e.g., network error), the error is thrown and caught by the `catch` block.
- **`groq.chat.completions.create({...})`** — Calls the Groq SDK's chat completions endpoint.
- **Object shorthand: `messages`** — Inside the object literal, `messages` is shorthand for `messages: messages`. The property name matches the variable name.
- **`stream: true`** — Tells the Groq SDK to return an **async iterable** instead of waiting for the full response.

#### Purpose

This initiates the AI text generation. The Groq API receives the full conversation history and begins generating a response. Because `stream: true` is set, the response arrives in small chunks rather than as a single large payload.

#### Runtime behavior

1. The Groq SDK sends an HTTPS request to the Groq cloud API with the model name, messages, temperature, max tokens, and streaming flag.
2. The `await` pauses the function until the connection is established and the first chunk is ready.
3. The returned `stream` is an **async iterable** — an object that can be used in a `for await...of` loop.
4. If the Groq API is unreachable, the API key is invalid, or any network error occurs, the Promise rejects and the error is caught by the `catch` block.

#### API parameters explained

| Parameter | Value | Meaning |
|---|---|---|
| `model` | `'openai/gpt-oss-120b'` | The AI model to use. This is a 120-billion parameter open-source model hosted on Groq's infrastructure. |
| `messages` | The validated array | The conversation history. The Groq API uses this to generate a contextually appropriate response. |
| `temperature` | `0.5` | Controls randomness. 0 = deterministic, 1 = more creative. 0.5 is moderately creative. |
| `max_tokens` | `2048` | Maximum number of tokens (roughly words) the AI can generate in its response. |
| `stream` | `true` | Enables streaming. The response arrives as a series of small chunks. |

#### Relationship to other files

- `groq` is the Groq SDK client instance created in `services/groq.service.ts`.
- The `messages` variable came from the Zod validation above, which used the schema from `schemas/chat.schema.ts`.

---

### Tracking usage data

#### Code

```ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let totalUsage: any = null;
```

#### Syntax

- **`// eslint-disable-next-line @typescript-eslint/no-explicit-any`** — An ESLint directive that suppresses the "no explicit `any`" warning for the next line only.
- **`let`** — Declares a variable that **can** be reassigned (unlike `const`).
- **`: any`** — A TypeScript type annotation. `any` means "any type is allowed." This opts out of type checking for this variable.
- **`= null`** — Initializes the variable to `null`.

#### Purpose

This variable accumulates the token usage data that the Groq API sends. Usage data (prompt tokens, completion tokens, total tokens) is typically included in one of the final chunks. Because the Groq SDK's type for usage data may not be fully typed, `any` is used.

#### Runtime behavior

The variable starts as `null`. If the Groq stream includes a chunk with `x_groq.usage`, the variable is set to that usage object. If no usage data is sent, it remains `null`.

---

### Streaming loop

#### Code

```ts
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? '';
      if (chunk.x_groq?.usage) totalUsage = chunk.x_groq.usage;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
```

#### Syntax

- **`for await (const chunk of stream)`** — An **async for...of loop**. It iterates over an async iterable (the Groq stream). Each iteration `await`s the next chunk. The loop ends when the stream signals completion.
- **`chunk.choices[0]?.delta?.content`** — **Optional chaining** (`?.`). If `choices[0]` is `undefined`, or `delta` is `undefined`, the expression short-circuits to `undefined` instead of throwing a `TypeError`. This is defensive programming for cases where a chunk may not contain content.
- **`?? ''`** — **Nullish coalescing operator**. If the left side is `null` or `undefined`, use the right side (`''`). This ensures `content` is always a string.
- **`chunk.x_groq?.usage`** — Checks for Groq-specific usage metadata using optional chaining.
- **`` `data: ${JSON.stringify({ content })}\n\n` ``** — A **template literal** (backtick string) that embeds expressions with `${...}`. This creates an SSE-formatted event.
- **`res.write(...)`** — Writes data to the HTTP response stream **without closing it**. This is how SSE events are sent incrementally.

#### Purpose

This is the **heart of the streaming logic**. It reads each chunk from the Groq API, extracts the text content, and immediately writes it to the frontend as an SSE event. This allows the frontend to display the AI's response as it is being generated, rather than waiting for the entire response.

#### Runtime behavior

1. The loop `await`s the next chunk from the Groq stream.
2. It extracts `content` from `chunk.choices[0].delta.content`. If the chunk has no content (e.g., it's a metadata-only chunk), `content` is `''`.
3. If the chunk has usage data (`x_groq.usage`), it is saved to `totalUsage`.
4. If `content` is non-empty (truthy), it is serialized to JSON and written as an SSE `data:` event.
5. The `\n\n` at the end is the **SSE event delimiter**. The SSE protocol requires a blank line between events.
6. This repeats until the stream ends.

#### SSE event format

Each event sent to the frontend looks like:

```
data: {"content":"Hello"}

```

The `data:` prefix is required by the SSE specification. The browser's event source parser uses it to identify event data. The double newline separates events.

#### Relationship to other files

- The `stream` object comes from the Groq SDK call above.
- Each `res.write()` sends data directly to the frontend, where the `eventsource-parser` in `useChat.ts` parses it.

---

### Sending usage data and closing the stream

#### Code

```ts
    if (totalUsage) res.write(`data: ${JSON.stringify({ usage: totalUsage })}\n\n`);

    res.write(`data: [DONE]\n\n`);
    res.end();
```

#### Syntax

- **`if (totalUsage)`** — Checks if `totalUsage` is truthy (not `null`). If usage data was captured during streaming, it is sent.
- **`res.write(...)`** — Writes additional SSE events to the response.
- **`res.end()`** — Signals that no more data will be written. This closes the HTTP connection.

#### Purpose

After all content chunks have been streamed:

1. **Usage event** — If the Groq API provided token usage data, it is sent as a separate SSE event. The frontend uses this to display token counts.
2. **`[DONE]` signal** — The `data: [DONE]` event is a convention (used by OpenAI and Groq APIs) to indicate the stream has ended. The frontend's parser checks for this literal string.
3. **Connection close** — `res.end()` terminates the HTTP response.

#### Runtime behavior

1. If `totalUsage` is not `null`, a usage event is written: `data: {"usage":{"prompt_tokens":...,...}}\n\n`.
2. The `[DONE]` event is always written: `data: [DONE]\n\n`.
3. `res.end()` flushes any remaining data and closes the TCP connection.
4. The frontend's `reader.read()` receives `{ done: true }` after the connection closes.

#### Relationship to other files

- The frontend's `useChat.ts` parser checks `if (data === '[DONE]')` and sets `streamDoneRef.current = true`.
- The frontend's `useChat.ts` parser checks `if (parsed.usage)` and updates token usage state.

---

### Error handling

#### Code

```ts
  } catch (error) {
    console.error('Streaming Error:', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Connection Failed.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Connection failed' })}\n\n`);
      res.end();
    }
  }
```

#### Syntax

- **`catch (error)`** — Catches any error thrown inside the `try` block, including rejected `await` Promises.
- **`console.error('Streaming Error:', error)`** — Logs the error to the server's terminal.
- **`res.headersSent`** — A boolean property on the Express response object. It is `true` if `res.flushHeaders()`, `res.write()`, or `res.end()` has been called.
- **`!res.headersSent`** — Checks if headers have **not** been sent yet.

#### Purpose

Error handling is split into two cases because the response format depends on whether streaming has started:

1. **Headers not sent** (error before streaming): A regular JSON error response can be sent with status 500.
2. **Headers already sent** (error during streaming): The status code and Content-Type have already been sent. The only way to communicate an error is to write an SSE error event into the existing stream.

#### Runtime behavior

**Case 1: Error before `flushHeaders()`** (rare in this flow, because `flushHeaders()` runs before `groq.chat.completions.create()`):

1. `res.status(500).json({ error: 'Connection Failed.' })` sends a 500 response with JSON body.
2. The frontend's `response.ok` check returns `false`, and the frontend reads the error JSON.

**Case 2: Error after `flushHeaders()`** (more common — e.g., Groq API error during streaming):

1. `res.write(...)` sends an SSE event with `{ error: 'Connection failed' }`.
2. `res.end()` closes the connection.
3. The frontend's parser detects the `error` field in the parsed JSON and throws an error in the `useChat` hook.

#### Relationship to other files

- Errors logged with `console.error` appear in the terminal where the server is running.
- The frontend's `useChat.ts` handles both error formats: JSON error responses (from case 1) and SSE error events (from case 2).

---

## 5. Complete Function Summary: `streamChat`

| Property | Value |
|---|---|
| **Name** | `streamChat` |
| **Type** | `async (req: Request, res: Response) => Promise<void>` (implicitly) |
| **Parameters** | `req: Request` — Express request object; `res: Response` — Express response object |
| **Return type** | `Promise<void>` (implicit — async functions always return a Promise; this function does not return a meaningful value) |
| **Exported** | Yes (`export const`) |
| **Used by** | `chat.routes.ts` maps it to `POST /stream` |

### Execution order

1. Validate `req.body` with Zod `safeParse`.
2. If invalid: return 400 JSON response. **Function ends.**
3. Extract `messages` from validated data.
4. Set SSE headers and flush them.
5. Call Groq SDK to create streaming completion.
6. Initialize `totalUsage` to `null`.
7. Loop: for each chunk in the stream:
   - Extract content text.
   - Save usage data if present.
   - Write content as SSE event.
8. After loop: write usage event (if available).
9. Write `[DONE]` event.
10. Close connection with `res.end()`.

### Error scenarios

| Error | Where it occurs | How it is handled |
|---|---|---|
| Zod validation failure | Step 1 | 400 JSON response |
| Groq API unreachable | Step 5 (`await` rejects) | Caught by `catch`. Since `flushHeaders()` ran at step 4, headers are already sent. SSE error event is written. |
| Groq stream error | Step 7 (`for await` throws) | Caught by `catch`. Headers already sent. SSE error event is written. |
| Unexpected error | Any step | Caught by `catch`. Response depends on `res.headersSent`. |

### Why it is async

The function is `async` because it uses `await` in two places:

1. `await groq.chat.completions.create({...})` — Waits for the Groq SDK to establish the streaming connection.
2. `for await (const chunk of stream)` — Waits for each chunk to arrive from the stream.

Both operations involve network I/O that takes an unpredictable amount of time. `async/await` allows Node.js to handle other requests while waiting for these operations.

If either `await` is rejected (the underlying Promise is rejected), the error is thrown and caught by the `catch` block.

---

## Frontend Impact

- Receives the chat request from the React frontend's `useChat` hook.
- Validates the conversation history before sending it to the Groq API.
- Streams the AI-generated response back to the browser as SSE events.
- Sends token usage data that the frontend displays.
- Sends the `[DONE]` signal that tells the frontend the stream has ended.
- Handles errors gracefully, sending either JSON errors or SSE error events depending on the streaming state.
- Directly determines the format of every piece of data the frontend receives from the backend.
