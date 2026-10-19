# rateLimiter.ts

## Purpose of the File
`rateLimiter.ts` configures request throttling middleware using `express-rate-limit`. It provides two layers of protection against denial-of-service, abuse, and runaway API costs: a short-window burst limiter and a 24-hour daily usage limiter.

---

## Line-by-Line Code Breakdown

- **L1**: Imports default `rateLimit` factory from `express-rate-limit`.
- **L3–L10**: `limiter`: Burst rate limiter protecting against rapid request spikes:
  - `windowMs: 1 * 60 * 1000`: 1-minute tracking window.
  - `max: 10`: Limits each IP address to 10 requests per minute.
  - `message`: Returns `{ error: 'Too many requests, please try again later.' }` upon limit breach.
  - `standardHeaders: true` and `legacyHeaders: false`: Emits modern `RateLimit-*` HTTP headers.
- **L12–L19**: `dailyLimiter`: Sustained quota limiter preventing quota exhaustion:
  - `windowMs: 24 * 60 * 60 * 1000`: 24-hour tracking window.
  - `max: 100`: Caps each IP address at 100 requests per day.
  - `message`: Returns `{ error: 'Daily request limit exceeded. Please try again tomorrow.' }`.
