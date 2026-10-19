# ChatMessage.tsx

## Purpose of the File
`ChatMessage.tsx` renders an individual chat bubble row in the conversation stream. It determines the alignment and bubble styling based on the message sender (`user` vs `assistant`), filters out internal `system` messages from view, and parses Markdown content via `react-markdown` and `remark-gfm` to render formatted rich text, headings, lists, blockquotes, code blocks, hyperlinks, and custom interactive Markdown tables.

---

## Line-by-Line Code Breakdown

- **L1–L2**: Imports `ReactMarkdown` and GitHub Flavored Markdown plugin `remark-gfm` for parsing standard and extended Markdown syntax.
- **L3**: Imports the TypeScript `Message` domain interface definition (`types/chat.ts`).
- **L4–L11**: Imports custom Markdown table components (`MarkdownTable`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableDataCell`) from `MarkdownTable.tsx`.
- **L13–L15**: Defines the `ChatMessageProps` interface expecting a single `message` prop.
- **L17**: Exports the default `ChatMessage` React functional component.
- **L18**: Returns `null` if the message's role is `'system'`, ensuring internal system instructions are never rendered in the UI.
- **L20**: Determines `isUser` boolean check based on `message.role === 'user'`.
- **L22–L27**: Renders an outer flex wrapper aligned to the right (`justify-end`) for user messages or left (`justify-start`) for assistant responses.
- **L28–L34**: Defines the chat bubble container: styled with a rounded pill bubble (`bg-slate-800`, borders) for user messages, and a full-width clean typography layout for assistant messages.
- **L35**: Inner wrapper applying word-breaking and layout containment rules to prevent text and code overflow.
- **L36–L37**: Mounts `<ReactMarkdown>` configuring `remarkPlugins={[remarkGfm]}`.
- **L39–L43**: Customizes the `<pre>` tag component to render code block wrappers with dark slate background, monospace font, and horizontal scrolling.
- **L45–L67**: Customizes the `<code>` tag: detects if code is a fenced block (via class `language-`) or inline code (which receives pill styling with `text-blue-300`).
- **L69–L73**: Customizes paragraph (`<p>`) tags with consistent bottom margin and line height.
- **L75–L85**: Customizes unordered (`<ul>`) and ordered (`<ol>`) lists with left padding and bullet styling.
- **L87–L91**: Customizes list items (`<li>`) with relaxed line heights.
- **L93–L109**: Customizes heading levels `<h1>`, `<h2>`, and `<h3>` with proportionate typography and margin offsets.
- **L111–L115**: Customizes blockquotes (`<blockquote>`) with a left slate accent border and italic text.
- **L117–L126**: Customizes hyperlinks (`<a>`), opening them safely in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) with blue underline styling.
- **L128–L130**: Customizes horizontal rules (`<hr>`) with slate border styling.
- **L133–L139**: Maps standard HTML table tags (`table`, `thead`, `tbody`, `tr`, `th`, `td`) to the custom interactive table components imported from `MarkdownTable.tsx`.
- **L141**: Supplies `message.content` as the raw Markdown text input for rendering.
