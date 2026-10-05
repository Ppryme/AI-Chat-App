# schemas/ — Validation Schema Layer Overview

## Purpose

The `schemas/` folder contains **Zod validation schemas** that define the expected shape and constraints of data entering the backend. A schema acts as a contract: if the incoming data matches the schema, it is safe to use; if it does not match, the request is rejected with detailed error information.

In this backend, there is one schema file:

- **`chat.schema.ts`** — Defines the validation rules for the chat request payload.

## What Is Zod?

Zod is a TypeScript-first schema validation library. It allows you to define a schema (a description of what valid data looks like) and then validate data against it at runtime. Key features used in this backend:

- `z.object({})` — Validates that the data is an object with specific keys.
- `z.array()` — Validates that a value is an array.
- `z.string()` — Validates that a value is a string.
- `z.enum([...])` — Validates that a value is one of a specific set of strings.
- `.min()` / `.max()` — Validates length constraints.
- `.safeParse()` — Validates data without throwing an error; returns `{ success, data, error }`.

## Where Schemas Fit In The Backend

```
Controller (chat.controller.ts)
       ↓
Schema (chat.schema.ts)
       ↓
If valid → proceed to Groq API call
If invalid → return 400 error
```

Schemas are **used by** controllers. They are not Express middleware — they are plain functions/objects that the controller calls explicitly.

## Architectural Role

The schema layer provides:

1. **Runtime type safety** — TypeScript types are erased at runtime. Zod schemas provide actual runtime validation.
2. **Centralized validation rules** — All validation logic for a request type is in one place.
3. **Descriptive error messages** — Zod generates structured error objects that explain exactly what failed.
4. **Reusability** — The same schema could be used in tests, documentation generators, or other parts of the backend.

## Frontend Impact

- If the frontend sends data that does not match the schema, it receives a `400 Bad Request` response with detailed field-level error information.
- The schema constraints (max content length: 10,000 characters, max messages: 100) effectively set limits that the frontend should respect.
