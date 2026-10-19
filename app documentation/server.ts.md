# server.ts

## Purpose of the File
`server.ts` is the main entry point and configuration hub for the Express backend application. It initializes middleware (Helmet for HTTP security headers, CORS origin verification, JSON body parsing), exposes a health check endpoint, mounts chat and conversation route handlers, exports the application for Vercel Serverless Functions, and boots the HTTP server while testing database connectivity via `testConnection()`.

---

## Line-by-Line Code Breakdown

- **L1–L4**: Imports `express`, `cors`, `dotenv` for configuration, and `helmet` for security headers.
- **L7–L9**: Imports route modules `chatRoutes`, `conversationRoutes`, and `testConnection` from `./db/pool.ts`.
- **L11**: Invokes `dotenv.config()` to read environment variables.
- **L13**: Instantiates Express application `app`.
- **L14**: Registers `helmet()` middleware to set security-focused HTTP headers.
- **L16–L21**: Resolves `clientUrl` from `process.env.CLIENT_URL` and builds the `allowedOrigins` Set containing `http://localhost:5173` and the configured client URL.
- **L23–L44**: Configures CORS middleware with origin validator:
  - Allows requests with no origin header (curl, mobile, server-to-server).
  - Allows matching origins from `allowedOrigins`.
  - Allows any `.vercel.app` preview or production domain.
  - Safely blocks other origins by passing `false` to callback without throwing 500 exceptions.
  - Sets `credentials: true`.
- **L46**: Registers `express.json({ limit: '2mb' })` to parse JSON request bodies up to 2MB.
- **L49–L51**: Defines health check route `GET ['/api/health', '/health']` returning status OK and ISO timestamp for deployment verification.
- **L54–L58**: Mounts routers with and without `/api` prefix for routing flexibility:
  - `/api/chat` and `/chat` mapped to `chatRoutes`.
  - `/api/chats` and `/chats` mapped to `conversationRoutes`.
- **L61**: Exports `app` as default export for Vercel Serverless Function runtime.
- **L63–L67**: Reads `PORT` (defaulting to 5000), starts the HTTP listener with `app.listen(PORT, ...)`, logs the URL, and invokes `testConnection()` to verify PostgreSQL database connectivity.
