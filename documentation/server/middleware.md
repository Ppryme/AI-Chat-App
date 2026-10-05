# middleware/ — Middleware Layer Overview

## Purpose

The `middleware/` folder contains **Express middleware functions** — functions that execute during the request/response cycle **before** the final route handler (controller) runs. Middleware can inspect, modify, or reject requests.

In this backend, there is one middleware file:

- **`rateLimiter.ts`** — Exports two rate-limiting middleware instances (per-minute and per-day).

## What Is Express Middleware?

An Express middleware function has access to three arguments:

- `req` — The incoming request object.
- `res` — The outgoing response object.
- `next` — A function that passes control to the next middleware or route handler.

A middleware can:

1. **Pass the request along** by calling `next()`.
2. **Reject the request** by sending a response (e.g., `res.status(429).json(...)`) and **not** calling `next()`.
3. **Modify the request** by attaching data to `req` before calling `next()`.

## Where Middleware Fits In The Backend

There are two levels of middleware in this backend:

### App-level middleware (defined in `server.ts`)

These run on **every** request:

1. `helmet()` — Sets security headers.
2. `cors({ origin: 'http://localhost:5173' })` — Enforces CORS policy.
3. `express.json({ limit: '1mb' })` — Parses JSON bodies.

### Route-level middleware (defined in `chat.routes.ts`)

These run only on requests that match the `/api/chat` route prefix:

1. `limiter` — Per-minute rate limiter.
2. `dailyLimiter` — Per-day rate limiter.

```
Every request
       ↓
helmet() → cors() → express.json()
       ↓
Requests to /api/chat/*
       ↓
limiter → dailyLimiter
       ↓
Route handler (controller)
```

## Architectural Role

Middleware handles **cross-cutting concerns** — things that apply broadly across routes and are not specific to any single business operation. Rate limiting is a perfect example: it applies the same logic regardless of what the endpoint does.

By placing rate limiting in the `middleware/` folder, it remains:

- **Reusable** — The same limiters could be applied to other routes if they existed.
- **Configurable** — Rate limits can be changed without touching the controller.
- **Testable** — The middleware can be tested independently.

## Frontend Impact

- The rate limiters determine whether the frontend's request is allowed to proceed or receives a `429 Too Many Requests` error.
- Rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) are sent to the frontend, allowing it to display rate limit information if desired (though the current frontend does not use these headers).
