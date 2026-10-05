# routes/ — Route Layer Overview

## Purpose

The `routes/` folder contains files that define the **HTTP endpoints** (URLs and methods) that the backend exposes. A route file maps a specific URL path and HTTP method to a handler function, and optionally attaches middleware that should run before the handler.

In this backend, there is one route file:

- **`chat.routes.ts`** — Defines the `POST /stream` endpoint under the `/api/chat` prefix.

## Where Routes Fit In The Backend

Routes are the **entry point for incoming HTTP requests** after Express's app-level middleware (Helmet, CORS, JSON parsing) has executed. They sit between the middleware layer and the controller layer:

```
Express app-level middleware
       ↓
Route (chat.routes.ts)
  ├── Route-level middleware (rate limiters)
  └── Controller function (streamChat)
       ↓
Controller logic
```

## Architectural Role

The route layer is deliberately thin. It does **not** contain business logic, validation logic, or data transformation. Its only job is:

1. Define which URLs exist.
2. Define which HTTP methods are accepted at each URL.
3. Attach middleware that should run before the handler.
4. Point to the correct controller function.

This separation means you can change URL paths or add/remove middleware without modifying any controller code.

## How Routes Are Mounted

In `server.ts`, the chat routes are mounted at the `/api/chat` prefix:

```ts
app.use('/api/chat', chatRoutes);
```

This means every route defined inside `chat.routes.ts` is automatically prefixed with `/api/chat`. When `chat.routes.ts` defines `router.post('/stream', streamChat)`, the full URL becomes:

```
POST /api/chat/stream
```

## Frontend Impact

- The `routes/` layer defines the exact URL (`/api/chat/stream`) that the frontend's `fetch` call targets.
- If this route did not exist, the frontend would receive a `404 Not Found` response.
- The rate limiters attached at the route level protect the frontend from accidentally overwhelming the backend.
