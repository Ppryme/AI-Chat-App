# Zustand Chat Store Documentation (`chatStore.ts`)

## Big Picture
* **Problem Solved:** Managing state in React can become messy when passing data down through multiple layers of components (prop-drilling). The `chatStore` solves this by acting as a global, centralized database for the frontend.
* **Where it's used:** It is used across the chat interface. `App.tsx` reads state to pass it to child components (like the Header), `ChatInput.tsx` reads and modifies the input text, `ScrollButton.tsx` reads visibility state, and `useChat.ts` heavily interacts with the store to drive the complex AI streaming logic.

## Types: The Contract (`ChatState`)
* **`interface ChatState {`**: Starts the TypeScript blueprint defining exactly what data the store holds.
* **`messages: Message[];`**: An array of `Message` objects holding the chat history.
* **`tokenUsage: TokenUsage | null;`**: Tracks the AI token cost, allowed to be empty (`null`).
* **`input: string;`**: Tracks the current text inside the user's chat box.
* **`loading: boolean;`**: A true/false flag indicating if the AI is currently fetching/generating a response.
* **`showScrollButton: boolean;`**: A true/false flag determining if the floating "scroll to bottom" button is visible.
* **`setMessages:`**: A function signature that accepts either a brand new array of messages OR a callback function that safely modifies the previous messages.
* **Other Setters (`setTokenUsage`, `setInput`, etc.):** Function signatures that define how the rest of the states are updated. They take a specific value and return nothing (`void`).

## Implementation: `create(...)` Line-by-Line
* **`export const useChatStore = create<ChatState>((set) => ({`**: Initializes the Zustand store, binding it to our `ChatState` contract, and exposes the magic `set` function used to update the global data.
* **`messages: [{ role: 'system', ... }],`**: Sets the initial default system prompt message.
* **`tokenUsage: null,`**: Initializes the token usage display as hidden/empty.
* **`input: '',`**: Starts the chat text area completely empty.
* **`loading: false,`**: Ensures the "Thinking..." animation is hidden when the app first opens.
* **`showScrollButton: false,`**: Ensures the floating scroll button is hidden initially.
* **`setMessages:` Implementation**: Uses `typeof messages === 'function'` to detect if the caller passed a callback function. If they did, it feeds `state.messages` into that function to calculate the new array. If they didn't, it directly overwrites the array.
* **`setTokenUsage: (tokenUsage) => set({ tokenUsage }),`**: Uses Zustand's `set` to instantly overwrite the `tokenUsage` state.
* **`setInput: (input) => set({ input }),`**: Updates the `input` state as the user types.
* **`setLoading: (loading) => set({ loading }),`**: Toggles the boolean `loading` state.
* **`setShowScrollButton: (show) => set({ showScrollButton: show }),`**: Toggles the scroll button visibility.

## Consumption: How `useChat` Reads and Writes It
* **Reading state:** Inside `useChat.ts`, the hook imports the store and uses selector functions to grab exactly what it needs (e.g., `const messages = useChatStore((state) => state.messages);`).
* **Writing state:** It extracts the setter functions (e.g., `setMessages`, `setLoading`) and calls them during the complex fetch operations to seamlessly update the UI across the whole app.

## Traced Scenario: Following a Single User Action
Let's follow the exact sequence of store updates when a user types "Hello" and clicks send:
1. **User Types:** Inside `ChatInput.tsx`, every keystroke triggers `setInput(...)`. By the time they finish, the global `input` state is `"Hello"`.
2. **User Clicks Send:** `handleSubmit` inside `useChat.ts` is triggered.
3. **Optimistic UI Update:** `setMessages` is called to immediately append the user's "Hello" message to the chat history, followed immediately by a blank assistant message bubble.
4. **Clear Chat Box:** `setInput('')` is called to instantly clear the text box.
5. **Start Loading Indicator:** `setLoading(true)` is called, which causes the `App.tsx` file to render the "Thinking..." animation.
6. **Network Request:** The app connects to the backend and starts receiving chunks of data.
7. **The Typewriter Effect:** As words arrive from the AI, `setMessages((prev) => ...)` is repeatedly called inside a rapid interval loop, visually adding text to the blank assistant message bubble character-by-character.
8. **Token Update:** When the backend signals `[DONE]`, it sends down the token stats, triggering `setTokenUsage(...)` to make the token counts visible in the Header.
9. **End Loading:** Finally, in the `finally` block, `setLoading(false)` is called, stopping the "Thinking..." animation and completing the cycle.
