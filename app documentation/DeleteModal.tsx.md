# DeleteModal.tsx

## Purpose of the File
`DeleteModal.tsx` provides an accessible, high-priority confirmation modal for deleting a conversation. It mounts directly into `document.body` via React Portals (`createPortal`), listens for the `Escape` key to safely dismiss, warns the user that deleting a chat permanently removes all message history, and displays a spinner while the asynchronous delete operation is in progress.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `useEffect` for attaching window keyboard listeners.
- **L2**: Imports `createPortal` from `react-dom` to render the modal backdrop outside parent overflow hierarchies.
- **L3**: Imports Lucide icons (`Trash2`, `AlertTriangle`, `X`, `Loader2`) for warning visuals and spinners.
- **L5–L11**: Declares `DeleteModalProps` interface (`isOpen`, `chatTitle`, `isDeleting`, `onConfirm`, `onClose`).
- **L13–L19**: Defines and exports `DeleteModal` functional component.
- **L20–L31**: `useEffect` listens for `Escape` keydown events on `window` to close the modal if not actively deleting, and cleans up event listeners on unmount.
- **L33**: Returns `null` if `isOpen` is false.
- **L35–L41**: Renders fullscreen backdrop via `createPortal(..., document.body)` with blur and dark overlay; clicking the backdrop closes the modal.
- **L42–L45**: Modal card container preventing backdrop click bubbling (`e.stopPropagation()`) with smooth zoom-in animation.
- **L47–L70**: Modal header area with red warning icon (`Trash2`), title "Delete Conversation", warning subtitle, and a dismiss button (`X`).
- **L72–L88**: Content section featuring an `<AlertTriangle>` icon and confirmation message citing the specific `chatTitle` being removed.
- **L91–L119**: Footer actions with a "Cancel" button and a red "Delete" button that disables itself and shows a `<Loader2>` spinner while `isDeleting` is true.
