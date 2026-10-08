import { create } from 'zustand';
import type { Chat, Message, TokenUsage } from '../types/chat';

const DEFAULT_SYSTEM_MESSAGE: Message = {
  role: 'system',
  content: 'You are a helpful assistant.',
};

interface ChatState {
  messages: Message[];
  tokenUsage: TokenUsage | null;
  input: string;
  loading: boolean;
  messagesLoading: boolean;
  showScrollButton: boolean;
  currentChatId: string | null;
  chats: Chat[];
  chatsLoading: boolean;
  sidebarOpen: boolean;

  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setTokenUsage: (usage: TokenUsage | null) => void;
  setInput: (input: string) => void;
  setLoading: (loading: boolean) => void;
  setMessagesLoading: (messagesLoading: boolean) => void;
  setShowScrollButton: (show: boolean) => void;
  setCurrentChatId: (id: string | null) => void;
  setChats: (chats: Chat[] | ((prev: Chat[]) => Chat[])) => void;
  setChatsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  updateChatTitleInStore: (chatId: string, newTitle: string) => void;
  removeChatFromStore: (chatId: string) => void;
  resetConversation: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [DEFAULT_SYSTEM_MESSAGE],
  tokenUsage: null,
  input: '',
  loading: false,
  messagesLoading: false,
  showScrollButton: false,
  currentChatId: null,
  chats: [],
  chatsLoading: false,
  sidebarOpen: false,

  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),
  setTokenUsage: (tokenUsage) => set({ tokenUsage }),
  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ loading }),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
  setShowScrollButton: (showScrollButton) => set({ showScrollButton }),
  setCurrentChatId: (currentChatId) => set({ currentChatId }),
  setChats: (chats) =>
    set((state) => ({
      chats: typeof chats === 'function' ? chats(state.chats) : chats,
    })),
  setChatsLoading: (chatsLoading) => set({ chatsLoading }),
  setSidebarOpen: (sidebarOpen) =>
    set((state) => ({
      sidebarOpen: typeof sidebarOpen === 'function' ? sidebarOpen(state.sidebarOpen) : sidebarOpen,
    })),
  updateChatTitleInStore: (chatId, newTitle) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)),
    })),
  removeChatFromStore: (chatId) =>
    set((state) => {
      const remaining = state.chats.filter((c) => c.id !== chatId);
      const isCurrentActive = state.currentChatId === chatId;
      return {
        chats: remaining,
        currentChatId: isCurrentActive ? null : state.currentChatId,
        messages: isCurrentActive ? [DEFAULT_SYSTEM_MESSAGE] : state.messages,
        tokenUsage: isCurrentActive ? null : state.tokenUsage,
        messagesLoading: false,
      };
    }),
  resetConversation: () =>
    set({
      currentChatId: null,
      messages: [DEFAULT_SYSTEM_MESSAGE],
      input: '',
      tokenUsage: null,
      messagesLoading: false,
    }),
}));
