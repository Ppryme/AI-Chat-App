# controllers/ — Controller Layer Overview

## Purpose

The `controllers/` folder contains the **request handler functions** that execute when an HTTP request reaches a specific route. A controller function receives the Express `req` (request) and `res` (response) objects and contains the core logic for:

1. Validating the incoming data.
2. Calling the appropriate service.
3. Formatting and sending the response.
4. Handling errors.

In this backend, there is one controller file:

- **`chat.controller.ts`** — Contains the `streamChat` function that handles chat streaming requests.

## Where Controllers Fit In The Backend

```
Route (chat.routes.ts)
       ↓
Controller (chat.controller.ts)
  ├── Uses: chat.schema.ts (validation)
  └── Uses: groq.service.ts (external API)
       ↓
Response sent to frontend
```

Controllers are called **by** routes and they **call** services. They are the middle layer that connects incoming HTTP requests to the backend's business logic.

## Architectural Role

The controller layer is where the following concerns converge:

- **Validation** — The controller uses the Zod schema to validate `req.body` before proceeding.
- **Response formatting** — The controller sets SSE headers and writes SSE-formatted events.
- **Error handling** — The controller wraps all logic in `try/catch` and handles both pre-stream and mid-stream errors.
- **Orchestration** — The controller coordinates the interaction between validation, the Groq service, and the response.

Controllers do **not** directly instantiate API clients — that responsibility belongs to the `services/` layer. Controllers also do **not** define URL paths — that belongs to the `routes/` layer.

## Frontend Impact

- The controller determines the format of every response the frontend receives (SSE events with `{ content }`, `{ usage }`, `{ error }`, and `[DONE]`).
- If the controller's validation logic rejects a request, the frontend receives a `400` error with details.
- If the controller encounters an error during streaming, the frontend receives an SSE error event.
