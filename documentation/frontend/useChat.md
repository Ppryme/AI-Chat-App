# useChat Hook

> Complete developer documentation for [`useChat.ts`](file:///c:/Users/hp/llm-fundamentals/src/hooks/useChat.ts)

---

## 1. Purpose of useChat

### What is a custom React hook?

A custom React hook is a regular JavaScript/TypeScript function whose name starts with `use`. This naming convention tells React that the function is allowed to call other React hooks (`useState`, `useRef`, `useEffect`, `useCallback`, etc.) inside it.

Custom hooks exist so that you can extract reusable logic **out of** a component and into a standalone function. Any component that calls the hook gets its own isolated copy of the hook's state and refs.

### What responsibility does useChat have?

`useChat` is the **central nervous system** of the chat feature. It is responsible for:

1. **Sending** the user's message to the Express backend via `fetch`.
2. **Receiving** the assistant's streamed response as Server-Sent Events (SSE).
3. **Buffering** incoming stream content so the UI can display it progressively (typing effect).
4. **Updating** the Zustand store so React components automatically re-render with new messages.
5. **Controlling** scroll behavior — auto-scrolling to new content and showing a "scroll to bottom" button.
6. **Cancelling** an in-flight request when the user or the component lifecycle demands it.
7. **Handling errors** from the network, the backend, and the SSE stream.
8. **Tracking token usage** received from the backend.

### Why does this logic belong in a hook?

If this logic lived directly inside a component, that component would be enormous and impossible to maintain. By putting it in a hook:

- The component stays focused on **rendering UI**.
- The hook stays focused on **logic and side effects**.
- The hook can be reused in different components if needed.
- Testing the logic becomes easier because it is separated from JSX.

### What frontend responsibilities does this hook handle?

- Reading and writing Zustand store state (messages, input, loading, token usage, scroll button visibility).
- Making the HTTP request to the backend.
- Parsing the SSE stream.
- Running a timed display loop that creates the typing animation effect.
- Managing scroll position and auto-scroll.
- Providing `handleSubmit` and `stopGeneration` functions for the UI.
- Cleaning up resources (aborting fetch, clearing timers) on unmount.

### What backend responsibilities does this hook NOT handle?

- It does **not** validate the message content (the backend does this with Zod).
- It does **not** call the Groq API (the backend controller does this).
- It does **not** manage rate limiting (the backend middleware does this).
- It does **not** format SSE events (the backend controller writes them).
- It does **not** manage API keys (the backend reads `GROQ_API_KEY` from `.env`).

---

## 2. Where useChat Fits

`useChat` is a bridge that connects six layers of the application:

```
React UI  (App.tsx, ChatInput, ChatMessage, ScrollButton)
    ↓ calls useChat(), uses returned refs/handlers
useChat()
    ↓ reads from and writes to
Zustand store  (chatStore.ts)
    ↓ fetch() sends HTTP POST
Express backend  (server.ts → chat.routes.ts → rateLimiter → chat.controller.ts)
    ↓ controller calls
Groq SDK  (groq.service.ts → Groq API)
    ↓ streams response chunks
Express sends SSE events back to fetch's ReadableStream
    ↓ useChat reads the stream
SSE parser → bufferRef → display loop → setMessages()
    ↓ Zustand updates
React re-renders  (ChatMessage shows the new content)
```

### Connection 1: useChat ↔ React UI

[`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) calls `useChat()` and destructures its return values. It passes `chatContainerRef` and `messagesEndRef` as `ref` attributes to DOM elements, `handleScroll` as an `onScroll` handler, `scrollToBottom` to the [`ScrollButton`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ScrollButton.tsx) component, and `handleSubmit` to the [`ChatInput`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatInput.tsx) component.

### Connection 2: useChat ↔ Zustand

The hook reads `messages`, `input`, and `loading` from the Zustand store. It writes to the store using `setMessages`, `setInput`, `setLoading`, `setTokenUsage`, and `setShowScrollButton`. When the hook writes to the store, every React component subscribed to the affected slice re-renders.

### Connection 3: useChat ↔ Express Backend

The hook sends an HTTP POST to `http://localhost:5000/api/chat/stream` with the conversation messages as JSON. The Express server receives this, validates it, calls Groq, and streams SSE events back through the response body.

### Connection 4: Express Backend ↔ Groq

The [`chat.controller.ts`](file:///c:/Users/hp/llm-fundamentals/server/controllers/chat.controller.ts) calls `groq.chat.completions.create(...)` with `stream: true`. It iterates over the async stream and writes each chunk as an SSE `data:` line. After all chunks, it writes a `data: [DONE]` event and ends the response.

---

## 3. Main Responsibilities

Based on the actual code, `useChat` handles exactly these responsibilities:

| # | Responsibility | How |
|---|----------------|-----|
| 1 | Reading state from Zustand | Selector hooks for `messages`, `input`, `loading` |
| 2 | Writing state to Zustand | Calls `setMessages`, `setInput`, `setLoading`, `setTokenUsage`, `setShowScrollButton` |
| 3 | Making the HTTP request | `fetch()` with POST to the Express streaming endpoint |
| 4 | Parsing SSE events | `createParser` from `eventsource-parser` library |
| 5 | Buffering streamed text | Appends `parsed.content` to `bufferRef.current` |
| 6 | Progressively displaying the assistant response | A `setInterval`-based display loop that drains the buffer into the Zustand messages |
| 7 | Controlling loading state | Sets `loading` to `true` at the start, `false` only after the display loop fully drains the buffer |
| 8 | Handling scroll behavior | Auto-scrolls when the user is near the bottom; shows/hides a scroll button |
| 9 | Cancelling an active request | `AbortController.abort()` via `stopGeneration` |
| 10 | Cleaning up resources on unmount | `useEffect` cleanup aborts fetch and clears the display timer |
| 11 | Handling errors | Catches network errors, backend errors, and stream errors; shows them as assistant messages |
| 12 | Updating token usage | Maps `parsed.usage` to Zustand's `setTokenUsage` |

---

## 4. Imports Explained

```ts
import { useRef, useEffect, useCallback } from 'react';
```

| Import | What it is | Why this hook needs it | Where it is used | Without it |
|--------|-----------|----------------------|-----------------|-----------|
| `useRef` | React hook that creates a mutable reference object persisting across renders | The hook needs mutable values (buffer, timers, abort controller, DOM elements) that must **not** cause re-renders when changed | `bufferRef`, `displayTimerRef`, `streamDoneRef`, `displayedReplyRef`, `abortControllerRef`, `chatContainerRef`, `messagesEndRef` | The hook could not store mutable streaming state without causing unwanted re-renders |
| `useEffect` | React hook that runs side effects after render | Needed for auto-scroll on message changes and cleanup on unmount | Two `useEffect` calls: the auto-scroll effect and the cleanup effect | Auto-scroll would not work; resources would leak on unmount |
| `useCallback` | React hook that memoizes a function, only recreating it when dependencies change | Prevents unnecessary function re-creation on each render, which matters because these callbacks are used as dependencies in other hooks | `scrollToBottom`, `stopDisplayLoop`, `startDisplayLoop`, `stopGeneration` | Functions would be recreated every render, potentially causing infinite re-render loops in `useEffect` dependencies |

```ts
import { createParser, type EventSourceMessage } from 'eventsource-parser';
```

| Import | What it is | Why this hook needs it | Where it is used | Without it |
|--------|-----------|----------------------|-----------------|-----------|
| `createParser` | A function from the `eventsource-parser` library that creates an SSE parser | The backend sends responses as SSE (`data: {...}\n\n`). Raw text must be parsed into structured events | Inside `handleSubmit`, creating the parser that processes the stream | The hook would need to manually parse SSE text format, handling `data:` prefixes, double newlines, and edge cases |
| `type EventSourceMessage` | A TypeScript type describing the shape of a parsed SSE event (has `.data`, `.event`, `.id`, etc.) | Provides type information for the `event` parameter in the `onEvent` callback | The `onEvent(event: EventSourceMessage)` parameter type annotation | TypeScript would not know what properties exist on `event`, leading to type errors or the need for `any` |

> [!NOTE]
> The `type` keyword before `EventSourceMessage` means this is a **type-only import**. It is erased at compile time and produces no JavaScript output. It exists purely for TypeScript's type checker.

```ts
import { useChatStore } from '../stores/chatStore';
```

| Import | What it is | Why this hook needs it | Where it is used | Without it |
|--------|-----------|----------------------|-----------------|-----------|
| `useChatStore` | The Zustand store hook exported from [`chatStore.ts`](file:///c:/Users/hp/llm-fundamentals/src/stores/chatStore.ts) | The hook needs to read and write shared chat state (messages, input, loading, etc.) | Lines 7–14, and throughout all functions that call `setMessages`, `setInput`, etc. | The hook would have no way to share state with the React UI components |

---

## 5. TypeScript Syntax Explanation

This section explains only TypeScript syntax that actually appears in [`useChat.ts`](file:///c:/Users/hp/llm-fundamentals/src/hooks/useChat.ts).

---

### 5.1 `ReturnType<typeof setInterval>`

```ts
const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**Syntax:** `ReturnType<typeof X>` is a TypeScript utility type. `typeof setInterval` gets the type signature of the `setInterval` function. `ReturnType<...>` then extracts whatever type that function returns.

**Plain English:** "Whatever type `setInterval` returns, use that type here."

**Why it is used here:** In a browser, `setInterval` returns a `number`. In Node.js, it returns a `NodeJS.Timeout` object. By using `ReturnType<typeof setInterval>`, the code works correctly in both environments without hardcoding either type. The `| null` means the ref can also hold `null` (when no timer is active).

---

### 5.2 `HTMLDivElement`

```ts
const chatContainerRef = useRef<HTMLDivElement>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

**Syntax:** `HTMLDivElement` is a built-in browser type representing a `<div>` DOM element.

**Plain English:** "This ref will point to a `<div>` element in the DOM."

**Why it is used here:** When these refs are passed to a `<div ref={chatContainerRef}>` in JSX, React automatically fills `.current` with the actual DOM element. TypeScript needs to know the element type so you can safely access properties like `scrollTop`, `scrollHeight`, and `clientHeight`, which exist on `HTMLDivElement`.

---

### 5.3 `ScrollBehavior`

```ts
const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
```

**Syntax:** `ScrollBehavior` is a built-in browser TypeScript type. It is a union type defined as `'auto' | 'instant' | 'smooth'`.

**Plain English:** "The `behavior` parameter can only be one of three specific strings: `'auto'`, `'instant'`, or `'smooth'`."

**Why it is used here:** The parameter is passed to `scrollIntoView({ behavior })`, which is a browser DOM method. Using the correct type ensures TypeScript catches any misspelled or invalid scroll behavior value at compile time. The `= 'smooth'` is a default parameter value — if no argument is passed, `'smooth'` is used.

---

### 5.4 `React.FormEvent`

```ts
const handleSubmit = async (e: React.FormEvent) => {
```

**Syntax:** `React.FormEvent` is a React type representing a form submission event.

**Plain English:** "The parameter `e` is a form event — the event object that React creates when a `<form>` is submitted."

**Why it is used here:** `handleSubmit` is passed to the `<form onSubmit={...}>` in [`ChatInput.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatInput.tsx). The `e.preventDefault()` call requires `e` to be typed as a form event. Without this type, TypeScript would not know that `e` has a `preventDefault` method.

---

### 5.5 Union Types — `string | null`

```ts
let streamError: string | null = null;
```

**Syntax:** The `|` character creates a union type. `string | null` means the variable can hold either a `string` value or `null`.

**Plain English:** "`streamError` starts as `null` (no error), and can later become a `string` (an error message)."

**Why it is used here:** Before the stream starts, there is no error. If the stream sends an error event, `streamError` is set to a string. After the reading loop, the code checks if `streamError` is non-null. This pattern uses `null` as a "no error" sentinel.

---

### 5.6 `as const`

```ts
const userMessage = { role: 'user' as const, content: input.trim() };
```

**Syntax:** `as const` is a const assertion. Without it, TypeScript infers `role` as type `string`. With it, TypeScript narrows the type to the literal `'user'`.

**Plain English:** "Don't treat `'user'` as any arbitrary string — treat it as specifically and only the string `'user'`."

**Why it is used here:** The `Message` type (from [`chat.ts`](file:///c:/Users/hp/llm-fundamentals/src/types/chat.ts)) defines `role` as `'user' | 'assistant' | 'system'`. If TypeScript inferred `role` as a broad `string`, the object would not be assignable to `Message` because `string` is wider than the union. `as const` narrows it to the exact literal type `'user'`, which is part of the union.

---

### 5.7 Type-only Import

```ts
import { createParser, type EventSourceMessage } from 'eventsource-parser';
```

**Syntax:** The `type` keyword before `EventSourceMessage` marks it as a type-only import.

**Plain English:** "Import `EventSourceMessage` only for TypeScript's type checker. Do not include it in the compiled JavaScript."

**Why it is used here:** `EventSourceMessage` is only used as a type annotation on the `event` parameter inside `onEvent`. It is not a value that exists at runtime. The `type` keyword makes this explicit, and bundlers can safely remove it during compilation.

---

### 5.8 Optional Chaining — `?.`

```ts
messagesEndRef.current?.scrollIntoView({ behavior });
```

**Syntax:** `?.` is the optional chaining operator. If the value to the left is `null` or `undefined`, the entire expression evaluates to `undefined` instead of throwing an error.

**Plain English:** "If `messagesEndRef.current` exists (is not null/undefined), then call `.scrollIntoView()`. If it doesn't exist, do nothing."

**Why it is used here:** A ref's `.current` value is `null` until the component mounts and React assigns the DOM element. If `scrollToBottom` is somehow called before the ref is attached, optional chaining prevents a runtime crash.

---

### 5.9 `AbortController | null`

```ts
const abortControllerRef = useRef<AbortController | null>(null);
```

**Syntax:** The generic parameter `<AbortController | null>` tells TypeScript that `.current` can hold either an `AbortController` instance or `null`.

**Plain English:** "This ref starts as null and will later hold an AbortController, and after aborting it may be set back to null."

**Why it is used here:** An `AbortController` only exists while a fetch request is in progress. Between requests, the ref holds `null`. The union type reflects this lifecycle.

---

### 5.10 `err: any`

```ts
} catch (err: any) {
```

**Syntax:** By default, TypeScript types caught errors as `unknown`. Annotating with `any` disables type checking on the error object.

**Plain English:** "Treat the caught error as any type, so I can access `.name` and `.message` without TypeScript complaining."

**Why it is used here:** The `catch` block accesses `err.name` and `err.message`. With `unknown`, TypeScript would require a type guard before accessing these properties. The `as any` annotation is a pragmatic shortcut. The `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment above it shows the author is aware this bypasses stricter typing.

---

### 5.11 Callback parameter types

```ts
setMessages((prev) => {
  const updated = [...prev];
```

**Syntax:** `prev` is automatically inferred by TypeScript based on the `setMessages` function signature. Looking at the store, `setMessages` accepts `Message[] | ((prev: Message[]) => Message[])`. When a function is passed, TypeScript knows `prev` is `Message[]`.

**Plain English:** "`prev` is the current array of messages. TypeScript figures out this type automatically from the store's type definition."

---

### 5.12 Nullable refs with `useRef<T>(null)`

```ts
const chatContainerRef = useRef<HTMLDivElement>(null);
```

**Syntax:** When `useRef` is called with a generic type `<HTMLDivElement>` and initialized with `null`, TypeScript creates a `React.RefObject<HTMLDivElement>` where `.current` is `HTMLDivElement | null`.

**Plain English:** "This ref will hold a div element, but starts as null until React attaches the actual DOM element."

**Why it is used here:** This pattern is standard for DOM refs. React fills in `.current` when the element mounts and sets it to `null` when it unmounts.

---

## 6. Zustand Relationship

### What is useChatStore?

[`useChatStore`](file:///c:/Users/hp/llm-fundamentals/src/stores/chatStore.ts) is a Zustand store created with `create<ChatState>((set) => ({...}))`. It holds the shared state for the entire chat feature. Any component or hook that calls `useChatStore(selector)` subscribes to the selected slice of state and re-renders when that slice changes.

### How selectors work

Each line at the top of `useChat` follows this pattern:

```ts
const messages = useChatStore((state) => state.messages);
```

- `useChatStore(...)` calls the Zustand hook.
- `(state) => state.messages` is a **selector function**. Zustand passes the entire store object as `state`.
- The selector returns only `state.messages` — the specific piece of state this line needs.
- Zustand compares the selected value between renders using `Object.is`. If `state.messages` has not changed, this component/hook does **not** re-render.
- The returned value (`messages`) is the **current** value of `state.messages`.

### Every Zustand interaction

| Store value | Accessed as | Read or Write | Purpose inside useChat |
|---|---|---|---|
| `messages` | `useChatStore(state => state.messages)` | **Read** | Used to build the request payload (`[...messages, userMessage]`) and as a dependency in the auto-scroll effect |
| `setMessages` | `useChatStore(state => state.setMessages)` | **Write** | Called to: add the user message + assistant placeholder, update the assistant message during streaming, and replace the assistant message on error |
| `input` | `useChatStore(state => state.input)` | **Read** | Read in `handleSubmit` to get the current text the user typed |
| `setInput` | `useChatStore(state => state.setInput)` | **Write** | Called to clear the input field after the user submits a message (`setInput('')`) |
| `loading` | `useChatStore(state => state.loading)` | **Read** | Read in `handleSubmit` to guard against double-submission while a request is in progress |
| `setLoading` | `useChatStore(state => state.setLoading)` | **Write** | Called to set `true` when streaming starts and `false` when the display loop finishes draining or an error occurs |
| `setTokenUsage` | `useChatStore(state => state.setTokenUsage)` | **Write** (only) | Called when the SSE stream sends a `usage` event to store token counts |
| `setShowScrollButton` | `useChatStore(state => state.setShowScrollButton)` | **Write** (only) | Called from `handleScroll` to show or hide the scroll-to-bottom button based on scroll position |

### Data flow

```
Zustand Store  (single source of truth)
      ↓
useChat reads state  (messages, input, loading)
      ↓
useChat performs an action  (sends fetch, processes stream, handles scroll)
      ↓
useChat updates Zustand  (setMessages, setLoading, setTokenUsage, etc.)
      ↓
React components receive updated state  (ChatMessage re-renders, loading indicator appears/disappears, ScrollButton shows/hides)
```

### Read-only vs write-only vs both

| Category | Values |
|----------|--------|
| **Read and written** | `messages` (read to build payload, written via `setMessages`), `input` (read for text, written via `setInput`), `loading` (read for guard, written via `setLoading`) |
| **Write-only** (from useChat's perspective) | `setTokenUsage`, `setShowScrollButton` — the hook writes these but never reads `tokenUsage` or `showScrollButton` directly. Other components like [`Header.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/ui/Header.tsx) and [`ScrollButton.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ScrollButton.tsx) read those values. |

### How setMessages supports both values and updater functions

The Zustand store defines `setMessages` as:

```ts
setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
```

This means `setMessages` can accept either:
1. A **new array** directly: `setMessages([...updatedMessages, { role: 'assistant', content: '' }])`
2. An **updater function** that receives the previous state: `setMessages((prev) => [...prev.slice(0, -1), newMsg])`

The store implementation checks which form was used:

```ts
messages: typeof messages === 'function' ? messages(state.messages) : messages
```

The hook uses **both** forms:
- Direct arrays for the initial optimistic update.
- Updater functions inside the display loop and error handler, where the hook needs to base the new state on the **latest** previous state to avoid stale closures.

---

## 7. useRef in Detail

### Why useRef instead of useState?

There is a critical architectural distinction:

| Feature | `useState` | `useRef` |
|---------|-----------|---------|
| Changing the value causes a re-render? | **Yes** | **No** |
| Value persists across renders? | Yes | Yes |
| Appropriate for values the UI depends on? | Yes | No (unless bridged through state) |
| Appropriate for mutable internal bookkeeping? | No (too many re-renders) | Yes |

The streaming implementation uses refs because the buffer, timer, and stream status change **many times per second** during active streaming. If these were `useState`, each change would trigger a React re-render — potentially dozens per second — destroying performance. The hook instead uses refs for fast internal mutation and only touches Zustand state (which triggers renders) when there is actual UI content to display.

---

### 7.1 `bufferRef`

```ts
const bufferRef = useRef('');
```

| Property | Detail |
|----------|--------|
| **What it stores** | A string of streamed text that has been received from the backend but has **not yet been displayed** to the user |
| **Why useRef** | Content arrives from the SSE stream many times per second. Storing this in React state would cause a re-render for every incoming chunk, which is wasteful because the user doesn't see the buffer — they see `displayedReplyRef` |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `startDisplayLoop` (inside the interval callback — checks `bufferRef.current.length`, converts to array, slices characters) |
| **Functions that modify it** | `handleSubmit` (clears it on reset, `onEvent` appends content via `bufferRef.current += parsed.content`), `startDisplayLoop` (removes consumed characters), `stopGeneration` (clears it), error handler (clears it) |
| **Persistence** | Lives for the entire lifetime of the component that uses `useChat`. Survives re-renders. Cleared manually between submissions |
| **Role in streaming** | Acts as the **queue** between the producer (SSE stream) and the consumer (display loop) |

---

### 7.2 `displayTimerRef`

```ts
const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

| Property | Detail |
|----------|--------|
| **What it stores** | The return value of `setInterval` (a timer ID), or `null` when no display loop is running |
| **Why useRef** | The timer ID is internal bookkeeping needed to clear the interval later. The UI does not need to know about it |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `startDisplayLoop` (guard check: if timer already exists, don't create another), `stopDisplayLoop` (to call `clearInterval`) |
| **Functions that modify it** | `startDisplayLoop` (assigns the new interval ID), `stopDisplayLoop` (sets to null), the interval callback itself (sets to null when stream is done and buffer is drained), cleanup `useEffect` (calls `clearInterval`) |
| **Persistence** | Lives for the component's lifetime. Set to a timer ID when streaming starts, set back to `null` when streaming finishes or is stopped |
| **Role in streaming** | Holds the handle needed to stop the display animation |

---

### 7.3 `streamDoneRef`

```ts
const streamDoneRef = useRef(false);
```

| Property | Detail |
|----------|--------|
| **What it stores** | A boolean: `true` means the **network stream** has finished (the backend sent `[DONE]` or the reader reported `done`), `false` means the stream is still active |
| **Why useRef** | This flag is checked inside a `setInterval` callback. If it were state, the interval closure would capture a stale value. A ref always provides the latest value via `.current` |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `startDisplayLoop` interval callback (checks `if (streamDoneRef.current)` when buffer is empty to decide whether to stop the loop) |
| **Functions that modify it** | `handleSubmit` (resets to `false` before a new request, set to `true` when `[DONE]` is received or after the reader loop finishes), `stopGeneration` (sets to `true`), error handler (sets to `true`) |
| **Persistence** | Lives for the component's lifetime |
| **Role in streaming** | Signals to the display loop that no more data will arrive, so when the buffer is empty, it is safe to stop the animation and set `loading` to `false` |

---

### 7.4 `displayedReplyRef`

```ts
const displayedReplyRef = useRef('');
```

| Property | Detail |
|----------|--------|
| **What it stores** | The accumulated text of the assistant's response that has been "displayed" so far (moved from the buffer into the visible message) |
| **Why useRef** | This value is updated every 20ms during the display loop. If it were state, each update would trigger a re-render. Instead, the hook updates this ref AND calls `setMessages` to push the latest content into Zustand, which triggers a single efficient re-render |
| **Does changing `.current` cause a re-render?** | No — but the subsequent `setMessages` call does |
| **Functions that read it** | `startDisplayLoop` interval callback (uses `displayedReplyRef.current` as the new assistant message content) |
| **Functions that modify it** | `startDisplayLoop` interval callback (appends characters: `displayedReplyRef.current += nextCharacters`), `handleSubmit` (clears it before a new request) |
| **Persistence** | Lives for the component's lifetime |
| **Role in streaming** | Accumulates the visible portion of the assistant's response, serving as the source of truth for what `setMessages` should set as the assistant message content |

---

### 7.5 `abortControllerRef`

```ts
const abortControllerRef = useRef<AbortController | null>(null);
```

| Property | Detail |
|----------|--------|
| **What it stores** | An `AbortController` instance while a fetch request is active, or `null` when there is no active request |
| **Why useRef** | The abort controller is infrastructure — the UI does not render anything based on its existence. It must persist across the async lifecycle of `handleSubmit` without triggering renders |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `handleSubmit` (checks if one already exists before a new request to abort it), `stopGeneration` (calls `.abort()` on it), cleanup `useEffect` (calls `.abort()` on unmount) |
| **Functions that modify it** | `handleSubmit` (creates a new `AbortController` and stores it), `stopGeneration` (sets to `null` after aborting) |
| **Persistence** | Lives for the component's lifetime. Created for each request, cleared after abort or completion |
| **Role in streaming** | Provides the `signal` passed to `fetch()`. Calling `.abort()` on it cancels the in-flight HTTP request |

---

### 7.6 `chatContainerRef`

```ts
const chatContainerRef = useRef<HTMLDivElement>(null);
```

| Property | Detail |
|----------|--------|
| **What it stores** | A reference to the scrollable `<div>` that wraps all chat messages in [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) |
| **Why useRef** | Standard pattern for accessing a DOM element. React fills `.current` with the actual div after mounting |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `handleScroll` (reads `scrollTop`, `scrollHeight`, `clientHeight`), auto-scroll `useEffect` (reads the same properties) |
| **Functions that modify it** | React (internally — assigns the DOM element on mount, nulls on unmount) |
| **Persistence** | Lives for the component's lifetime |
| **Role in streaming** | Allows the hook to measure scroll position and determine whether to auto-scroll or show the scroll button |

---

### 7.7 `messagesEndRef`

```ts
const messagesEndRef = useRef<HTMLDivElement>(null);
```

| Property | Detail |
|----------|--------|
| **What it stores** | A reference to an empty `<div>` placed at the very bottom of the message list in [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) (`<div ref={messagesEndRef} />`) |
| **Why useRef** | This div serves as a scroll target. `scrollIntoView` is called on it to scroll the chat to the bottom |
| **Does changing `.current` cause a re-render?** | No |
| **Functions that read it** | `scrollToBottom` (calls `messagesEndRef.current?.scrollIntoView(...)`) |
| **Functions that modify it** | React (internally) |
| **Persistence** | Lives for the component's lifetime |
| **Role in streaming** | Acts as the anchor point for programmatic scrolling |

---

## 8. useCallback in Detail

### Why useCallback exists

`useCallback` memoizes a function. Without it, every time the component re-renders, a brand-new function object is created. This matters because:

1. If a function is listed as a dependency in a `useEffect`, a new function object would cause the effect to re-run on every render.
2. If a function is passed as a prop, child components would re-render unnecessarily.

`useCallback(fn, deps)` returns the **same** function object across renders, only creating a new one when a value in `deps` changes.

---

### 8.1 `scrollToBottom`

```ts
const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
  messagesEndRef.current?.scrollIntoView({ behavior });
}, []);
```

| Aspect | Detail |
|--------|--------|
| **What it does** | Scrolls the chat to the bottom by calling `scrollIntoView` on the invisible div at the end of the message list |
| **Why useCallback** | `scrollToBottom` is listed as a dependency in the auto-scroll `useEffect` (line 45). Without memoization, a new function would be created every render, causing the effect to re-run on every render |
| **Dependency array** | `[]` — empty, meaning this function is created once and never recreated. This is safe because it only accesses `messagesEndRef`, which is a ref (always the same object) |
| **When React recreates it** | Never (empty dependency array) |
| **Used by** | The auto-scroll `useEffect`, and returned to the caller — [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) passes it to [`ScrollButton`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ScrollButton.tsx) as `onClick={() => scrollToBottom('smooth')}` |

---

### 8.2 `stopDisplayLoop`

```ts
const stopDisplayLoop = useCallback(() => {
  if (displayTimerRef.current) {
    clearInterval(displayTimerRef.current);
    displayTimerRef.current = null;
  }
}, []);
```

| Aspect | Detail |
|--------|--------|
| **What it does** | Stops the display animation by clearing the interval and nulling the timer ref |
| **Why useCallback** | `stopDisplayLoop` is a dependency of `startDisplayLoop` and `stopGeneration`. If it were recreated on every render, those callbacks would also be recreated, causing cascading dependency issues |
| **Dependency array** | `[]` — empty. Safe because it only accesses `displayTimerRef`, which is a ref |
| **When React recreates it** | Never |
| **Used by** | `startDisplayLoop` (not directly — but `stopGeneration` calls it), `stopGeneration`, `handleSubmit`, and the error handler |

---

### 8.3 `startDisplayLoop`

```ts
const startDisplayLoop = useCallback(() => {
  if (displayTimerRef.current) return;
  displayTimerRef.current = setInterval(() => { ... }, 20);
}, [setLoading, setMessages]);
```

| Aspect | Detail |
|--------|--------|
| **What it does** | Creates a `setInterval` that runs every 20ms, consuming characters from the buffer and pushing them into the Zustand messages |
| **Why useCallback** | This function is called inside `handleSubmit` and also inside the SSE `onEvent` callback. It must be stable (same reference) so it doesn't cause stale closures |
| **Dependency array** | `[setLoading, setMessages]` — these are the Zustand setter functions used inside the interval callback. In practice, Zustand setters are stable references and never change, but listing them is technically correct for exhaustive dependencies |
| **When React recreates it** | Only if `setLoading` or `setMessages` change (which in practice they don't — Zustand returns stable references) |
| **Used by** | The SSE `onEvent` callback (called when content arrives: `startDisplayLoop()`), and at the end of the reader loop after `streamDoneRef.current = true` |

---

### 8.4 `stopGeneration`

```ts
const stopGeneration = useCallback(() => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
  stopDisplayLoop();
  bufferRef.current = '';
  streamDoneRef.current = true;
  setLoading(false);
}, [stopDisplayLoop, setLoading]);
```

| Aspect | Detail |
|--------|--------|
| **What it does** | Immediately cancels the active streaming request and cleans up all streaming state |
| **Why useCallback** | It is returned from the hook and could be used as a prop or dependency by consuming components. Memoization ensures referential stability |
| **Dependency array** | `[stopDisplayLoop, setLoading]` — the two functions it calls that come from outside its own scope. `stopDisplayLoop` is itself a memoized callback. `setLoading` is a Zustand setter |
| **When React recreates it** | Only if `stopDisplayLoop` or `setLoading` change |
| **Used by** | Returned to [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) (though note: in the current `App.tsx`, `stopGeneration` is destructured from `useChat()` but is **not** used in the template — it is available but not wired to a button in the current UI) |

---

## 9. useEffect in Detail

### 9.1 Auto-scroll Effect

```ts
useEffect(() => {
  if (chatContainerRef.current) {
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= 150;
    if (isNearBottom) {
      scrollToBottom(loading ? 'auto' : 'smooth');
    }
  }
}, [messages, loading, scrollToBottom]);
```

| Aspect | Detail |
|--------|--------|
| **What triggers this effect** | Any change to `messages`, `loading`, or `scrollToBottom`. In practice, `scrollToBottom` never changes (empty dependency array). So this fires when messages are updated (display loop pushes new content) or when `loading` changes |
| **What code executes** | It checks whether `chatContainerRef.current` exists (the div is mounted). If so, it measures the scroll position and determines if the user is within 150 pixels of the bottom. If they are near the bottom, it calls `scrollToBottom` |
| **Why these dependencies** | `messages` — the effect should re-evaluate scroll position whenever the message list changes. `loading` — when loading starts or finishes, the "Thinking..." indicator appears or disappears, changing the scroll requirements. `scrollToBottom` — listed because it is called inside the effect (ESLint exhaustive-deps rule) |
| **Cleanup function** | None. This effect has no side effects to clean up |
| **Why the 150px threshold** | 150 pixels is a "close enough to the bottom" tolerance. If the user has scrolled up even slightly beyond this threshold, they are probably reading older messages, and the hook should **not** forcibly scroll them away from what they're reading |
| **`loading ? 'auto' : 'smooth'`** | During active streaming (`loading` is `true`), scrolling uses `'auto'` (instant jump) to keep up with rapid content updates. After streaming finishes (`loading` is `false`), it uses `'smooth'` for a polished animated scroll |

**DOM properties explained:**

- `scrollTop`: How many pixels the user has scrolled down from the top of the container.
- `scrollHeight`: The total height of all content inside the container, including content not visible.
- `clientHeight`: The visible height of the container (the viewport).
- `scrollHeight - scrollTop - clientHeight`: The number of pixels of content hidden below the current viewport. When this is 0, the user is at the very bottom.

---

### 9.2 Cleanup Effect

```ts
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
    }
  };
}, []);
```

| Aspect | Detail |
|--------|--------|
| **What triggers this effect** | The empty dependency array `[]` means the effect runs once after the first render. The **cleanup function** (the returned function) runs only when the component **unmounts** |
| **What code executes** | The setup function does nothing (it returns a cleanup function immediately). The cleanup function aborts any in-flight fetch request and clears any active display interval |
| **Why these dependencies** | `[]` means "run setup once, run cleanup only on unmount." This is appropriate because cleanup should happen exactly once, when the component is destroyed |
| **What the cleanup function does** | 1) Calls `abort()` on any active `AbortController`, which cancels the `fetch` and causes the `ReadableStream` reader to reject. 2) Calls `clearInterval` on any active display timer, stopping the animation |
| **Why cleanup matters** | Without it, if the user navigates away from the chat page while a stream is active: the fetch request would continue running in the background (wasting bandwidth and server resources), the `setInterval` would keep firing (attempting to update state on an unmounted component), and React would log warnings about state updates on unmounted components |

---

## 10. handleScroll Explanation

```ts
const handleScroll = () => {
  if (!chatContainerRef.current) return;
  const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
  const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
  setShowScrollButton(isScrolledUp);
};
```

### Line-by-line

**`if (!chatContainerRef.current) return;`**

Guard clause. If the ref is not yet attached to a DOM element (before mount, or after unmount), exit immediately. Without this, destructuring properties would throw an error.

**`const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;`**

Destructures three DOM properties from the scrollable `<div>`:

| Property | Meaning |
|----------|---------|
| `scrollTop` | How far the user has scrolled down (in pixels) from the top |
| `scrollHeight` | The total scrollable height of all content, including hidden overflow |
| `clientHeight` | The visible viewport height of the container |

**`const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;`**

This calculation determines how many pixels of content are hidden **below** the current scroll position:

```
Total content height  (scrollHeight)
 - Pixels scrolled from top  (scrollTop)
 - Visible viewport height  (clientHeight)
 = Pixels remaining below viewport
```

If more than 150 pixels of content are hidden below the viewport, the user has scrolled up meaningfully and is considered "scrolled away from the bottom."

**Why 150?** It's a UX threshold. A small overshoot (less than 150px) is treated as "still at the bottom." This prevents the scroll button from flickering when the user is essentially at the bottom but a few pixels off.

**`setShowScrollButton(isScrolledUp);`**

Sends `true` or `false` to the Zustand store. The [`ScrollButton`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ScrollButton.tsx) component reads `showScrollButton` from the store:

```ts
const showScrollButton = useChatStore((state) => state.showScrollButton);
if (!showScrollButton) return null;
```

When `isScrolledUp` is `true`, the button appears. When `false`, it disappears. Clicking the button calls `scrollToBottom('smooth')`, which scrolls the chat back to the bottom.

---

## 11. Display Loop Architecture

The display loop is the mechanism that creates the **progressive typing effect** — making the assistant's response appear character by character instead of all at once.

### Why not display content immediately?

When the backend streams content, chunks arrive in bursts. If each chunk were immediately pushed into the Zustand message, the text would appear in irregular, jarring jumps. The display loop **smooths** this out by:

1. Accumulating incoming content in a **buffer**.
2. Draining the buffer at a steady rate using a **timer**.

### The two concurrent processes

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  PROCESS A: Receiving       │      │  PROCESS B: Displaying       │
│                             │      │                              │
│  Backend stream             │      │  setInterval (every 20ms)    │
│       ↓                     │      │       ↓                      │
│  reader.read()              │      │  Read bufferRef.current      │
│       ↓                     │      │       ↓                      │
│  TextDecoder                │      │  Slice off characters        │
│       ↓                     │      │       ↓                      │
│  SSE parser                 │      │  Append to                   │
│       ↓                     │      │  displayedReplyRef.current   │
│  parsed.content             │      │       ↓                      │
│       ↓                     │      │  setMessages(...)            │
│  bufferRef.current +=       │      │       ↓                      │
│  (appends to buffer)  ──────┼──────│  Zustand store updated       │
│                             │      │       ↓                      │
│  When backend sends [DONE]: │      │  React re-renders            │
│  streamDoneRef = true       │      │  ChatMessage shows new text  │
│                             │      │                              │
│                             │      │  When buffer empty AND       │
│                             │      │  streamDoneRef is true:       │
│                             │      │  → Stop interval             │
│                             │      │  → setLoading(false)         │
└─────────────────────────────┘      └──────────────────────────────┘
```

### Data flow diagram

```
Backend stream
    ↓
HTTP response body (ReadableStream)
    ↓
reader.read()  →  raw bytes (Uint8Array)
    ↓
TextDecoder  →  text string
    ↓
parser.feed()  →  SSE parsing
    ↓
onEvent callback  →  event.data
    ↓
JSON.parse(data)  →  { content: "..." }
    ↓
bufferRef.current += parsed.content
    ↓
Display loop (setInterval, 20ms)
    ↓
Characters sliced from bufferRef → appended to displayedReplyRef
    ↓
setMessages(...)  →  Zustand store updated
    ↓
React re-render  →  ChatMessage component displays new text
```

### Key refs and their roles

| Ref | Role | Updated by |
|-----|------|-----------|
| `bufferRef` | Queue of text waiting to be displayed | Process A (appends), Process B (consumes) |
| `displayTimerRef` | Handle to the interval timer | `startDisplayLoop` (creates), `stopDisplayLoop` (clears) |
| `streamDoneRef` | Flag: has the network stream finished? | Process A (sets `true`), `handleSubmit` (resets to `false`) |
| `displayedReplyRef` | Accumulated visible text | Process B (appends characters from buffer) |

---

## 12. startDisplayLoop — Line by Line

```ts
const startDisplayLoop = useCallback(() => {
```

This is a memoized function that starts the display animation timer.

---

### Guard

```ts
if (displayTimerRef.current) return;
```

**What it does:** If a timer is already running (`displayTimerRef.current` is not null), exit immediately.

**Why this exists:** Without this guard, calling `startDisplayLoop()` multiple times (which happens — it is called for every content event from the stream) would create multiple intervals all running simultaneously, each consuming the buffer independently. This would cause:
- Characters being consumed faster than intended.
- Multiple `setMessages` calls per 20ms cycle.
- The animation speed becoming unpredictable.

The guard ensures exactly **one** interval exists at a time.

---

### setInterval

```ts
displayTimerRef.current = setInterval(() => {
```

**What it does:** Creates a repeating timer that executes the callback every 20 milliseconds (50 times per second). The timer ID is stored in `displayTimerRef.current` so it can be cleared later.

**Why 20ms?** 20ms ≈ 50 frames per second. This is fast enough to create a smooth typing animation but not so fast that it overwhelms React with re-renders. It roughly aligns with typical screen refresh rates.

---

### Buffer check — empty buffer

```ts
if (bufferRef.current.length === 0) {
  if (streamDoneRef.current) {
    clearInterval(displayTimerRef.current!);
    displayTimerRef.current = null;
    setLoading(false);
  }
  return;
}
```

**What happens when the buffer is empty:**

The interval checks if there are characters to display. If the buffer is empty, there are two possibilities:

1. **The stream is still active** (`streamDoneRef.current` is `false`): The producer (Process A) hasn't sent more content yet, but it will. The interval simply `return`s and waits for the next 20ms tick, when hopefully new content has arrived.

2. **The stream is finished** (`streamDoneRef.current` is `true`): There will never be more content. The interval clears itself, nulls the timer ref, and sets `loading` to `false`. This is the **only place** where `loading` becomes `false` during a successful stream. This means `loading` stays `true` until **all buffered text has been displayed to the user**, not just until the network stream ends.

> [!IMPORTANT]
> The `!` after `displayTimerRef.current!` is a TypeScript non-null assertion. It tells TypeScript: "I know this value is not null right now." This is safe because we are inside a `setInterval` callback, and we just confirmed the timer exists via the guard at the top.

---

### Unicode handling

```ts
const chars = Array.from(bufferRef.current);
```

**What it does:** Converts the buffer string into an array of Unicode characters (grapheme clusters).

**Why not simply slice the string?** JavaScript strings are sequences of UTF-16 code units. Many emoji and non-Latin characters are represented by **two** code units (a surrogate pair). For example, the emoji 😀 is stored as two code units: `\uD83D\uDE00`.

If you use `string.slice(0, 1)` on `"😀hello"`, you get `"\uD83D"` — half an emoji, which renders as a broken character (�).

`Array.from()` properly splits the string by Unicode code points, so `Array.from("😀hello")` produces `["😀", "h", "e", "l", "l", "o"]`. Each element is a complete character, even for multi-byte ones.

---

### Dynamic chunk size

```ts
const chunkSize = Math.max(2, Math.ceil(chars.length / 25));
```

**What it does:** Calculates how many characters to display in this 20ms tick.

**Breaking it down:**

- `chars.length / 25`: Divides the current buffer size by 25. If there are 100 characters buffered, this gives 4. If there are 500, this gives 20.
- `Math.ceil(...)`: Rounds up to the nearest integer. `Math.ceil(3.2)` becomes `4`.
- `Math.max(2, ...)`: Ensures the chunk size is **at least 2**. Even if the buffer has very few characters, we always display at least 2 at a time.

**Why this formula?** It creates **adaptive speed**:
- **Small buffer** (e.g., 10 chars): `Math.ceil(10/25) = 1` → clamped to `2`. Characters appear slowly, giving a natural typing feel.
- **Large buffer** (e.g., 250 chars): `Math.ceil(250/25) = 10`. Characters appear faster to catch up with the producer, preventing the animation from falling far behind.
- **Very large buffer** (e.g., 500 chars): `Math.ceil(500/25) = 20`. Even faster. The display loop accelerates to drain the backlog.

This prevents a situation where the backend has already finished sending, but the user is still watching a painfully slow character-by-character animation.

---

### Consuming characters from the buffer

```ts
const nextCharacters = chars.slice(0, chunkSize).join('');
bufferRef.current = chars.slice(chunkSize).join('');
```

**`chars.slice(0, chunkSize).join('')`**: Takes the first `chunkSize` characters from the array and joins them back into a string. These are the characters that will be displayed in this tick.

**`chars.slice(chunkSize).join('')`**: Takes all remaining characters (everything after the chunk) and joins them back into a string. This becomes the new buffer content. The consumed characters have been removed.

**Example:** If buffer is `"Hello World"` and chunkSize is `3`:
- `chars` = `["H", "e", "l", "l", "o", " ", "W", "o", "r", "l", "d"]`
- `nextCharacters` = `"Hel"` (first 3)
- New buffer = `"lo World"` (remaining 8)

---

### Updating the displayed response

```ts
displayedReplyRef.current += nextCharacters;
```

Appends the consumed characters to the accumulated displayed text. If `displayedReplyRef.current` was `"Hel"` and `nextCharacters` is `"lo "`, it becomes `"Hello "`.

---

### Updating Zustand messages

```ts
setMessages((prev) => {
  const updated = [...prev];
  if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
    updated[updated.length - 1] = {
      role: 'assistant',
      content: displayedReplyRef.current,
    };
  }
  return updated;
});
```

**`setMessages((prev) => { ... })`**: Uses the updater function form. `prev` is the **current** messages array from Zustand at the moment this update runs, avoiding stale closure issues.

**`const updated = [...prev]`**: Creates a shallow copy of the messages array. This is required because Zustand (like React) detects changes by reference. Mutating the existing array would not trigger a re-render.

**The guard condition:**

```ts
if (updated.length > 0 && updated[updated.length - 1].role === 'assistant')
```

This checks two things:
1. The array is not empty.
2. The **last** message is an assistant message.

**Why this guard exists:** The display loop assumes that the last message is the assistant placeholder created by `handleSubmit`. But in edge cases (such as rapid state changes or race conditions), the last message might not be an assistant message. Without this guard, the code could overwrite a user message or the system message with assistant content, corrupting the conversation.

**`updated[updated.length - 1] = { role: 'assistant', content: displayedReplyRef.current }`**: Replaces the last assistant message with a new object containing the latest displayed text. This triggers React to re-render [`ChatMessage`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatMessage.tsx), which displays the updated content using `ReactMarkdown`.

---

## 13. stopGeneration

```ts
const stopGeneration = useCallback(() => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
  stopDisplayLoop();
  bufferRef.current = '';
  streamDoneRef.current = true;
  setLoading(false);
}, [stopDisplayLoop, setLoading]);
```

### Step-by-step trace

**Step 1: `abortControllerRef.current.abort()`**

`AbortController` is a browser API that provides a mechanism to cancel asynchronous operations. When you create an `AbortController`, it has a `.signal` property. That signal is passed to `fetch()`. When you call `.abort()`:

1. The controller's signal transitions to an "aborted" state.
2. The `fetch` promise rejects with an `AbortError`.
3. The underlying HTTP connection is terminated.
4. The `ReadableStream` reader rejects any pending `.read()` call.
5. On the server side, the Express response's `close` event fires.

**Step 2: `abortControllerRef.current = null`**

Clears the reference. There is no longer an active request to cancel.

**Step 3: `stopDisplayLoop()`**

Clears the `setInterval` so the display timer stops consuming the buffer. Without this, the interval would keep running and attempting to update state.

**Step 4: `bufferRef.current = ''`**

Discards any text that was received from the stream but not yet displayed. This text will never be shown to the user.

**Step 5: `streamDoneRef.current = true`**

Marks the stream as finished. Even though the stream was aborted (not completed naturally), this flag is set to `true` to ensure that if the display loop somehow restarts, it would see the stream as done.

**Step 6: `setLoading(false)`**

Immediately tells the UI that loading is over. The "Thinking..." indicator disappears.

### User experience

When the user presses a "Stop Generation" button:

1. The assistant's response freezes at whatever has been displayed so far.
2. Any buffered but not-yet-displayed text is discarded.
3. The loading indicator disappears.
4. The network request is cancelled (no more data transfer).
5. The partial response remains visible in the chat.

### Cancellation flow traced end to end

```
User clicks Stop
    ↓
stopGeneration() is called
    ↓
abortControllerRef.current.abort()
    ↓
fetch's signal becomes aborted
    ↓
reader.read() rejects with AbortError
    ↓
catch block in handleSubmit catches the AbortError
    ↓
if (err.name === 'AbortError') return;  ← exits silently
    ↓
Meanwhile, stopGeneration() has already:
  - cleared the display timer
  - emptied the buffer
  - set loading to false
    ↓
UI shows partial response, loading indicator gone
```

> [!NOTE]
> In the current [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx), `stopGeneration` is **destructured** from `useChat()` but is **not currently wired** to any button in the template. The functionality is fully implemented and ready to use, but no UI element triggers it yet.

---

## 14. handleSubmit — The Main Entry Point

`handleSubmit` is the function that runs when the user submits a chat message. It orchestrates the entire send-receive-display flow.

```ts
const handleSubmit = async (e: React.FormEvent) => {
```

This is an `async` function because it uses `await` to wait for the fetch response and to read the stream. It is **not** wrapped in `useCallback` — it is a regular arrow function defined inside the hook body, so it is recreated on every render. This is acceptable because it captures the latest values of `messages`, `input`, and `loading` from the Zustand selectors, which it needs to be current.

---

### Phase 1 — Prevent default browser behavior

```ts
e.preventDefault();
```

When a `<form>` is submitted, the browser's default behavior is to navigate to the form's `action` URL (or reload the current page). This would destroy the entire React application state. `preventDefault()` stops that, allowing the JavaScript code to handle the submission instead.

---

### Phase 2 — Guard conditions

```ts
if (!input.trim() || loading) return;
```

Two guards in one line:

**`!input.trim()`**: `input` is the current text from the Zustand store. `.trim()` removes leading and trailing whitespace. If the trimmed string is empty (`""`), it is falsy in JavaScript. The `!` negates it to `true`. Result: **empty or whitespace-only input is rejected.**

**`loading`**: If `loading` is `true`, a request is already in progress. Result: **double-submission is prevented.** The user cannot send another message while the current one is still streaming.

If either condition is true, the function returns early and does nothing.

---

### Phase 3 — Reset streaming state

```ts
stopDisplayLoop();
if (abortControllerRef.current) {
  abortControllerRef.current.abort();
}

bufferRef.current = '';
displayedReplyRef.current = '';
streamDoneRef.current = false;
```

This block cleans up any state from a **previous** request:

- **`stopDisplayLoop()`**: If a previous display timer is somehow still running, stop it.
- **Abort previous controller**: If a previous fetch request is somehow still in flight (shouldn't happen due to the `loading` guard, but defensive coding), cancel it.
- **Clear `bufferRef`**: Remove any leftover buffered text from a previous stream.
- **Clear `displayedReplyRef`**: Reset the accumulated displayed text to empty. The new response starts fresh.
- **Reset `streamDoneRef` to `false`**: The new stream has not started yet, so "stream done" is false.

**Why is this necessary?** This is defensive programming. If any state leaked from a previous interaction, it would contaminate the new request. For example, leftover buffer text would appear before the new response.

---

### Phase 4 — Build the user message

```ts
const userMessage = { role: 'user' as const, content: input.trim() };
```

Creates a message object with:
- `role`: `'user'` — marked with `as const` so TypeScript narrows the type from `string` to the literal `'user'`, matching the `Message` interface's `role: 'user' | 'assistant' | 'system'`.
- `content`: The user's trimmed input text.

---

### Phase 5 — Build the request message history

```ts
const updatedMessages = [...messages, userMessage];
```

**`...messages`**: The spread operator copies every element from the existing `messages` array into a new array. This is **immutable** — the original `messages` array is not modified.

**Why a new array?** React and Zustand detect changes by comparing object references. If you mutated the existing array with `messages.push(userMessage)`, Zustand would still hold the same array reference and would not detect a change. Creating a new array with `[...messages, userMessage]` produces a new reference.

`updatedMessages` now contains the full conversation history including the new user message. This is what will be sent to the backend.

---

### Phase 6 — Optimistic UI update

```ts
setMessages([...updatedMessages, { role: 'assistant', content: '' }]);
```

This does two things in one call:

1. **Adds the user message to the displayed conversation** (via `updatedMessages`).
2. **Adds an empty assistant message** as a placeholder.

**Why add an empty assistant message before the backend responds?**

The display loop works by **replacing the content of the last assistant message** in the array. If no assistant message existed, the display loop would have nothing to update. By creating an empty placeholder, the loop has a target to fill in as content arrives.

This is an **optimistic UI update** — the UI immediately reflects the user's action (their message appears and a blank assistant message is ready) without waiting for the server. This makes the application feel responsive.

---

### Phase 7 — Reset input and set loading

```ts
setInput('');
setLoading(true);
```

**`setInput('')`**: Clears the text input field. In [`ChatInput.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatInput.tsx), the `<textarea>` has `value={input}`, so clearing the Zustand `input` immediately empties the textarea.

**`setLoading(true)`**: Enables the loading state. In [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx), this shows the "Thinking..." indicator. In [`ChatInput.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatInput.tsx), the send button becomes `disabled`.

**What the user sees at this point:**
1. Their message appears in the chat as a user bubble.
2. The input field is cleared.
3. The send button becomes disabled.
4. A "Thinking..." indicator appears.
5. An empty assistant message slot is ready (invisible because it has no content yet).

---

### Phase 8 — Create AbortController

```ts
const controller = new AbortController();
abortControllerRef.current = controller;
```

Creates a new `AbortController` and stores it in the ref. The controller's `.signal` will be passed to `fetch()`. If `stopGeneration()` or the cleanup effect later calls `controller.abort()`, the fetch request will be cancelled.

**Why store in a ref?** The `handleSubmit` function is `async` and may take a long time (the stream could last seconds or minutes). Other functions (`stopGeneration`, the cleanup `useEffect`) need access to the same controller to cancel the request. A ref provides a shared, mutable container accessible from anywhere in the hook.

---

## 15. Frontend → Backend Request

```ts
const response = await fetch('http://localhost:5000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: updatedMessages }),
  signal: controller.signal,
});
```

### Breakdown

| Part | Value | Purpose |
|------|-------|---------|
| URL | `http://localhost:5000/api/chat/stream` | The Express backend's streaming chat endpoint |
| Method | `POST` | Sends data to the server (the conversation messages) |
| `Content-Type` header | `application/json` | Tells the server the request body is JSON |
| Body | `JSON.stringify({ messages: updatedMessages })` | Serializes the message history array into a JSON string |
| Signal | `controller.signal` | Links this fetch to the AbortController so it can be cancelled |

### What the frontend sends

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "What is TypeScript?" },
    { "role": "assistant", "content": "TypeScript is..." },
    { "role": "user", "content": "Tell me more" }
  ]
}
```

The full conversation history is sent every time. This is necessary because the Groq API (like other LLM APIs) is stateless — each request must include the full context.

### Backend route resolution

The request travels through the backend as follows:

**1. Express server** — [`server.ts`](file:///c:/Users/hp/llm-fundamentals/server/server.ts)

```ts
app.use(helmet());                           // Security headers
app.use(cors({ origin: 'http://localhost:5173' })); // Allows the Vite dev server to make cross-origin requests
app.use(express.json({ limit: '2mb' }));     // Parses JSON body up to 2MB
app.use('/api/chat', chatRoutes);            // Mounts chat routes at /api/chat
```

The URL `/api/chat/stream` matches the `/api/chat` prefix, so Express delegates to `chatRoutes`.

**2. Chat routes** — [`chat.routes.ts`](file:///c:/Users/hp/llm-fundamentals/server/routes/chat.routes.ts)

```ts
router.use(limiter);      // Burst rate limiter: max 10 requests per minute per IP
router.use(dailyLimiter); // Daily rate limiter: max 100 requests per day per IP
router.post('/stream', streamChat); // POST /stream → streamChat controller
```

**Rate limiter middleware** — [`rateLimiter.ts`](file:///c:/Users/hp/llm-fundamentals/server/middleware/rateLimiter.ts)

| Limiter | Window | Limit | Error message |
|---------|--------|-------|---------------|
| `limiter` | 1 minute | 10 requests per IP | "Too many requests, please try again later." |
| `dailyLimiter` | 24 hours | 100 requests per IP | "Daily request limit exceeded. Please try again tomorrow." |

If rate-limited, the middleware returns a JSON error response, which the hook handles in the `!response.ok` branch.

**3. Controller** — [`chat.controller.ts`](file:///c:/Users/hp/llm-fundamentals/server/controllers/chat.controller.ts)

```ts
export const streamChat = async (req: Request, res: Response) => {
```

**Step 1 — Validation** using Zod schema ([`chat.schema.ts`](file:///c:/Users/hp/llm-fundamentals/server/schemas/chat.schema.ts)):

```ts
const validationResult = chatRequestSchema.safeParse(req.body);
```

The schema requires:
- `messages`: An array of 1–100 objects, each with:
  - `role`: One of `'user'`, `'assistant'`, `'system'`
  - `content`: A string, 1–10,000 characters

If validation fails, the controller returns a `400` response with `{ error: 'Content is over 10,000 characters' }`.

**Step 2 — Set SSE headers:**

```ts
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');  // Prevents Nginx from buffering
res.flushHeaders(); // Sends headers immediately
```

**Step 3 — Call Groq** via [`groq.service.ts`](file:///c:/Users/hp/llm-fundamentals/server/services/groq.service.ts):

```ts
const stream = await groq.chat.completions.create({
  model: 'openai/gpt-oss-120b',
  messages,
  temperature: 0.5,
  max_tokens: 2048,
  stream: true,
});
```

**Step 4 — Stream chunks as SSE events:**

```ts
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content ?? '';
  if (chunk.x_groq?.usage) totalUsage = chunk.x_groq.usage;
  if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
}
```

Each SSE event looks like: `data: {"content":"Hello"}\n\n`

**Step 5 — Send usage and done:**

```ts
if (totalUsage) res.write(`data: ${JSON.stringify({ usage: totalUsage })}\n\n`);
res.write(`data: [DONE]\n\n`);
res.end();
```

**Step 6 — Error handling:**

If the Groq call fails:
- If headers haven't been sent: returns `500 { error: 'Connection Failed.' }`
- If headers have been sent (stream already started): writes `data: {"error":"Connection failed"}\n\n` as an SSE event and ends

---

## 16. AbortController and Fetch

### The relationship

```
AbortController  (created by handleSubmit)
        │
        └── .signal  (passed to fetch)
                │
                └── fetch()  (monitors the signal)
                        │
                        └── HTTP request  (active connection)
```

### What happens when abort() is called

1. `controller.abort()` is called (from `stopGeneration` or the cleanup effect).
2. The signal transitions to an aborted state.
3. `fetch` detects the aborted signal.
4. The in-flight HTTP connection is terminated immediately.
5. The `fetch` promise rejects with a `DOMException` whose `.name` is `'AbortError'`.
6. If the code was inside `await reader.read()`, that promise also rejects with the same error.
7. Execution jumps to the `catch` block.

### Why AbortError is handled specially

```ts
if (err.name === 'AbortError') {
  return;
}
```

An `AbortError` is **not an unexpected error**. It means the user intentionally cancelled the request (or the component unmounted). There is no need to:
- Log it as an error.
- Display an error message.
- Update the assistant message with an error.

The function simply returns silently. The `stopGeneration` function (or the cleanup effect) has already handled the necessary state cleanup.

---

## 17. Response Validation

```ts
if (!response.ok) {
  let errorMessage = 'Connection Failed. Check network connection and Try Again';
  try {
    const errorData = await response.json();
    if (errorData && (errorData.error || errorData.message)) {
      errorMessage = errorData.error || errorData.message;
    }
  // eslint-disable-next-line no-empty
  } catch (e) {}
  throw new Error(errorMessage);
}
```

### `response.ok`

`response.ok` is a boolean property of the Fetch API's `Response` object. It is `true` when the HTTP status code is in the range 200–299. It is `false` for status codes like 400, 429 (rate limited), 500, etc.

### Attempting to read the error body

The code tries to parse the response body as JSON with `response.json()`. This is because the backend sends structured error responses:

- Validation error (400): `{ error: 'Content is over 10,000 characters' }`
- Rate limit (429): `{ error: 'Too many requests, please try again later.' }`
- Server error (500): `{ error: 'Connection Failed.' }`

If `errorData.error` or `errorData.message` exists, it uses that as the error message.

### The empty catch block

```ts
} catch (e) {}
```

If `response.json()` fails (e.g., the response body is not valid JSON, or the body has already been consumed), the catch block swallows the error silently. The code falls through to use the default error message: `'Connection Failed. Check network connection and Try Again'`.

The `// eslint-disable-next-line no-empty` comment suppresses the ESLint warning about empty catch blocks. This is intentional — the default `errorMessage` is already set, so no action is needed in the catch.

### Throwing the error

```ts
throw new Error(errorMessage);
```

This throws a `new Error` that will be caught by the outer `catch (err: any)` block, which handles it by displaying the error message in the assistant message bubble.

---

## 18. Streaming Response

### response.body check

```ts
if (!response.body) throw new Error('Connection Failed. No response body.');
```

`response.body` is a `ReadableStream` or `null`. It is `null` in rare cases (e.g., responses with no body). This guard ensures the stream exists before trying to read it.

### The streaming pipeline

```ts
const reader = response.body.getReader();
const decoder = new TextDecoder();
```

**`response.body`**: A `ReadableStream<Uint8Array>` — a stream of raw bytes representing the HTTP response body. Unlike a regular response, this body arrives in chunks over time as the server writes to it.

**`getReader()`**: Creates a `ReadableStreamDefaultReader` — an object with a `.read()` method that returns chunks one at a time. Once you get a reader, you "lock" the stream — no other code can read from it.

**`TextDecoder`**: A browser API that converts raw bytes (`Uint8Array`) into a JavaScript string. It handles multi-byte character encoding (UTF-8) correctly.

### Reader loop

```ts
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  parser.feed(decoder.decode(value, { stream: true }));

  if (streamError) {
    throw new Error(streamError);
  }
}
```

**`while (true)`**: An infinite loop. This is standard for reading streams — you keep reading until the stream signals it is done.

**`await reader.read()`**: Returns a promise that resolves to an object with:
- `value`: A `Uint8Array` containing the next chunk of bytes, or `undefined` when done.
- `done`: A boolean. `true` when the stream has ended (no more data will come). `false` while data is still arriving.

**`if (done) break;`**: Exits the loop when the stream ends.

**`decoder.decode(value, { stream: true })`**: Converts the byte chunk to a string. The `{ stream: true }` option is critical: it tells the decoder that **more data is coming**. Without this option, if a multi-byte UTF-8 character is split across two chunks (the first chunk has the first byte, the next chunk has the remaining bytes), the decoder would produce a replacement character (�) for the incomplete sequence. With `{ stream: true }`, the decoder buffers the incomplete bytes and waits for the next chunk to complete them.

**`parser.feed(...)`**: Feeds the decoded text into the SSE parser. The parser processes the text, looking for `data:` lines, and fires `onEvent` callbacks for complete events.

**`if (streamError)`**: After feeding each chunk to the parser, the code checks if the `onEvent` callback set a `streamError`. If so, the loop throws immediately rather than continuing to read.

---

## 19. SSE Parser

### createParser

```ts
const parser = createParser({
  onEvent(event: EventSourceMessage) {
    const data = event.data;
    // ...
  },
});
```

`createParser` is from the `eventsource-parser` library. It creates a parser that understands the Server-Sent Events text format. SSE events look like this in raw text:

```
data: {"content":"Hello"}\n
\n
data: {"content":" world"}\n
\n
data: [DONE]\n
\n
```

The parser handles:
- Identifying `data:` lines.
- Handling multi-line data.
- Recognizing event boundaries (double newlines).
- Firing the `onEvent` callback with a structured `EventSourceMessage` object.

### EventSourceMessage

The `EventSourceMessage` type represents a parsed SSE event. The key property used here is:
- `event.data`: The string content of the `data:` field.

### Event types handled

---

#### [DONE]

```ts
if (data === '[DONE]') {
  streamDoneRef.current = true;
  return;
}
```

The `[DONE]` sentinel is sent by the backend after all content chunks and usage data. It signals that no more events will follow. The hook sets `streamDoneRef.current = true`, which tells the display loop that when the buffer is empty, it can safely stop.

---

#### JSON response — parsing

```ts
try {
  const parsed = JSON.parse(data);
```

All non-`[DONE]` events are expected to be JSON strings. `JSON.parse` converts the string to a JavaScript object.

---

#### Error event

```ts
if (parsed.error) {
  streamError = typeof parsed.error === 'string' ? parsed.error : 'Streaming failed';
  return;
}
```

The backend sends error events when the Groq call fails mid-stream (after headers were already sent):

```
data: {"error":"Connection failed"}\n\n
```

The code checks if `parsed.error` is a string (use it directly) or some other type (use a generic fallback). The error is stored in `streamError`, which is checked in the reader loop.

---

#### Content event

```ts
if (parsed.content) {
  bufferRef.current += parsed.content;
  startDisplayLoop();
}
```

This is the main data path. Each content event adds text to the buffer. Then `startDisplayLoop()` is called, which starts the display timer **if it is not already running** (the guard inside `startDisplayLoop` prevents duplicates).

This is where Process A (receiving) feeds into Process B (displaying).

---

#### Usage event

```ts
if (parsed.usage) {
  setTokenUsage({
    prompt: parsed.usage.prompt_tokens,
    completion: parsed.usage.completion_tokens,
    total: parsed.usage.total_tokens,
  });
}
```

The backend sends a usage event after all content, before `[DONE]`. It contains token counts from the Groq API. The hook maps the backend field names to the frontend field names:

| Backend field | Frontend field |
|---------------|----------------|
| `prompt_tokens` | `prompt` |
| `completion_tokens` | `completion` |
| `total_tokens` | `total` |

After `setTokenUsage` updates Zustand, the [`Header`](file:///c:/Users/hp/llm-fundamentals/src/components/ui/Header.tsx) component re-renders and displays the total token count:

```tsx
{tokenUsage && (
  <span>Tokens: <strong>{tokenUsage.total}</strong></span>
)}
```

---

#### SSE JSON parse error

```ts
} catch (error) {
  console.error('SSE JSON parse error:', data, error);
}
```

If `JSON.parse` fails (malformed JSON in an event), the error is logged but **not** thrown. The stream continues processing subsequent events. This is a resilience measure — one bad event should not crash the entire stream.

---

## 20. Stream Error Handling

### The streamError variable

```ts
let streamError: string | null = null;
```

This is a **local variable** inside `handleSubmit`, typed as `string | null`. It starts as `null` (no error) and is set to a string if the SSE parser encounters an error event.

### Why string | null?

- `null` represents "no error has occurred."
- A `string` represents an error message received from the backend.
- The code checks `if (streamError)` — in JavaScript, `null` is falsy and a non-empty string is truthy.

### How it is changed

Inside the `onEvent` callback:

```ts
if (parsed.error) {
  streamError = typeof parsed.error === 'string' ? parsed.error : 'Streaming failed';
  return;
}
```

### Where it is checked

**Inside the reader loop:**

```ts
if (streamError) {
  throw new Error(streamError);
}
```

After each chunk is fed to the parser, the loop checks if an error event was received. If so, it immediately throws, breaking out of the loop and into the `catch` block.

**After the reader loop:**

```ts
parser.feed(decoder.decode()); // flush remaining bytes

if (streamError) {
  throw new Error(streamError);
}
```

Even after the stream ends naturally, the code checks one more time. The final `decoder.decode()` call might flush remaining bytes that contain an error event.

### How the error becomes a thrown error

`throw new Error(streamError)` creates a standard JavaScript `Error` object with the backend's error message. This is caught by the `catch (err: any)` block at the bottom of `handleSubmit`, which displays it as an error message in the assistant bubble.

---

## 21. Token Usage

### The parsed.usage section

```ts
if (parsed.usage) {
  setTokenUsage({
    prompt: parsed.usage.prompt_tokens,
    completion: parsed.usage.completion_tokens,
    total: parsed.usage.total_tokens,
  });
}
```

### Field mapping

| Backend (Groq API format) | Frontend (TokenUsage interface) | Meaning |
|---|---|---|
| `parsed.usage.prompt_tokens` | `prompt` | Number of tokens in the input (system prompt + conversation history + user message) |
| `parsed.usage.completion_tokens` | `completion` | Number of tokens the model generated in its response |
| `parsed.usage.total_tokens` | `total` | Sum of prompt and completion tokens |

### Where the data originates

In the backend controller, usage is extracted from the Groq stream:

```ts
if (chunk.x_groq?.usage) totalUsage = chunk.x_groq.usage;
```

And sent as an SSE event after all content:

```ts
if (totalUsage) res.write(`data: ${JSON.stringify({ usage: totalUsage })}\n\n`);
```

### Where the data goes

`setTokenUsage(...)` updates the Zustand store's `tokenUsage` property. The [`Header`](file:///c:/Users/hp/llm-fundamentals/src/components/ui/Header.tsx) component subscribes to this via:

```ts
const tokenUsage = useChatStore((state) => state.tokenUsage);  // in App.tsx
// passed as prop to Header:
<Header tokenUsage={tokenUsage} ... />
```

And displays it:

```tsx
{tokenUsage && (
  <span>Tokens: <strong className="text-slate-200">{tokenUsage.total}</strong></span>
)}
```

---

## 22. Reader Loop

```ts
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  parser.feed(decoder.decode(value, { stream: true }));

  if (streamError) {
    throw new Error(streamError);
  }
}
```

### Why an infinite loop?

Stream reading is inherently indefinite — you don't know in advance how many chunks the server will send. The pattern `while (true) { ... if (done) break; }` is the standard way to consume a `ReadableStream` in JavaScript.

### How `reader.read()` works

`reader.read()` returns a `Promise<{ value: Uint8Array | undefined, done: boolean }>`.

- The promise **suspends** until the next chunk arrives from the network. During this time, the JavaScript event loop is free to handle other tasks (like the display loop's `setInterval` callbacks).
- When a chunk arrives, the promise resolves with `{ value: Uint8Array, done: false }`.
- When the stream ends, the promise resolves with `{ value: undefined, done: true }`.

### What `value` is

`value` is a `Uint8Array` — a typed array of raw bytes. This is the raw data from the HTTP response, which could be a partial SSE event, a complete event, or multiple events. The `TextDecoder` converts these bytes to a string.

### What `done` is

`done` is `true` when the server has closed the connection (called `res.end()` in the Express controller). This means no more data will arrive.

### `decoder.decode(value, { stream: true })`

The `{ stream: true }` option is critical for correctness:

- UTF-8 characters can be 1–4 bytes long.
- Network chunks can split a multi-byte character in the middle.
- With `{ stream: true }`, the decoder keeps incomplete bytes in an internal buffer and waits for the next chunk to complete them.
- Without it, incomplete bytes would be decoded as replacement characters (�), corrupting the text.

---

## 23. Final Stream Flush

```ts
parser.feed(decoder.decode());
```

After the reader loop exits (stream is `done`), this line calls `decoder.decode()` with **no arguments**. This flushes any bytes remaining in the decoder's internal buffer. When `{ stream: true }` was used during the loop, the decoder may have buffered incomplete characters. This final call with no arguments and no `{ stream: true }` tells the decoder: "There is no more data. Output whatever you have."

The flushed text is fed to the SSE parser, which may produce one final event if the flushed text completes an SSE message boundary.

```ts
if (streamError) {
  throw new Error(streamError);
}
```

Checks one final time for any error event that the flush might have completed.

```ts
streamDoneRef.current = true;
startDisplayLoop();
```

### Why start the display loop after the stream ends?

There is a critical distinction:

### Network stream finished

The backend has sent all data and closed the connection. `reader.read()` returned `{ done: true }`. No more bytes will arrive.

### UI animation finished

All buffered text has been drained from `bufferRef` into `displayedReplyRef` and pushed to Zustand. The user sees the complete response.

**These are NOT the same moment.**

When the network stream ends, there may still be unseen characters sitting in `bufferRef.current`. The display loop needs to continue running to drain them.

`streamDoneRef.current = true` tells the display loop: "When the buffer is empty, you can stop and set `loading` to `false`."

`startDisplayLoop()` ensures the display loop is running. This call is important because:
- If the stream sent all its content in the very last chunk, the display loop might not have been started yet (if `startDisplayLoop` was only called from `onEvent` and the guard prevented a restart).
- This guarantees the loop runs and processes any remaining buffer.

---

## 24. Error Handling

```ts
} catch (err: any) {
```

### `err: any`

TypeScript normally types `catch` errors as `unknown`. By annotating `err: any`, the code can access `err.name` and `err.message` without type guards. The `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment above suppresses the ESLint rule that discourages `any`.

---

### AbortError special case

```ts
if (err.name === 'AbortError') {
  return;
}
```

If the fetch was cancelled by `abort()`, exit silently. No error message is displayed. The `stopGeneration` function or the cleanup effect has already handled state cleanup. See [Section 16](#16-abortcontroller-and-fetch) for details.

---

### Error logging and cleanup

```ts
console.error(err);
stopDisplayLoop();
bufferRef.current = '';
streamDoneRef.current = true;
setLoading(false);
```

1. **`console.error(err)`**: Logs the error to the browser console for developer debugging.
2. **`stopDisplayLoop()`**: Stops the display timer. No point animating when there's an error.
3. **`bufferRef.current = ''`**: Discards any buffered text.
4. **`streamDoneRef.current = true`**: Marks the stream as done.
5. **`setLoading(false)`**: Removes the loading indicator.

---

### User-friendly error message

```ts
const errorMessage = err.message === 'Failed to fetch'
  ? 'Connection Failed. Please check your network and server connection.'
  : (err.message || 'An unexpected error occurred');
```

`'Failed to fetch'` is the browser's generic error when the network request cannot reach the server at all (server not running, no internet, DNS failure, etc.). This message is replaced with a more helpful one.

For all other errors, the actual error message is used, with a fallback to `'An unexpected error occurred'` if `err.message` is falsy.

---

### Replacing the assistant placeholder

```ts
setMessages((prev) => [
  ...prev.slice(0, -1),
  { role: 'assistant', content: `Error: ${errorMessage}` },
]);
```

**`(prev) => ...`**: Updater function form. `prev` is the current messages array.

**`prev.slice(0, -1)`**: Creates a new array containing all messages **except the last one**. The last message is the empty assistant placeholder that was added in Phase 6. Since the stream failed, this placeholder is useless.

**`{ role: 'assistant', content: \`Error: ${errorMessage}\` }`**: A new assistant message containing the error text, prefixed with "Error:".

**Result:** The empty placeholder is replaced with an error message. The user sees something like:

> Error: Connection Failed. Please check your network and server connection.

in the assistant message bubble.

---

## 25. Cleanup and Lifecycle

When the component using `useChat` (which is [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx)) unmounts, the cleanup effect runs:

```ts
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
    }
  };
}, []);
```

### Trace

```
Component unmounts (e.g., user navigates away)
    ↓
React runs the cleanup function returned by the useEffect
    ↓
If abortControllerRef.current is not null:
    abort() is called → cancels the in-flight fetch request
    ↓
If displayTimerRef.current is not null:
    clearInterval() is called → stops the display animation timer
```

### What this prevents

| Problem without cleanup | What happens |
|------------------------|--------------|
| Request continues after UI is gone | The fetch keeps downloading data that nobody will ever see, wasting bandwidth |
| Timer continues after unmount | The `setInterval` callback fires and calls `setMessages`, attempting to update state on an unmounted component. React logs warnings: "Can't perform a React state update on an unmounted component" |
| Memory leaks | The refs, closures, and stream reader would be retained in memory by the active timer/fetch |

---

## 26. Frontend UI Relationship

### How App.tsx uses useChat

```tsx
const {
  chatContainerRef,
  messagesEndRef,
  handleScroll,
  scrollToBottom,
  handleSubmit
} = useChat();
```

> [!NOTE]
> `stopGeneration` is defined and returned by the hook but is **not destructured** in the current [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx). It is available for future use (e.g., a "Stop" button).

### Return value usage table

| useChat return value | Frontend consumer | How it is used | What the user sees |
|---|---|---|---|
| `chatContainerRef` | [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) line 38: `<div ref={chatContainerRef}>` | Attached to the scrollable messages container div. The hook reads its `scrollTop`, `scrollHeight`, `clientHeight` properties | The scrollable chat area — user scrolls up and down through messages |
| `messagesEndRef` | [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) line 55: `<div ref={messagesEndRef} />` | Attached to an invisible empty div at the bottom of the message list. `scrollToBottom` calls `scrollIntoView` on it | Nothing visible — it's an invisible scroll anchor |
| `handleScroll` | [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) line 39: `onScroll={handleScroll}` | Fires every time the user scrolls the chat container. Updates `showScrollButton` in Zustand | The scroll-to-bottom button appears when the user scrolls up, disappears when near the bottom |
| `scrollToBottom` | [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) line 60: `<ScrollButton onClick={() => scrollToBottom('smooth')} />` | Passed as the click handler for the [`ScrollButton`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ScrollButton.tsx) | Clicking the down-arrow button smoothly scrolls to the latest message |
| `handleSubmit` | [`App.tsx`](file:///c:/Users/hp/llm-fundamentals/src/App.tsx) line 61: `<ChatInput onSubmit={handleSubmit} />` → [`ChatInput.tsx`](file:///c:/Users/hp/llm-fundamentals/src/components/chat/ChatInput.tsx) line 30: `<form onSubmit={onSubmit}>` | Fired by the form's `onSubmit` event (send button or Enter key). Triggers the entire send/receive/display pipeline | User's message appears, assistant starts responding with a typing animation |
| `stopGeneration` | Not currently wired to any UI element | Available but unused in the current template | N/A (would allow a "Stop" button to cancel streaming) |

---

## 27. Complete Frontend/Backend Data Flow

The following traces the complete lifecycle of a single user message, verified against the actual code:

```
User types message in <textarea>
    ↓
ChatInput.tsx: textarea onChange → setInput(e.target.value) → Zustand input updated
    ↓
User presses Enter (or clicks Send)
    ↓
ChatInput.tsx: form onSubmit → handleSubmit(e) called
    ↓
handleSubmit: e.preventDefault() stops browser form submission
    ↓
handleSubmit: validates input not empty and not loading
    ↓
handleSubmit: resets streaming state (buffer, displayedReply, streamDone)
    ↓
handleSubmit: builds userMessage { role: 'user', content: input.trim() }
    ↓
handleSubmit: builds updatedMessages = [...messages, userMessage]
    ↓
handleSubmit: setMessages([...updatedMessages, { role: 'assistant', content: '' }])
    ↓
Zustand: messages updated → App.tsx re-renders → user message + empty assistant bubble appear
    ↓
handleSubmit: setInput('') → textarea clears
    ↓
handleSubmit: setLoading(true) → "Thinking..." indicator appears, send button disables
    ↓
handleSubmit: creates AbortController, stores in ref
    ↓
handleSubmit: fetch POST to http://localhost:5000/api/chat/stream
    ↓
Express: server.ts receives request
    ↓
Express: helmet() adds security headers
    ↓
Express: cors() validates origin is http://localhost:5173
    ↓
Express: express.json() parses JSON body
    ↓
Express: /api/chat routes → limiter middleware checks burst rate (10/min)
    ↓
Express: dailyLimiter middleware checks daily rate (100/day)
    ↓
Express: POST /stream → streamChat controller
    ↓
Controller: chatRequestSchema.safeParse(req.body) validates messages with Zod
    ↓
Controller: sets SSE headers, flushes headers
    ↓
Controller: groq.chat.completions.create({ stream: true, model: 'openai/gpt-oss-120b' })
    ↓
Groq API: returns async iterable stream of chunks
    ↓
Controller: for await (const chunk of stream) → writes data: {"content":"..."}\n\n
    ↓
useChat: response.body.getReader() obtains a ReadableStream reader
    ↓
useChat: while(true) { reader.read() } reads chunks
    ↓
useChat: TextDecoder converts Uint8Array → string
    ↓
useChat: parser.feed() processes SSE text
    ↓
useChat: onEvent fires for each complete SSE event
    ↓
onEvent: parsed.content → bufferRef.current += content
    ↓
onEvent: startDisplayLoop() → creates setInterval(20ms) if not running
    ↓
Display loop: slices characters from bufferRef
    ↓
Display loop: appends to displayedReplyRef
    ↓
Display loop: setMessages() updates last assistant message in Zustand
    ↓
Zustand: messages updated → React re-renders → ChatMessage shows new text
    ↓
Auto-scroll useEffect: if user is near bottom → scrolls to latest content
    ↓
(repeat for each chunk until stream ends)
    ↓
Controller: writes data: {"usage":{...}}\n\n → onEvent: setTokenUsage()
    ↓
Controller: writes data: [DONE]\n\n → onEvent: streamDoneRef = true
    ↓
Controller: res.end() → reader.read() returns { done: true }
    ↓
useChat: exits reader loop
    ↓
useChat: parser.feed(decoder.decode()) flushes decoder
    ↓
useChat: streamDoneRef = true, startDisplayLoop()
    ↓
Display loop: buffer drains to empty
    ↓
Display loop: streamDoneRef is true + buffer empty → clearInterval, setLoading(false)
    ↓
Zustand: loading = false → "Thinking..." disappears, send button re-enables
    ↓
Header: tokenUsage displays total token count
    ↓
User sees complete assistant response
```

---

## 28. State vs Ref vs Local Variable

### Zustand state — shared, reactive, UI-driving

| Value | Why it belongs in Zustand |
|-------|--------------------------|
| `messages` | Multiple components need it: `App.tsx` renders the message list, `ChatMessage` displays each message. Changes must trigger re-renders |
| `input` | `ChatInput` binds the textarea to it. `handleSubmit` reads it. It must be shared and reactive |
| `loading` | `App.tsx` shows "Thinking...", `ChatInput` disables the send button. Multiple consumers need it |
| `tokenUsage` | `Header` displays it. It must persist and be reactive |
| `showScrollButton` | `ScrollButton` conditionally renders based on it. Must trigger re-renders |

**Key characteristic:** Changing Zustand state **causes** React components that subscribe to the changed slice to **re-render**.

---

### useRef — mutable, silent, internal bookkeeping

| Ref | Why it belongs in a ref |
|-----|----------------------|
| `bufferRef` | Updated potentially dozens of times per second during streaming. If it were state, each update would trigger a re-render — but nobody needs to see the raw buffer |
| `displayTimerRef` | A timer handle. Internal plumbing. No UI renders based on "what the timer ID is" |
| `streamDoneRef` | A flag checked inside a `setInterval` callback. Using state would create stale closure problems (the interval would capture the old value) |
| `displayedReplyRef` | Accumulated text updated 50 times/second. The UI is updated separately via `setMessages`. Making this state would double the re-renders |
| `abortControllerRef` | Infrastructure for cancelling fetch. No component renders based on it |
| `chatContainerRef` | Standard DOM ref for accessing the scroll container |
| `messagesEndRef` | Standard DOM ref for the scroll anchor |

**Key characteristic:** Changing `.current` does **NOT** cause a re-render. This is exactly why refs are used for high-frequency internal mutations.

---

### Local variables — ephemeral, single-execution scope

| Variable | Why it is a local variable |
|----------|---------------------------|
| `userMessage` | Constructed and used within a single `handleSubmit` call. No need to persist |
| `updatedMessages` | Built for the current submission, sent to backend, then not needed |
| `response` | The fetch response for the current request only |
| `reader` | The stream reader for the current request only |
| `decoder` | The text decoder for the current request only |
| `streamError` | Tracks whether an error occurred during the current stream. Reset naturally for each new `handleSubmit` call because a new local variable is created |
| `parser` | The SSE parser for the current stream. Each new submission creates a new parser |

**Key characteristic:** These exist only during the execution of their containing function. When the function finishes, they are garbage collected (unless captured by closures like `onEvent`).

---

## 29. Execution Timeline

| Time | Event | Detail |
|------|-------|--------|
| T0 | User submits form | Presses Enter or clicks Send button |
| T1 | `handleSubmit` is called | `e.preventDefault()` stops page reload |
| T2 | Input validated | `!input.trim() \|\| loading` check passes |
| T3 | Previous state cleaned | `stopDisplayLoop()`, abort existing controller, clear refs |
| T4 | User message built | `{ role: 'user', content: '...' }` |
| T5 | Messages updated in Zustand | User message + empty assistant placeholder added |
| T6 | Input cleared, loading set | `setInput('')`, `setLoading(true)` |
| T7 | AbortController created | Stored in `abortControllerRef` |
| T8 | `fetch()` sends POST request | HTTP request leaves the browser |
| T9 | Express receives request | Helmet, CORS, JSON parsing, rate limiting run |
| T10 | Controller validates | Zod schema checks messages array |
| T11 | SSE headers sent | `Content-Type: text/event-stream`, headers flushed |
| T12 | Groq stream begins | `groq.chat.completions.create()` returns async iterable |
| T13 | First chunk arrives at frontend | `reader.read()` resolves with first `Uint8Array` |
| T14 | Decoded and parsed | `TextDecoder` → `parser.feed()` → `onEvent` fires |
| T15 | Content enters buffer | `bufferRef.current += parsed.content` |
| T16 | Display loop starts | `startDisplayLoop()` creates `setInterval(20ms)` |
| T17 | First characters displayed | Display loop slices characters, calls `setMessages()` |
| T18 | React re-renders | `ChatMessage` shows first characters of response |
| T19 | Auto-scroll fires | If user is near bottom, `scrollToBottom()` is called |
| T20-Tn | Streaming continues | More chunks arrive, buffer fills and drains, messages update |
| Tn+1 | Usage event arrives | `setTokenUsage()` updates Zustand → Header shows token count |
| Tn+2 | `[DONE]` event arrives | `streamDoneRef.current = true` |
| Tn+3 | Reader loop exits | `reader.read()` returns `{ done: true }` |
| Tn+4 | Decoder flushed | `parser.feed(decoder.decode())` |
| Tn+5 | `startDisplayLoop()` called again | Ensures loop runs to drain remaining buffer |
| Tn+6 | Buffer fully drained | Display loop sees empty buffer + `streamDoneRef` is true |
| Tn+7 | Loop stops, loading ends | `clearInterval()`, `setLoading(false)` |
| Tn+8 | UI settles | "Thinking..." gone, send button re-enabled, complete response visible |

---

## 30. Frontend Impact

- Handles sending chat messages to the Express backend via `fetch` POST.
- Receives and parses the streamed assistant response as Server-Sent Events.
- Updates the Zustand chat store as content arrives.
- Produces the progressive typing animation effect via a buffer/display-loop architecture.
- Controls the `loading` state — enabling it before the request, disabling it only after all buffered content is displayed.
- Enables cancellation of an in-flight request and display loop via `stopGeneration`.
- Controls automatic scrolling to new content when the user is near the bottom.
- Shows and hides a scroll-to-bottom button based on the user's scroll position.
- Updates token usage in Zustand when the backend sends usage data.
- Handles connection errors, backend errors, and stream errors by displaying them as assistant messages.
- Cleans up all resources (fetch, timers) when the component unmounts.

---

## 31. Key Concepts Used in useChat

| Concept | How it appears in this hook |
|---------|---------------------------|
| **Custom React hooks** | `useChat` itself is a custom hook — a function starting with `use` that composes built-in hooks |
| **Zustand selectors** | `useChatStore((state) => state.messages)` — subscribe to a specific slice of the store to avoid unnecessary re-renders |
| **React state vs refs** | Zustand state drives UI re-renders; refs store high-frequency internal values without triggering renders |
| **useRef** | Seven refs used for DOM elements, mutable buffers, timer handles, abort controllers, and flags |
| **useEffect** | Two effects: one for auto-scrolling on message changes, one for cleanup on unmount |
| **useCallback** | Four memoized functions: `scrollToBottom`, `stopDisplayLoop`, `startDisplayLoop`, `stopGeneration` — prevents unnecessary recreation and stabilizes dependency arrays |
| **AbortController** | Creates a cancellation mechanism for `fetch`. Signal is passed to fetch; calling `.abort()` cancels the request and rejects the promise with `AbortError` |
| **Fetch API** | `fetch()` sends the POST request with JSON body, headers, and abort signal. Returns a `Response` with a `ReadableStream` body |
| **ReadableStream** | `response.body` is a readable stream. `.getReader()` creates a reader that pulls chunks with `.read()` |
| **TextDecoder** | Converts `Uint8Array` byte chunks to strings. `{ stream: true }` option handles multi-byte characters split across chunks |
| **Server-Sent Events (SSE)** | The backend sends `data: {...}\n\n` formatted events. The frontend parses them with `eventsource-parser` |
| **SSE parsing** | `createParser` from `eventsource-parser` handles the SSE text protocol, firing `onEvent` for each complete event |
| **Async/await** | `handleSubmit` is `async` — it `await`s the `fetch` response and each `reader.read()` call |
| **Promise handling** | `reader.read()` returns promises that resolve with stream chunks. `fetch()` returns a promise that resolves with the response |
| **TypeScript typing** | Type annotations (`React.FormEvent`, `ScrollBehavior`, `HTMLDivElement`), generics (`useRef<T>`), utility types (`ReturnType<typeof setInterval>`), const assertions (`as const`), union types (`string \| null`), type-only imports (`type EventSourceMessage`) |
| **Immutable state updates** | `[...prev]` spread creates new arrays. Never mutates existing arrays or objects in Zustand |
| **Error handling** | Try/catch with specific handling for `AbortError`, stream errors, network errors, and backend error responses |
| **Streaming UI** | Two-process architecture: one process receives data into a buffer, another drains the buffer on a timer to create smooth animation |
| **Resource cleanup** | `useEffect` return function aborts fetch and clears timers on unmount, preventing memory leaks and state update warnings |
| **setInterval / clearInterval** | Used to create the 20ms display loop timer. Properly cleared in cleanup paths |
| **Optional chaining** | `messagesEndRef.current?.scrollIntoView(...)` — safely handles null refs |
| **DOM scroll properties** | `scrollTop`, `scrollHeight`, `clientHeight` — used to measure scroll position and determine auto-scroll behavior |
| **Unicode-safe string handling** | `Array.from(string)` properly splits multi-byte characters (emojis) that `string.slice()` would corrupt |
