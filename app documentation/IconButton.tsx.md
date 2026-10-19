# IconButton.tsx

## Purpose of the File
`IconButton.tsx` is a reusable UI button primitive. It standardizes styling, click feedback, accessible cursor states, disabled states, and visual variations (`primary` vs `ghost`) for round action buttons throughout the user interface.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `ButtonHTMLAttributes` and `ReactNode` types from `react`.
- **L5–L8**: Declares `IconButtonProps` extending native HTML button attributes, requiring an `icon` element and optional `variant` (`'primary' | 'ghost'`).
- **L10**: Defines and exports `IconButton` with default variant set to `'ghost'`.
- **L11**: Declares base CSS classes for rounded circular shape, padding, transition, and centered layout.
- **L12–L15**: Defines CSS variant styles: `ghost` (subtle muted hover) and `primary` (high contrast white/slate with disabled styling).
- **L17–L24**: Renders native `<button>` element applying merged class names, rendering `{icon}` children, and spreading all remaining HTML button props.
