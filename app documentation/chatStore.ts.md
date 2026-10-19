# chatStore.ts

## Purpose of the File
`chatStore.ts` defines the central client-side reactive state store using Zustand. It manages conversation messages, token metrics, draft inputs, loading flags, current chat selection, sidebar state, and provides immutable updater actions to modify, rename, remove, and reset active conversations across the entire application.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `create` method from `zustand` to instantiate the global state store hook.
- **L2**: Imports domain interfaces `Chat`, `Message`, `TokenUsage` from `types/chat.ts`.
- **L4–L7**: Defines default initial system prompt message (`DEFAULT_SYSTEM_MESSAGE`) with role `'system'`.
- **L9–L34**: Declares the TypeScript `ChatState` interface defining state properties and setter action signatures:
  - Properties: `messages`, `tokenUsage`, `input`, `loading`, `messagesLoading`, `showScrollButton`, `currentChatId`, `chats`, `chatsLoading`, `sidebarOpen`.
  - Actions: setters for each property plus `updateChatTitleInStore`, `removeChatFromStore`, and `resetConversation`.
- **L36–L47**: Calls `create<ChatState>((set) => ({ ... }))` initializing default state values:
  - `messages`: initialized with `[DEFAULT_SYSTEM_MESSAGE]`.
  - `currentChatId`: initialized to `null`.
  - `chats`: empty array `[]`.
  - flags (`loading`, `messagesLoading`, `chatsLoading`, `sidebarOpen`, `showScrollButton`) set to `false`.
- **L48–L51**: `setMessages`: Updates messages supporting both direct array values and updater functions `(prev) => newArray`.
- **L52**: `setTokenUsage`: Updates current token usage statistics.
- **L53**: `setInput`: Updates current draft text in input box.
- **L54**: `setLoading`: Updates AI streaming generation flag.
- **L55**: `setMessagesLoading`: Updates flag while fetching message history from DB.
- **L56**: `setShowScrollButton`: Toggles visibility of the floating jump-to-bottom button.
- **L57**: `setCurrentChatId`: Sets the active conversation ID.
- **L58–L61**: `setChats`: Updates the list of conversations with direct array or functional updater.
- **L62**: `setChatsLoading`: Updates sidebar conversation list loading state.
- **L63–L66**: `setSidebarOpen`: Toggles mobile sidebar drawer visibility.
- **L67–L70**: `updateChatTitleInStore(chatId, newTitle)`: Maps over `chats` to optimistically update a conversation's title in place.
- **L71–L83**: `removeChatFromStore(chatId)`: Filters out the deleted conversation from `chats`. If the deleted chat was the currently active one, resets `currentChatId` to `null` and resets `messages` back to default system prompt.
- **L84–L93**: `resetConversation()`: Resets conversation state back to blank defaults (`currentChatId: null`, system prompt only, empty input, cleared token metrics).
