# ChatInput.tsx

## Purpose of the File
`ChatInput.tsx` renders the message composing interface anchored at the bottom of the chat viewport. It features an auto-resizing multiline `<textarea>`, handles Enter keypress submission (and Shift+Enter for multiline breaks), displays an accessory attachment button, and dynamically renders either a submit arrow button (when idle) or a stop square button (when an AI generation stream is active).

---

## Line-by-Line Code Breakdown

- **L1**: Disables ESLint `no-explicit-any` warning for synthetic event typecasting.
- **L2**: Imports `useRef` and `useEffect` hooks from `react` to reference and dynamically resize the textarea DOM element.
- **L3**: Imports the reusable `<IconButton>` UI primitive.
- **L4**: Imports `useChatStore` to read and manipulate input text and observe generation loading state.
- **L5**: Imports Lucide icon components (`Square`, `ArrowUp`, `Plus`) for UI action buttons.
- **L7–L9**: Declares the TypeScript `ChatInputProps` interface requiring an `onSubmit` form submission handler function.
- **L11**: Defines and exports the default `ChatInput` functional component taking `onSubmit`.
- **L12**: Extracts `input` string state from `useChatStore`.
- **L13**: Extracts `setInput` action from `useChatStore` to update message draft text.
- **L14**: Extracts `loading` boolean flag from `useChatStore` indicating if AI is currently streaming tokens.
- **L15**: Initializes `textareaRef` to obtain direct imperative access to the `<textarea>` DOM element.
- **L18–L25**: `useEffect` runs whenever `input` changes, resetting height to `'auto'` and calculating `scrollHeight` (capped at 208px / ~8 lines) to make the input box expand dynamically as the user types.
- **L27–L34**: `handleKeyDown` intercepts Enter key events; prevents default newline submission unless Shift is pressed, and triggers `onSubmit` if the input is non-empty and not currently streaming.
- **L36–L37**: Renders the outer footer wrapper with dark styling and top border.
- **L38–L41**: Renders the rounded `<form>` container enclosing the textarea and action buttons.
- **L43–L51**: Renders the controlled `<textarea>` bound to `input`, listening to `onChange` and `onKeyDown`, auto-styled with placeholder text and hidden/thin scrollbars.
- **L53–L54**: Renders the bottom button toolbar container (ChatGPT-style toolbar layout).
- **L56–L63**: Renders the left action button bar with a `<Plus>` icon button for file attachments.
- **L66–L82**: Renders the right action button container with a primary `<IconButton>` that displays an `<ArrowUp>` icon to send, or switches to a `<Square>` icon to stop generation if `loading` is true.
