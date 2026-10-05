# groq.service.ts

## 1. Purpose

`groq.service.ts` creates and exports a **configured Groq SDK client** instance. This is the service layer's only file, and its only job is to:

1. Load environment variables from the `.env` file.
2. Create a `Groq` client instance with the API key.
3. Export the client so other files can use it.

This file does **not** contain any API call logic. It only sets up the client. The actual API calls are made in `chat.controller.ts`.

## 2. Where It Fits Into The Backend

### Files that use this file

- **`chat.controller.ts`** imports the `groq` client and calls `groq.chat.completions.create()`.

### Files this file imports

| Import | From | Purpose |
|---|---|---|
| `Groq` | `groq-sdk` | The Groq SDK class used to create a client instance |
| `dotenv` | `dotenv` | Loads environment variables from the `.env` file |

### Position in the request flow

```
chat.controller.ts
       ↓
groq.service.ts (provides the `groq` client)
       ↓
Groq Cloud API (external)
```

This file is the **deepest layer** of the backend. It does not import any other backend files.

### Why this file exists as a separate component

Isolating the Groq client in its own module provides:

1. **Single responsibility** — The controller does not need to know how the Groq client is configured.
2. **Single instance** — The client is created once at module load time and reused for every request. Node.js caches module exports, so importing this file multiple times always returns the same `groq` instance.
3. **Mockability** — In tests, this module can be mocked to return a fake client without making real API calls.

---

## 3. Imports

### `Groq` from `groq-sdk`

```ts
import Groq from 'groq-sdk';
```

- **What is being imported:** The `Groq` class, which is the **default export** of the `groq-sdk` package.
- **Why it is needed:** To create a Groq API client instance.
- **Where it comes from:** The `groq-sdk` npm package (version `^0.5.0` in `package.json`).
- **How it is used:** Called as `new Groq({ apiKey: ... })` on line 6.

#### Syntax: Default import

```ts
import Groq from 'groq-sdk';
```

This is a **default import**. There are no curly braces, which means it imports the module's default export. The name `Groq` is chosen by the developer and can be anything (e.g., `import GroqClient from 'groq-sdk'` would also work). By convention, it matches the class name.

---

### `dotenv` from `dotenv`

```ts
import dotenv from 'dotenv';
```

- **What is being imported:** The `dotenv` library, which reads `.env` files and loads their contents into `process.env`.
- **Why it is needed:** The Groq API key is stored in the `.env` file. Without `dotenv`, `process.env.GROQ_API_KEY` would be `undefined`.
- **Where it comes from:** The `dotenv` npm package (version `^16.6.1` in `package.json`).
- **How it is used:** Called as `dotenv.config()` on line 4.

---

## 4. Code Walkthrough

### Loading environment variables

#### Code

```ts
dotenv.config();
```

#### Syntax

- **`dotenv.config()`** — Calls the `config()` method on the `dotenv` module. This is a synchronous function call that executes immediately.

#### Purpose

Reads the `.env` file in the current working directory and adds its key-value pairs to `process.env`. After this call:

- `process.env.PORT` is `"5000"`
- `process.env.GROQ_API_KEY` is the Groq API key string

#### Runtime behavior

1. `dotenv` looks for a file named `.env` in the current working directory.
2. It reads the file contents.
3. It parses each line as `KEY=VALUE`.
4. It sets each key-value pair on `process.env`, but **does not overwrite** existing environment variables.
5. This call is synchronous — it blocks until the file is fully read.

> **Note:** `dotenv.config()` is also called in `server.ts`. Both calls are safe because `dotenv` does not overwrite existing values. The call here ensures that even if this module is loaded before `server.ts` runs its `dotenv.config()`, the API key is available.

#### Relationship to other files

- The `.env` file in the `server/` directory contains the `GROQ_API_KEY` and `PORT` variables.
- `server.ts` also calls `dotenv.config()`. Both calls load the same `.env` file.

---

### Creating and exporting the Groq client

#### Code

```ts
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
```

#### Syntax

- **`export const groq`** — Declares a constant named `groq` and exports it as a **named export**.
- **`new Groq({...})`** — The `new` keyword creates a new instance of the `Groq` class. The `Groq` constructor takes a configuration object.
- **`apiKey: process.env.GROQ_API_KEY`** — Passes the API key from environment variables to the Groq constructor.
- **`process.env.GROQ_API_KEY`** — `process.env` is a global Node.js object that contains all environment variables as string properties. `GROQ_API_KEY` was loaded by `dotenv.config()` above.

#### Purpose

Creates a single, reusable Groq API client that is pre-configured with the API key. Any file that imports `groq` gets this same instance and can call Groq API methods on it.

#### Runtime behavior

1. `process.env.GROQ_API_KEY` is read. If the `.env` file was loaded correctly, this is the API key string. If the `.env` file is missing or the key is not set, this is `undefined`.
2. `new Groq({ apiKey: ... })` creates a new Groq client instance. The SDK stores the API key internally and uses it for all subsequent API calls.
3. The client is assigned to `groq` and exported. Because Node.js caches module exports, this code runs **exactly once**, no matter how many files import `groq`.

#### What happens if the API key is missing

If `GROQ_API_KEY` is not set in the `.env` file, `process.env.GROQ_API_KEY` is `undefined`. The Groq SDK may:

- Throw an error immediately during construction.
- Accept `undefined` and fail later when an API call is made (returning an authentication error).

The exact behavior depends on the Groq SDK version, but in either case, the error will eventually propagate to the `catch` block in `chat.controller.ts`.

#### Relationship to other files

- `chat.controller.ts` imports `groq` and calls `groq.chat.completions.create()` to make API requests.
- The `.env` file provides the `GROQ_API_KEY` value.

---

## Environment Variables Used

| Variable | Source | Purpose |
|---|---|---|
| `GROQ_API_KEY` | `server/.env` | Authenticates requests to the Groq Cloud API |

---

## Frontend Impact

- This file is invisible to the frontend. The frontend does not know that Groq is the AI provider.
- If the API key is invalid or missing, the Groq API call in `chat.controller.ts` will fail, and the frontend will receive an error response.
- The frontend's experience is entirely dependent on this file working correctly: no valid Groq client = no AI responses.
