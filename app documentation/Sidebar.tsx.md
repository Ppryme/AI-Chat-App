# Sidebar.tsx

## Purpose of the File
`Sidebar.tsx` renders the collapsible conversation history drawer. It lists all saved conversations stored in PostgreSQL, displays active conversation indicators, allows starting a new conversation, enables inline renaming of conversation titles, triggers a deletion modal, and handles responsive opening/closing behavior on mobile screens.

---

## Line-by-Line Code Breakdown

- **L1**: Imports React and `useState` for local component UI state (active rename input, delete modal state).
- **L2**: Imports `useChatStore` to retrieve conversations list, active convenrsation ID, and store mutations.
- **L3**: Imports API helper functions `renameChat` and `deleteChat` from `chatApi.ts`.
- **L4**: Imports Lucide icons (`Plus`, `MessageSquare`, `Trash2`, `Edit2`, `Check`, `X`) for sidebar action buttons.
- **L5**: Imports `<DeleteModal>` confirmation modal component.
- **L7–L10**: Declares `SidebarProps` requiring `onSelectChat` (load chat ID) and `onNewChat` callbacks.
- **L12**: Defines and exports default `Sidebar` component.
- **L13–L19**: Selects state and actions from `useChatStore`: `chats`, `currentChatId`, `chatsLoading`, `sidebarOpen`, `setSidebarOpen`, `updateChatTitleInStore`, and `removeChatFromStore`.
- **L21–L25**: Local state hooks for editing conversation titles (`editingId`, `editTitle`) and deletion confirmation (`deleteModalOpen`, `chatToDelete`, `isDeleting`).
- **L27–L31**: `handleStartRename` initializes inline rename mode for a specific chat item and prevents event bubbling.
- **L33–L47**: `handleSaveRename` saves the new title optimistically in the Zustand store (`updateChatTitleInStore`) and triggers backend PATCH `/api/chats/:chatId` via `renameChat`.
- **L49–L53**: `handleOpenDeleteModal` records the target chat details and opens the confirmation modal.
- **L55–L68**: `handleConfirmDelete` removes the conversation optimistically from Zustand store (`removeChatFromStore`), calls backend DELETE `/api/chats/:chatId` via `deleteChat`, and closes the modal.
- **L72–L78**: Conditionally renders dark semi-transparent mobile backdrop when sidebar is open on smaller screen widths.
- **L80–L85**: `<aside>` sidebar container styled with responsive positioning (fixed slide-out drawer on mobile, static sidebar on `sm:` desktop screens).
- **L87–L103**: Renders sidebar top header with the blue "New Chat" button and a mobile close (`X`) button.
- **L105–L109**: Renders scrollable conversation list area with section heading "Conversations".
- **L111–L121**: Displays loading skeleton text if `chatsLoading` is true, or empty state text if no conversations exist yet.
- **L123–L195**: Maps through `chats` array:
  - Determines if item is currently active (`isActive`) or in edit mode (`isEditing`).
  - Clicking item selects conversation via `onSelectChat(chat.id)`.
  - When in edit mode, renders inline input text field with save (`Check`) and cancel (`X`) buttons.
  - When not in edit mode, displays conversation title with `<MessageSquare>` icon and hover action buttons for rename (`<Edit2>`) and delete (`<Trash2>`).
- **L200–L211**: Mounts `<DeleteModal>` passing delete confirmation handlers and current deletion state.
