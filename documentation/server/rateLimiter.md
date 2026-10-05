# rateLimiter.ts

## 1. Purpose

`rateLimiter.ts` creates and exports **two rate-limiting middleware functions** that protect the backend from excessive requests:

1. **`limiter`** — Burst protection. Limits each IP to **10 requests per minute**.
2. **`dailyLimiter`** — Sustained usage protection. Limits each IP to **200 requests per day**.

Both middleware functions are applied to all chat routes in `chat.routes.ts`. They run **before** the controller, so rejected requests never reach the Groq API.

## 2. Where It Fits Into The Backend

### Files that use this file

- **`chat.routes.ts`** imports both `limiter` and `dailyLimiter` and applies them with `router.use()`.

### Files this file imports

| Import | From | Purpose |
|---|---|---|
| `rateLimit` | `express-rate-limit` | Factory function that creates rate-limiting middleware |

### Position in the request flow

```
Express app-level middleware (helmet, cors, json)
       ↓
chat.routes.ts
  ├─ limiter (this file)      ← runs first
  ├─ dailyLimiter (this file) ← runs second
  └─ streamChat (controller)  ← only reached if both pass
```

### Why this file exists as a separate component

1. **Reusability** — If the backend had more routes, these limiters could be applied to any of them.
2. **Configurability** — Rate limit values can be changed in one place without touching route or controller code.
3. **Separation of concerns** — Rate limiting is a cross-cutting concern, not specific to chat business logic.

---

## 3. Imports

### `rateLimit` from `express-rate-limit`

```ts
import rateLimit from 'express-rate-limit';
```

- **What is being imported:** The `rateLimit` factory function, which is the **default export** of the `express-rate-limit` package.
- **Why it is needed:** It creates Express middleware functions that track and limit request rates.
- **Where it comes from:** The `express-rate-limit` npm package (version `^8.7.0` in `package.json`).
- **How it is used:** Called twice with different configurations to create `limiter` and `dailyLimiter`.

#### Syntax: Default import

```ts
import rateLimit from 'express-rate-limit';
```

No curly braces — this imports the module's default export. The name `rateLimit` is chosen by the developer.

---

## 4. Code Walkthrough

### Burst protection limiter

#### Code

```ts
// Burst protection
export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Syntax

- **`export const limiter`** — Declares a constant named `limiter` and exports it as a named export.
- **`rateLimit({...})`** — Calls the factory function with a configuration object. Returns an Express middleware function.
- **`1 * 60 * 1000`** — An arithmetic expression: 1 minute × 60 seconds × 1000 milliseconds = 60,000 milliseconds. Written this way for readability.

#### Purpose

Protects against **burst abuse** — a client sending many requests in a short period. A limit of 10 per minute prevents rapid-fire requests that could overwhelm the Groq API or exhaust the API key's rate limit.

#### Configuration explained

| Option | Value | Meaning |
|---|---|---|
| `windowMs` | `60000` (1 minute) | The time window in milliseconds. Request counts reset after each window. |
| `max` | `10` | Maximum number of requests allowed per window per IP address. |
| `message` | `{ error: 'Too many requests, ...' }` | The JSON response body sent when the limit is exceeded. |
| `standardHeaders` | `true` | Adds `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers to every response. |
| `legacyHeaders` | `false` | Disables deprecated `X-RateLimit-*` headers. |

#### Runtime behavior

1. When the middleware is applied (`router.use(limiter)`), it intercepts every request.
2. It identifies the client by IP address.
3. It increments a counter for that IP.
4. If the counter is ≤ 10, the request passes through (`next()` is called).
5. If the counter exceeds 10, the middleware responds with:
   - HTTP status `429 Too Many Requests`.
   - Body: `{ "error": "Too many requests, please try again later." }`.
   - The request never reaches the controller.
6. After 60 seconds, the counter resets to 0.

#### How the counter is stored

By default, `express-rate-limit` stores counters in **memory** (an in-memory store). This means:

- Counters are lost when the server restarts.
- Counters are not shared across multiple server instances.
- This is appropriate for a single-server development or small-scale deployment.

---

### Daily protection limiter

#### Code

```ts
// Sustained usage protection
export const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours window
  max: 200, // Limit each IP to 200 requests per day
  message: { error: 'Daily request limit exceeded. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Syntax

Identical syntax to `limiter` above, with different configuration values.

#### Purpose

Protects against **sustained abuse** over a longer period. Even if a client stays within the 10/minute burst limit, they cannot make more than 200 requests in a 24-hour period. This protects the Groq API key from being exhausted by persistent usage.

#### Configuration explained

| Option | Value | Meaning |
|---|---|---|
| `windowMs` | `86400000` (24 hours) | The time window in milliseconds. |
| `max` | `200` | Maximum requests per day per IP. |
| `message` | `{ error: 'Daily request limit exceeded. ...' }` | JSON response for exceeded daily limit. |
| `standardHeaders` | `true` | Sends standard rate limit headers. |
| `legacyHeaders` | `false` | Disables legacy headers. |

#### Runtime behavior

Same as `limiter`, but with a 24-hour window and 200-request maximum. The counter resets 24 hours after the first request in the window.

---

### How both limiters work together

Because both are applied with `router.use()` in `chat.routes.ts`, **both** must pass for a request to reach the controller:

```
Request arrives
       ↓
limiter: Is this IP under 10/min?
  ├─ No  → 429 response, request stops
  └─ Yes → continue
       ↓
dailyLimiter: Is this IP under 200/day?
  ├─ No  → 429 response, request stops
  └─ Yes → continue
       ↓
Controller (streamChat)
```

A request is only blocked by the **first** limiter that it violates. If `limiter` blocks the request, `dailyLimiter` never runs for that request (but it still tracks the request in its counter).

> **Note:** `express-rate-limit` increments its counter **when the request arrives**, not when the response is sent. So even blocked requests are counted by both limiters.

---

### Rate limit headers

Because `standardHeaders: true` is set, every response includes:

| Header | Meaning | Example |
|---|---|---|
| `RateLimit-Limit` | Maximum requests allowed in the window | `10` |
| `RateLimit-Remaining` | Requests remaining in the current window | `7` |
| `RateLimit-Reset` | Seconds until the window resets | `45` |

These headers allow the frontend to potentially display rate limit information, though the current frontend does not use them.

---

## Frontend Impact

- Determines whether the frontend's request is allowed to proceed or receives a `429` error.
- The `429` response includes a human-readable error message that the frontend can display to the user.
- Protects the Groq API key from being exhausted, ensuring the service remains available for all users.
- The per-minute limit (10) prevents accidental rapid-fire requests from the frontend (e.g., double-clicking the send button).
- The daily limit (200) sets an upper bound on how much a single user can use the service per day.
