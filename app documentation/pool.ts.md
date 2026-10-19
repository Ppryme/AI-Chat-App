# pool.ts

## Purpose of the File
`pool.ts` manages the PostgreSQL connection infrastructure using `pg.Pool`. It loads environment variables (`DATABASE_URL`), configures connection pooling parameters (max connections, idle timeouts), handles SSL negotiation for cloud providers like Supabase, handles client errors, and exposes a connection testing diagnostic utility.

---

## Line-by-Line Code Breakdown

- **L1**: Imports default `pg` PostgreSQL driver package.
- **L2**: Imports `dotenv` to parse environment variables from `.env`.
- **L4**: Calls `dotenv.config()` to load environment variables into `process.env`.
- **L6**: Destructures `Pool` class constructor from `pg`.
- **L8**: Reads `connectionString` from `process.env.DATABASE_URL`.
- **L10–L12**: Emits critical console error if `DATABASE_URL` is undefined.
- **L14–L15**: Evaluates `isRemoteDb` boolean flag detecting whether the database URL targets remote hosted instances (e.g. `supabase.com` or `sslmode=require`).
- **L17–L23**: Instantiates and exports `pool` with connection parameters:
  - `connectionString`: PostgreSQL connection URI.
  - `ssl`: Conditionally enables SSL with `{ rejectUnauthorized: false }` for remote providers.
  - `max: 10`: Limits pool size to a maximum of 10 concurrent database connections.
  - `idleTimeoutMillis: 30000`: Closes idle clients after 30 seconds.
  - `connectionTimeoutMillis: 5000`: Aborts queries if a connection cannot be acquired within 5 seconds.
- **L25–L27**: Registers event listener on `pool.on('error', ...)` to log unexpected client disconnects without crashing the server process.
- **L29–L41**: Defines and exports `testConnection()` async diagnostic function: connects a client from the pool, executes `SELECT NOW() AS current_time`, releases the client back to the pool, logs connection status, and returns a boolean.
