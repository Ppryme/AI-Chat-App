# vercel.json

## Purpose of the File
`vercel.json` provides the monorepo deployment routing and service orchestration configuration for Vercel. It declares two co-located services—the frontend Vite application and the Express backend server—and defines routing rewrite rules directing `/api/*` traffic to the backend server and all remaining frontend routes to the React single-page application.

---

## Line-by-Line Code Breakdown

- **L2**: Specifies `$schema: "https://openapi.vercel.sh/vercel.json"` for IDE JSON schema validation and autocomplete.
- **L3–L12**: Defines the `services` dictionary declaring multi-project micro-services:
  - **L4–L7**: `app`: Specifies the frontend root (`"."`) managed by the `vite` framework.
  - **L8–L11**: `server`: Specifies the backend server directory (`"server"`) managed by the `express` framework.
- **L13–L26**: Defines URL `rewrites` rules:
  - **L14–L19**: Routes any request matching `/api/(.*)` directly to the `server` service.
  - **L20–L25**: Routes all other client requests matching `/(.*)` to the `app` frontend service for client-side routing.
