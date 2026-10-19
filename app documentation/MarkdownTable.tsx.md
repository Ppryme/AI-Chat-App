# MarkdownTable.tsx

## Purpose of the File
`MarkdownTable.tsx` provides accessible, responsive, and mobile-friendly table wrappers for data tables rendered inside Markdown messages. It detects when wide columns overflow their container, renders horizontal scroll gradient shadows with swipe helper indicators, provides a fullscreen expansion modal via React Portals (`createPortal`), and exports standardized table subcomponents (`TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableDataCell`).

---

## Line-by-Line Code Breakdown

- **L1–L6**: Imports React hooks (`useState`, `useRef`, `useEffect`, `useCallback`) for managing overflow measurements and modal state.
- **L7**: Imports `createPortal` from `react-dom` to render the fullscreen table viewer outside the local DOM hierarchy directly in `document.body`.
- **L8**: Imports Lucide icons (`Maximize2`, `X`, `MoveHorizontal`) for table interaction indicators.
- **L10–L12**: Defines `MarkdownTableProps` extending native HTML table properties.
- **L14**: Declares and exports the `MarkdownTable` component.
- **L15–L19**: Sets up refs and state: `containerRef` (table wrapper div), `isOverflowing` (table width exceeds container), `canScrollRight` (unrevealed columns exist to the right), `hasScrolled` (tracks if user swiped), and `isExpanded` (fullscreen modal visibility).
- **L21–L27**: `checkOverflow` callback measures scroll geometry (`scrollWidth`, `clientWidth`, `scrollLeft`) to detect overflow conditions.
- **L29–L41**: `useEffect` registers a `ResizeObserver` on the table container to recalculate overflow dynamically when window or container dimensions change.
- **L43–L52**: `handleScroll` event listener detects horizontal scrolling, clearing swipe helper hints and recalculating right-edge gradient masks.
- **L54–L64**: `useEffect` listens for the `Escape` key to close the fullscreen expanded modal when active.
- **L68**: Outer wrapper div providing dark background and slate borders.
- **L70–L93**: Conditional toolbar rendered if `isOverflowing` is true; includes a "Table" title, a pulsing "Swipe to see more" helper pill, and an "Expand" button to enter fullscreen view.
- **L96–L103**: Renders a floating right gradient shadow (`bg-linear-to-l`) if `canScrollRight` is true to signal off-screen columns.
- **L105–L117**: Scrollable table wrapper `<div ref={containerRef}>` containing the native `<table>` with children.
- **L121–L166**: Renders the fullscreen expansion modal via `createPortal(..., document.body)` if `isExpanded` is true, providing backdrop blur, modal header with close button, and enlarged horizontal scrolling view.
- **L171–L176**: Exports `TableHead` component rendering styled `<thead>` elements.
- **L179–L184**: Exports `TableBody` component rendering styled `<tbody>` elements with row dividers.
- **L187–L196**: Exports `TableRow` component rendering `<tr>` elements with hover background highlights.
- **L198–L209**: Exports `TableHeaderCell` component rendering styled `<th>` elements with strict max-widths and text wrap boundaries.
- **L211–L222**: Exports `TableDataCell` component rendering styled `<td>` elements with text wrap boundaries.
