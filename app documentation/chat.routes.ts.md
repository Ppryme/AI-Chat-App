# chat.routes.ts

## Purpose of the File
`chat.routes.ts` defines the Express router for AI chat inference and streaming endpoints (`/api/chat`). It mounts the streaming and structured response endpoints, protected by both burst and daily rate limiting middleware.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `Router` from `express`.
- **L2**: Imports controller handlers `streamChat` and `structuredChat` from `../controllers/chat.controller.ts`.
- **L3**: Imports rate limiters `limiter` (burst) and `dailyLimiter` (daily quota) from `../middleware/rateLimiter.ts`.
- **L5**: Instantiates an Express `Router` object.
- **L8–L9**: Applies `limiter` and `dailyLimiter` middleware to all endpoints on this router.
- **L11**: `router.post('/stream', streamChat)`: Mounts POST endpoint for streaming chat completions via SSE with PostgreSQL persistence.
- **L12**: `router.post('/structured', structuredChat)`: Mounts POST endpoint for JSON schema structured output.
- **L14**: Exports router as default export.
