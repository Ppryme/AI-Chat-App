# server.ts — Backend Overview

## A. Backend Purpose

This backend is a lightweight **Express.js HTTP server written in TypeScript** that powers a real-time AI chat application. It acts as a **secure proxy** between a React frontend and the **Groq API** (a cloud-hosted large language model inference service).

### What it does

- Receives chat messages from the React frontend.
- Validates incoming request payloads.
- Forwards validated messages to the Groq API.
- Streams the AI-generated response back to the browser in real time using **Server-Sent Events (SSE)**.
- Protects the Groq API key by keeping it server-side.
- Enforces rate limiting to prevent abuse.

### What problem it solves

The frontend cannot call the Groq API directly because:

1. **API key security** — The Groq API key would be exposed in the browser.
2. **Request validation** — There is no trusted place to validate user input on the client alone.
3. **Rate limiting** — Abuse protection must happen on a server that controls access.
4. **Streaming** — The backend transforms the Groq SDK's async-iterable stream into an SSE stream that the browser's `fetch` API can consume.

### What role it plays

The backend is the **only point of contact** between the frontend and the Groq API. Every chat interaction flows through it.

---

## B. Backend Folder Structure

```
server/
├── server.ts                  # Entry point — creates and configures the Express app
├── .env                       # Environment variables (PORT, GROQ_API_KEY)
├── package.json               # Dependencies and scripts
├── routes/
│   └── chat.routes.ts         # Defines HTTP endpoints for chat functionality
├── controllers/
│   └── chat.controller.ts     # Request handler — validation, streaming, error handling
├── services/
│   └── groq.service.ts        # Groq SDK client instance
├── middleware/
│   └── rateLimiter.ts         # Rate limiting middleware (per-minute and daily)
└── schemas/
    └── chat.schema.ts         # Zod validation schema for chat request payloads
```

### Why these responsibilities are separated

| Folder | Responsibility | Why it is separate |
|---|---|---|
| `routes/` | Maps HTTP methods and paths to handler functions | Keeps URL structure decoupled from business logic |
| `controllers/` | Contains the actual request-handling logic | Separates "what to do" from "where to listen" |
| `services/` | Encapsulates external API clients | Allows swapping or mocking the Groq client without touching controllers |
| `middleware/` | Cross-cutting concerns (rate limiting) | Can be applied to any route independently |
| `schemas/` | Data validation rules | Keeps validation logic reusable and testable outside of controllers |

This separation follows a **layered architecture** where each layer has a single responsibility and depends only on the layer below it.

---

## C. Architecture

The backend follows a **Route → Middleware → Controller → Service → External API** pattern:

```
Frontend (React)
       │
       │  POST /api/chat/stream
       │  Content-Type: application/json
       │  Body: { messages: [...] }
       ▼
┌─────────────────────────┐
│     Express Server      │
│     (server.ts)         │
│                         │
│  helmet()               │  ← Security headers
│  cors()                 │  ← CORS policy
│  express.json()         │  ← JSON body parsing
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Rate Limiters       │
│   (rateLimiter.ts)      │
│                         │
│  limiter   (10/min)     │
│  dailyLimiter (200/day) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Route               │
│  (chat.routes.ts)       │
│                         │
│  POST /stream           │
│  → streamChat()         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Controller          │
│  (chat.controller.ts)   │
│                         │
│  1. Validate with Zod   │
│  2. Set SSE headers     │
│  3. Call Groq API       │
│  4. Stream chunks       │
│  5. Send [DONE]         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Service             │
│  (groq.service.ts)      │
│                         │
│  Groq SDK client        │
│  API key from .env      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Groq Cloud API      │
│  (External Service)     │
│                         │
│  Model: openai/gpt-     │
│         oss-120b        │
│  Streaming response     │
└─────────────────────────┘
```

---

## D. Complete Request Lifecycle

This section traces an actual chat request from the moment the user clicks "Send" to the moment the response finishes rendering in the browser.

### Step 1 — Frontend sends the request

The React frontend's `useChat` hook calls:

```ts
fetch('http://localhost:5000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: updatedMessages }),
  signal: controller.signal,
});
```

The `messages` array contains the full conversation history, including a system message, all previous user and assistant messages, and the new user message.

### Step 2 — Express receives the request

`server.ts` has mounted `chatRoutes` at `/api/chat`:

```ts
app.use('/api/chat', chatRoutes);
```

Before the request reaches the route, three app-level middleware functions execute in order:

1. **`helmet()`** — Sets security-related HTTP headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`).
2. **`cors({ origin: 'http://localhost:5173' })`** — Only allows requests from the Vite dev server.
3. **`express.json({ limit: '1mb' })`** — Parses the JSON body and rejects payloads larger than 1 MB.

### Step 3 — Rate limiters execute

Inside `chat.routes.ts`, two rate-limiting middleware functions run before the route handler:

1. **`limiter`** — Allows a maximum of **10 requests per minute** per IP address.
2. **`dailyLimiter`** — Allows a maximum of **200 requests per day** per IP address.

If either limit is exceeded, Express responds immediately with a **429 Too Many Requests** status and an error JSON body. The request never reaches the controller.

### Step 4 — Route dispatches to the controller

The route file maps `POST /stream` to the `streamChat` controller function:

```ts
router.post('/stream', streamChat);
```

Because the route is mounted at `/api/chat`, the full path is `POST /api/chat/stream`.

### Step 5 — Controller validates the request

The `streamChat` function uses the Zod schema `chatRequestSchema` to validate `req.body`:

```ts
const validationResult = chatRequestSchema.safeParse(req.body);
```

`safeParse` does **not** throw an error on invalid data. Instead it returns an object with a `success` boolean. If validation fails, the controller responds with `400 Bad Request` and formatted error details. The request stops here.

### Step 6 — SSE headers are set

If validation passes, the controller sets HTTP headers to establish a **Server-Sent Events** connection:

```ts
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');
res.flushHeaders();
```

`flushHeaders()` sends the headers to the client immediately, before any body data. This tells the browser that a streaming response has begun.

### Step 7 — Groq API is called

The controller calls the Groq SDK to create a streaming chat completion:

```ts
const stream = await groq.chat.completions.create({
  model: 'openai/gpt-oss-120b',
  messages,
  temperature: 0.5,
  max_tokens: 2048,
  stream: true,
});
```

The `stream: true` option tells the Groq SDK to return an **async iterable** instead of waiting for the complete response.

### Step 8 — Chunks are streamed to the frontend

The controller iterates over the stream using `for await...of`:

```ts
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content ?? '';
  if (chunk.x_groq?.usage) totalUsage = chunk.x_groq.usage;
  if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
}
```

Each chunk with content is written to the response as an SSE `data:` event. The double newline (`\n\n`) is the SSE protocol delimiter that tells the browser "this event is complete."

### Step 9 — Usage data and termination signal

After the stream finishes:

1. If Groq provided token usage data, it is sent as a final data event.
2. A `data: [DONE]` event is sent to signal the end of the stream.
3. `res.end()` closes the HTTP connection.

```ts
if (totalUsage) res.write(`data: ${JSON.stringify({ usage: totalUsage })}\n\n`);
res.write(`data: [DONE]\n\n`);
res.end();
```

### Step 10 — Frontend processes the stream

The frontend's `useChat` hook reads the response body with a `ReadableStream` reader and feeds chunks into an `eventsource-parser`. When a `data:` event arrives:

- If the data is `[DONE]`, the frontend marks the stream as complete.
- If the data contains `{ content: "..." }`, the text is appended to a buffer.
- If the data contains `{ usage: {...} }`, token counts are saved to state.
- A display timer drains the buffer character-by-character to create a typing animation.

### Flow Diagram

```
User clicks Send
       ↓
POST /api/chat/stream
       ↓
helmet() → cors() → express.json()
       ↓
limiter (10/min) → dailyLimiter (200/day)
       ↓
chat.routes.ts → POST /stream
       ↓
chat.controller.ts → streamChat()
       ↓
Zod validation (chatRequestSchema)
       ↓ (pass)
Set SSE headers → flushHeaders()
       ↓
groq.chat.completions.create() [stream: true]
       ↓
for await (chunk of stream)
  → res.write(data: {content}) per chunk
       ↓
res.write(data: {usage})
       ↓
res.write(data: [DONE])
       ↓
res.end()
       ↓
Frontend displays response with typing animation
```

---

## E. Data Flow

### What enters the backend

A JSON object with a single key `messages`:

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "What is TypeScript?" }
  ]
}
```

Each message has:
- `role` — One of `"user"`, `"assistant"`, or `"system"`.
- `content` — A string between 1 and 10,000 characters.

The array must have between 1 and 100 messages.

### How data is transformed

1. **Parsing** — `express.json()` parses the raw HTTP body into a JavaScript object.
2. **Validation** — `chatRequestSchema.safeParse()` validates the object's shape, types, and constraints.
3. **Extraction** — The `messages` array is destructured from the validated data.
4. **Forwarding** — The `messages` array is passed directly to the Groq SDK (no transformation).
5. **Streaming** — The Groq API returns chunks. Each chunk's `delta.content` string is extracted and wrapped in a JSON SSE event.

### What leaves the backend

A series of SSE events:

```
data: {"content":"Type"}

data: {"content":"Script"}

data: {"content":" is"}

data: {"content":" a ..."}

data: {"usage":{"prompt_tokens":25,"completion_tokens":150,"total_tokens":175}}

data: [DONE]
```

The backend does **not** store any messages. It is completely stateless.

---

## F. Error Flow

### Validation fails

**Trigger:** The request body does not match the Zod schema (missing `messages`, wrong types, empty content, too many messages, etc.).

**What happens:**

```ts
return res.status(400).json({
  error: 'Invalid request payload',
  details: validationResult.error.format(),
});
```

The response is a `400 Bad Request` with structured error details. The Groq API is never called.

### Rate limit is exceeded

**Trigger:** A client IP exceeds 10 requests/minute or 200 requests/day.

**What happens:**

The `express-rate-limit` middleware automatically responds with:

```json
{ "error": "Too many requests, please try again later." }
```

or

```json
{ "error": "Daily request limit exceeded. Please try again tomorrow." }
```

HTTP status: `429 Too Many Requests`. The controller is never reached.

### External API fails (before streaming starts)

**Trigger:** The `groq.chat.completions.create()` call throws an error (network failure, invalid API key, Groq service down).

**What happens:** Because `flushHeaders()` has already been called, the controller checks `res.headersSent`:

- If headers have **not** been sent (unlikely in this flow, but handled): responds with `500` JSON error.
- If headers **have** already been sent: writes an error SSE event and closes the connection.

```ts
if (!res.headersSent) {
  res.status(500).json({ error: 'Connection Failed.' });
} else {
  res.write(`data: ${JSON.stringify({ error: 'Connection failed' })}\n\n`);
  res.end();
}
```

### Streaming fails mid-stream

**Trigger:** The Groq stream throws an error during iteration (network interruption, API timeout).

**What happens:** The `for await` loop throws, the catch block executes, and because headers have already been sent, an error event is written to the SSE stream:

```ts
res.write(`data: ${JSON.stringify({ error: 'Connection failed' })}\n\n`);
res.end();
```

The frontend's parser detects the `error` field and displays the error to the user.

### Malformed data is received

**Trigger:** The body is not valid JSON, or does not match the expected schema.

**What happens:**

- If the body is not valid JSON, `express.json()` responds with a `400` error before the request even reaches the route.
- If the body is valid JSON but fails schema validation, the Zod `safeParse` returns `success: false`, and the controller returns a `400` response with details.

### Unexpected server error

**Trigger:** Any uncaught error inside `streamChat`.

**What happens:** The `try/catch` block catches it. The same `headersSent` check applies. The error is logged to the server console.

---

## G. Security

### Implemented security measures

| Mechanism | Implementation | Purpose |
|---|---|---|
| **Helmet** | `app.use(helmet())` in `server.ts` | Sets security HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| **CORS** | `app.use(cors({ origin: 'http://localhost:5173' }))` | Only allows requests from the Vite development server |
| **Body size limit** | `express.json({ limit: '1mb' })` | Prevents excessively large payloads |
| **Rate limiting (burst)** | `limiter` — 10 requests/minute per IP | Prevents rapid-fire abuse |
| **Rate limiting (sustained)** | `dailyLimiter` — 200 requests/day per IP | Prevents sustained abuse over time |
| **Input validation** | Zod schema validates message structure, roles, content length, and array size | Prevents malformed or malicious data from reaching the Groq API |
| **API key protection** | `GROQ_API_KEY` stored in `.env`, loaded via `dotenv` | API key never exposed to the browser |
| **Standard headers** | `standardHeaders: true` on rate limiters | Sends `RateLimit-*` headers so clients know their limits |
| **Legacy header suppression** | `legacyHeaders: false` on rate limiters | Disables deprecated `X-RateLimit-*` headers |

### Security measures NOT currently implemented

| Missing Mechanism | Risk |
|---|---|
| **Authentication / Authorization** | Any client that knows the URL can send requests. There is no user login or API token. |
| **HTTPS** | The server runs over plain HTTP. In production, traffic would be unencrypted. |
| **`.env` in `.gitignore`** | The `.env` file containing the Groq API key is present in the repository. If this repository is public, the API key is exposed. |
| **Request logging / audit trail** | There is no request logging beyond `console.error` for errors. |
| **Input sanitization** | Content strings are validated for length but not sanitized for injection attacks. (This is less critical because the content is forwarded to an LLM API, not inserted into a database or HTML.) |
| **Helmet CSP** | Helmet is used with default settings. A Content Security Policy is not explicitly configured. |

---

## H. Frontend Relationship

### What does this backend provide to the frontend?

The backend provides a **single API endpoint** that the React frontend uses:

**`POST /api/chat/stream`**

- **Input:** A JSON body containing the conversation history (`messages` array).
- **Output:** An SSE stream of text chunks that the frontend renders progressively as a typing animation.
- **Error output:** Either a JSON error response (if the error occurs before streaming) or an SSE error event (if the error occurs during streaming).
- **Token usage:** A usage event at the end of the stream with prompt, completion, and total token counts.

The frontend does **not** interact with the Groq API directly. All AI communication is mediated by this backend.

---

## Backend In One Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│                                                                  │
│   useChat hook → fetch POST /api/chat/stream                     │
│   ReadableStream reader → eventsource-parser → typing animation  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │ HTTP POST (JSON body)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Express Server (server.ts)                     │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐                   │
│  │ helmet() │→ │  cors()  │→ │ express.json()│                   │
│  └──────────┘  └──────────┘  └───────┬───────┘                   │
│                                      │                           │
│                                      ▼                           │
│  ┌───────────────────────────────────────────────────────┐       │
│  │              Rate Limiters (rateLimiter.ts)            │       │
│  │   limiter (10/min)  →  dailyLimiter (200/day)         │       │
│  └───────────────────────────┬───────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │              Route (chat.routes.ts)                    │       │
│  │   POST /stream → streamChat()                         │       │
│  └───────────────────────────┬───────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │            Controller (chat.controller.ts)             │       │
│  │   1. Zod validation (chat.schema.ts)                   │       │
│  │   2. Set SSE headers                                   │       │
│  │   3. Create Groq stream (groq.service.ts)              │       │
│  │   4. Stream chunks via res.write()                     │       │
│  │   5. Send [DONE], res.end()                            │       │
│  └───────────────────────────┬───────────────────────────┘       │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ HTTPS (Groq SDK)
                               ▼
                  ┌─────────────────────────┐
                  │      Groq Cloud API     │
                  │  Model: openai/gpt-     │
                  │         oss-120b        │
                  │  Streaming response     │
                  └─────────────────────────┘
```

### Key Responsibilities

- **`server.ts`** — Application entry point. Configures Express middleware (Helmet, CORS, JSON parsing), mounts routes, starts the HTTP server.
- **`chat.routes.ts`** — Defines the `POST /stream` endpoint. Applies rate-limiting middleware. Delegates to the controller.
- **`rateLimiter.ts`** — Exports two `express-rate-limit` middleware instances: burst protection (10/min) and sustained protection (200/day).
- **`chat.controller.ts`** — The core logic. Validates input with Zod, sets SSE headers, creates a Groq streaming request, writes chunks to the response, handles errors.
- **`groq.service.ts`** — Creates and exports a single Groq SDK client instance, configured with the API key from environment variables.
- **`chat.schema.ts`** — Defines the Zod validation schema for the chat request payload (messages array with role, content, length constraints).

### Request Flow

1. User types a message and clicks Send in the React frontend.
2. The `useChat` hook sends a `POST` request to `http://localhost:5000/api/chat/stream` with the full conversation history.
3. Express processes the request through `helmet()`, `cors()`, and `express.json()`.
4. The `limiter` middleware checks the per-minute rate limit. If exceeded, responds with `429`.
5. The `dailyLimiter` middleware checks the daily rate limit. If exceeded, responds with `429`.
6. The route dispatches the request to the `streamChat` controller function.
7. The controller validates `req.body` against the Zod schema. If invalid, responds with `400`.
8. SSE headers are set and flushed to the client.
9. The Groq SDK creates a streaming chat completion request to the Groq cloud API.
10. The controller iterates over the async stream, writing each content chunk as an SSE `data:` event.
11. After the stream finishes, token usage is sent (if available), followed by `data: [DONE]`.
12. The connection is closed with `res.end()`.
13. The frontend's parser processes each SSE event, buffers content, and renders it with a typing animation.

### Frontend ↔ Backend Relationship

The React frontend and Express backend communicate through a **single HTTP endpoint** (`POST /api/chat/stream`). The frontend sends the full conversation history as JSON. The backend validates it, forwards it to the Groq AI service, and streams the response back as Server-Sent Events. The frontend reads the stream using a `ReadableStream` reader, parses SSE events with the `eventsource-parser` library, and displays the AI's reply progressively with a character-by-character animation. The backend is completely **stateless** — it does not store conversations, sessions, or user data.
