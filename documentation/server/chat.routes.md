# chat.routes.ts

## 1. Purpose

`chat.routes.ts` defines the **HTTP endpoints** for the chat feature. It creates an Express `Router`, attaches rate-limiting middleware, and maps the `POST /stream` path to the `streamChat` controller function.

This is the file that determines **what URLs exist** on the backend for chat functionality and **what middleware runs** before the controller is reached.

## 2. Where It Fits Into The Backend

### Files that use this file

- **`server.ts`** imports the default export of this file and mounts it at `/api/chat`:
  ```ts
  app.use('/api/chat', chatRoutes);
  ```

### Files this file imports

| Import | From | Purpose |
|---|---|---|
| `Router` | `express` | Creates a modular, mountable set of route handlers |
| `streamChat` | `../controllers/chat.controller.ts` | The controller function that handles chat requests |
| `limiter` | `../middleware/rateLimiter.ts` | Per-minute rate limiter (10 requests/min) |
| `dailyLimiter` | `../middleware/rateLimiter.ts` | Per-day rate limiter (200 requests/day) |

### Position in the request flow

```
Express app-level middleware (helmet, cors, json)
       ↓
chat.routes.ts
  ├─ limiter (rateLimiter.ts)
  ├─ dailyLimiter (rateLimiter.ts)
  └─ streamChat (chat.controller.ts)
       ↓
Controller logic
```

### Why this file exists as a separate component

Separating routes from controllers allows the URL structure to change independently of the handler logic. If you wanted to add a second endpoint (e.g., `POST /complete` for non-streaming), you would add it here without modifying the controller for the existing endpoint.

---

## 3. Imports

### `Router` from `express`

```ts
import { Router } from 'express';
```

- **What is being imported:** The `Router` class from the Express library.
- **Why it is needed:** `Router` creates a mini-application that can define its own routes and middleware. It acts as a modular, self-contained group of route handlers.
- **Where it comes from:** The `express` npm package, listed as a dependency in `server/package.json`.
- **How it is used:** Called as `Router()` on line 5 to create a new router instance. Routes and middleware are then attached to this instance.

#### Syntax: Named import

```ts
import { Router } from 'express';
```

The curly braces `{ Router }` indicate a **named import**. This imports a specific export named `Router` from the `express` module, not the default export. This is JavaScript/TypeScript ES module import syntax.

---

### `streamChat` from `chat.controller.ts`

```ts
import { streamChat } from '../controllers/chat.controller.ts';
```

- **What is being imported:** The `streamChat` function, which is the controller that handles streaming chat requests.
- **Why it is needed:** The route needs to know **which function to call** when a request arrives at `POST /stream`.
- **Where it comes from:** `../controllers/chat.controller.ts` — the chat controller file, one directory up and then into the `controllers/` folder.
- **How it is used:** Passed as the second argument to `router.post('/stream', streamChat)` on line 11.

---

### `limiter` and `dailyLimiter` from `rateLimiter.ts`

```ts
import { limiter, dailyLimiter } from '../middleware/rateLimiter.ts';
```

- **What is being imported:** Two Express middleware functions for rate limiting.
- **Why they are needed:** They must run before the controller to reject requests that exceed the allowed rate.
- **Where they come from:** `../middleware/rateLimiter.ts` — the rate limiter middleware file.
- **How they are used:** Applied to the router with `router.use(limiter)` and `router.use(dailyLimiter)` on lines 8–9.

#### Syntax: Destructured named imports

```ts
import { limiter, dailyLimiter } from '../middleware/rateLimiter.ts';
```

This imports **two** named exports from a single module in one statement. Each name (`limiter`, `dailyLimiter`) must match an export name in the source file.

---

## 4. Code Walkthrough

### Creating the router

#### Code

```ts
const router = Router();
```

#### Syntax

- **`const`** — Declares a variable that cannot be reassigned. The variable `router` will always point to this specific Router instance.
- **`Router()`** — Calling `Router` as a function (not with `new`) creates a new Express Router instance. This is a factory function pattern.

#### Purpose

Creates a new, empty router that will hold the chat-related routes and middleware. This router is later mounted at `/api/chat` in `server.ts`.

#### Runtime behavior

When this line executes (at module load time), Express creates an internal router object. No HTTP server is started and no routes are registered yet.

#### Relationship to other files

The `router` object created here is the same object that `server.ts` mounts with `app.use('/api/chat', chatRoutes)`. The name `chatRoutes` in `server.ts` refers to this object.

---

### Applying rate limiters

#### Code

```ts
// Apply rate limiters to all chat routes
router.use(limiter);
router.use(dailyLimiter);
```

#### Syntax

- **`router.use(middleware)`** — Registers a middleware function that runs on **every** request handled by this router, regardless of HTTP method or path. This is router-level middleware (as opposed to app-level middleware registered with `app.use()`).

#### Purpose

Ensures that every request to any chat endpoint must pass through both rate limiters before reaching the controller. The order matters:

1. `limiter` runs first. If the per-minute limit is exceeded, it responds with 429 and the request stops.
2. `dailyLimiter` runs second. If the per-day limit is exceeded, it responds with 429 and the request stops.

Only if both limiters allow the request does it proceed to the route handler.

#### Runtime behavior

These lines do not execute any rate limiting immediately. They register the middleware functions in the router's middleware stack. The actual rate limiting happens later, when an HTTP request arrives.

#### Relationship to other files

- `limiter` and `dailyLimiter` are created and configured in `middleware/rateLimiter.ts`.
- The rate limiters use `express-rate-limit` internally. They track request counts per IP address using an in-memory store.

---

### Defining the POST route

#### Code

```ts
router.post('/stream', streamChat);
```

#### Syntax

- **`router.post(path, handler)`** — Registers a route handler that only responds to **HTTP POST** requests at the specified path.
- **`'/stream'`** — The path relative to where the router is mounted. Since `server.ts` mounts this router at `/api/chat`, the full path is `/api/chat/stream`.
- **`streamChat`** — The handler function. Express will call `streamChat(req, res)` when a POST request matches this path.

#### Purpose

This is the only endpoint in the entire backend. It maps `POST /api/chat/stream` to the `streamChat` controller function.

#### Runtime behavior

When a `POST` request arrives at `/api/chat/stream`:

1. Express matches the method (`POST`) and path (`/stream` under `/api/chat`).
2. The router's middleware stack executes (`limiter` then `dailyLimiter`).
3. If both pass, Express calls `streamChat(req, res)`.

If the HTTP method is not `POST` (e.g., `GET /api/chat/stream`), Express does **not** match this route and responds with `404 Not Found`.

#### Relationship to other files

- `streamChat` is the exported async function from `controllers/chat.controller.ts`. It receives the Express `req` and `res` objects.

---

### Exporting the router

#### Code

```ts
export default router;
```

#### Syntax

- **`export default`** — Makes the `router` object the **default export** of this module. When another file imports this module without curly braces (e.g., `import chatRoutes from './routes/chat.routes.ts'`), it gets this router.

#### Purpose

Allows `server.ts` to import and mount this router:

```ts
import chatRoutes from './routes/chat.routes.ts';
app.use('/api/chat', chatRoutes);
```

#### Runtime behavior

The `router` object, with its middleware and route already attached, is made available to any file that imports this module.

#### Relationship to other files

- `server.ts` is the only file that imports this module. It uses the imported router to mount the chat routes at `/api/chat`.

---

## Frontend Impact

- Defines the URL `POST /api/chat/stream` that the frontend calls with `fetch()`.
- Applies rate limiting that determines whether the frontend's request is allowed to proceed.
- Connects the frontend's request to the `streamChat` controller that produces the SSE response.
- If this file did not exist, the frontend would receive a `404 Not Found` for all chat requests.
