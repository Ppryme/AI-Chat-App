# services/ — Service Layer Overview

## Purpose

The `services/` folder contains modules that encapsulate interactions with **external APIs** or other external resources. A service module creates and exports a configured client that the rest of the backend can use without needing to know the configuration details.

In this backend, there is one service file:

- **`groq.service.ts`** — Creates and exports a configured Groq SDK client.

## Where Services Fit In The Backend

```
Controller (chat.controller.ts)
       ↓
Service (groq.service.ts)
       ↓
External API (Groq Cloud)
```

Services are the **deepest layer** of the backend. They are called by controllers but do not call back into the controller or route layers.

## Architectural Role

The service layer serves two purposes:

1. **Encapsulation** — The Groq SDK client is created once, configured with the API key, and exported. The controller does not need to know how the client is initialized.
2. **Testability** — By isolating the API client in its own module, it can be mocked or replaced during testing without modifying the controller.

The service layer in this backend is minimal: it creates a single client instance. In a larger application, this layer might include retry logic, response transformation, caching, or multiple API client modules.

## Frontend Impact

- The service layer is invisible to the frontend. The frontend does not know which AI provider the backend uses.
- If the Groq API key is invalid or the Groq service is down, errors originate from this layer and propagate through the controller to the frontend.
