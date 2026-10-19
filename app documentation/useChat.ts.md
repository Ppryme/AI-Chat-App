# useChat.ts

## Purpose of the File
`useChat.ts` is the primary custom React hook powering the frontend chat experience. It coordinates message submission, invokes the streaming HTTP API (`/api/chat/stream`), parses incoming Server-Sent Events (SSE) via `eventsource-parser`, implements an interval-based typewriter display buffer, manages auto-scrolling geometry, handles request aborting (`AbortController`), and handles switching/loading past conversation message history from the database.

---

## Line-by-Line Code Breakdown

- **L1**: Disables ESLint unused variables rule for catch parameters and debug symbols.
- **L2**: Imports `useRef`, `useEffect`, `useCallback` hooks from `react` for mutable state, lifecycle control, and stable memoized callbacks.
- **L3**: Imports `createParser` and `EventSourceMessage` type from `eventsource-parser` to parse raw HTTP chunked SSE byte streams.
- **L4**: Imports `useChatStore` Zustand store hook.
- **L5**: Imports `fetchChats` and `fetchChatMessages` HTTP helpers from `chatApi.ts`.
- **L7**: Defines `DEFAULT_SYSTEM_PROMPT` fallback string (`'You are a helpful assistant'`).
- **L9**: Defines and exports `useChat()` hook function.
- **L10–L25**: Binds reactive state and setters from `useChatStore`: `messages`, `input`, `loading`, `currentChatId`, `chats`, `sidebarOpen`, `messagesLoading`, etc.
- **L27–L31**: Initializes refs for typewriter streaming animation and cancellation:
  - `bufferRef`: Holds incoming chunks waiting to be rendered.
  - `displayTimerRef`: Interval timer reference driving character drainage.
  - `streamDoneRef`: Boolean tracking if the SSE `[DONE]` event has arrived.
  - `displayedReplyRef`: Accumulates text currently rendered in the assistant message.
  - `abortControllerRef`: `AbortController` instance to abort in-flight fetch requests.
- **L33–L34**: Initializes DOM element refs: `chatContainerRef` (scroll container) and `messagesEndRef` (scroll anchor).
- **L36–L43**: `scrollToBottom`: Smoothly scrolls the chat container to `scrollHeight`.
- **L45–L51**: `handleScroll`: Measures scroll distance from bottom; if scrolled up > 150px, enables the jump-to-bottom button.
- **L54–L62**: `useEffect`: Automatically triggers `scrollToBottom` on new messages if the user is already near the bottom.
- **L64–L69**: `stopDisplayLoop`: Clears the typewriter interval timer and resets ref to null.
- **L71–L104**: `startDisplayLoop`: Starts a 20ms interval that drains characters from `bufferRef` in unicode-safe chunks, appends them to `displayedReplyRef`, and updates the last assistant message in Zustand store. When the buffer empties and the stream is complete, it concludes loading.
- **L106–L115**: `stopGeneration`: Aborts the active fetch connection, halts the typewriter interval, drains remaining buffer, and sets `loading` to false.
- **L118–L127**: `useEffect`: Component unmount cleanup hook ensuring abort controllers and intervals are cleared.
- **L130–L140**: `refreshConversations`: Fetches the conversation list from the backend (`fetchChats`) and updates `chats` state.
- **L142–L145**: `useEffect`: Calls `refreshConversations()` once on component mount to populate the sidebar.
- **L148–L186**: `loadConversation(chatId)`: Stops any active generation, resets input/scroll, fetches past messages for `chatId` from PostgreSQL (`fetchChatMessages`), and populates `messages` with system prompt + fetched history.
- **L189–L198**: `startNewChat()`: Cancels active streams, resets conversation state to initial defaults, and closes the mobile sidebar drawer.
- **L199–L203**: `handleSubmit(e)`: Form submit handler; verifies input is non-empty and generation is idle.
- **L204–L212**: Clears timers, aborts previous requests, resets animation buffer and reply tracking refs.
- **L214–L220**: Appends user message and an empty assistant message placeholder to store, clears the input box, and enables `loading`.
- **L221–L222**: Instantiates a new `AbortController` for the upcoming streaming request.
- **L224–L233**: Executes `fetch('/api/chat/stream')` with POST method, sending updated messages, optional `currentChatId`, and abort signal.
- **L234–L244**: Handles non-OK HTTP responses, attempting to parse backend JSON error messages.
- **L246–L250**: Obtains the response `ReadableStream` reader and `TextDecoder`.
- **L252–L290**: Configures `createParser` event handler:
  - On `[DONE]`: Sets `streamDoneRef` to true and refreshes sidebar conversation metadata.
  - On JSON chunk with `chatId`: Saves `chatId` to store if starting a new conversation.
  - On JSON chunk with `content`: Appends chunk to `bufferRef` and triggers `startDisplayLoop()`.
  - On JSON chunk with `usage`: Updates token usage state.
- **L292–L300**: Reads stream chunks in a `while (true)` loop and feeds bytes to the SSE parser.
- **L302–L311**: Feeds final stream decoder bytes, marks stream complete, and triggers conversation list refresh.
- **L313–L334**: Catch block: Ignores `AbortError`; handles network errors by terminating display loops and outputting an error message into the assistant bubble.
- **L336–L365**: `handleStructuredSubmit`: Alternative submission handler demonstrating structured JSON output via `/api/chat/structured`.
- **L367–L380**: Returns object of functions and refs to consumers.
