# Header.tsx

## Purpose of the File
`Header.tsx` renders the sticky navigation header at the top of the chat area. It presents the current conversation title (or default "New Chat"), provides a toggle button for mobile screens to open the sidebar drawer, displays live token usage metrics (prompt, completion, total tokens), and houses a quick restart button to initiate a fresh conversation.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `TokenUsage` interface type definition (`types/chat.ts`).
- **L2**: Imports `useChatStore` to read active chat ID, conversation lists, and sidebar toggling action.
- **L3**: Imports Lucide icons (`Menu`, `RotateCcw`) for navigation and reset actions.
- **L5–L8**: Declares `HeaderProps` requiring `onNewChat` callback and `tokenUsage` data (or null).
- **L10**: Defines and exports `Header` functional component.
- **L11–L13**: Extracts `currentChatId`, `chats` array, and `setSidebarOpen` modifier from `useChatStore`.
- **L16–L18**: Finds the currently active chat object in `chats`; extracts title (defaulting to `'New Chat'`) and subtitle prompt.
- **L20**: Renders sticky `<header>` anchored to the top (`sticky top-0 z-20`) with dark blur backdrop.
- **L21–L28**: Renders mobile hamburger menu button (`<Menu>`) that flips `sidebarOpen` boolean state to reveal the sidebar.
- **L30–L34**: Displays the current conversation title (`<h1>`) and contextual subtitle with text truncation.
- **L36–L44**: Conditionally displays token usage badge showing `tokenUsage.total` when streaming metrics are received from Groq.
- **L46–L52**: Renders "Start New Chat" icon button (`<RotateCcw>`) triggering `onNewChat()`.
