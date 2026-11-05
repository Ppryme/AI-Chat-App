import { useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { fetchChats, fetchChatMessages } from '../services/chatApi';
import { streamChat } from '../services/chatStream';
import { useChatScroll } from './useChatScroll';
import { useChatStreamController } from './useChatStreamController';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant';

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const loading = useChatStore((state) => state.loading);
  const setLoading = useChatStore((state) => state.setLoading);
  const setTokenUsage = useChatStore((state) => state.setTokenUsage);

  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const setChats = useChatStore((state) => state.setChats);
  const setChatsLoading = useChatStore((state) => state.setChatsLoading);
  const resetConversation = useChatStore((state) => state.resetConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const setMessagesLoading = useChatStore((state) => state.setMessagesLoading);
 
  const setChatError = useChatStore((state) => state.setChatError);

  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    resetStream,
    appendChunk,
    finishStream,
    stopDisplay,
  } = useChatStreamController();

  const {
    chatContainerRef,
    messagesEndRef,
    scrollToBottom,
    handleScroll,
    resetScroll,
  } = useChatScroll({
    messages,
    loading,
  });

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    stopDisplay();
  }, [stopDisplay]);

  // aborting pending network request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // refreshing conversation history list from backend
  const loadChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      setChatError(false);
      const chats = await fetchChats();
      setChats(chats);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setChatError(true);
    } finally {
      setChatsLoading(false);
    }
  }, [setChats, setChatsLoading, setChatError]);

  // loading initial past chats on component mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // loading selected conversation messages from postgresql
  const loadConversation = useCallback(
    async (chatId: string) => {
      if (chatId === currentChatId) {
        setSidebarOpen(false);
        return;
      }

      stopGeneration();
      setInput('');
      setTokenUsage(null);
      setCurrentChatId(chatId);
      resetScroll();
      setSidebarOpen(false);

      try {
        setMessagesLoading(true);
        const fetchedMessages = await fetchChatMessages(chatId);
        setMessages([
          { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
          ...fetchedMessages,
        ]);
      } catch (err) {
        console.error('Failed to load chat messages:', err);
        setMessages([
          { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
          {
            role: 'assistant',
            content: 'Could not load conversation history from the database. Please try again.',
          },
        ]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [currentChatId, stopGeneration, setInput, setTokenUsage, setCurrentChatId, resetScroll, setSidebarOpen, setMessagesLoading, setMessages]
  );

  // resetting state to start a fresh chat session
  const startNewChat = useCallback(() => {
    stopGeneration();
    resetConversation();
    resetScroll();
    setSidebarOpen(false);
  }, [stopGeneration, resetConversation, resetScroll, setSidebarOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    resetStream();

    const userMessage = { role: 'user' as const, content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChat(
        {
          messages: updatedMessages,
          chatId: currentChatId || undefined,
          signal: controller.signal,
        },
        {
          onChatId: (assignedChatId) => {
            if (!currentChatId) {
              setCurrentChatId(assignedChatId);
            }
          },
          onContent: (chunk) => {
            appendChunk(chunk);
          },
          onUsage: (usage) => {
            setTokenUsage(usage);
          },
        }
      );

      finishStream();
      loadChats();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      console.error(err);
      stopDisplay();

      const errorMessage =
        err.message === 'Failed to fetch'
          ? 'Connection Failed. Please check your network and server connection.'
          : err.message || 'An unexpected error occurred';

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: errorMessage },
      ]);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleStructuredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const response = await fetch('/api/chat/structured', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: input.trim(),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Structured request failed');
      }

      const result = await response.json();
      console.log('Structured result:', result);
    } catch (error) {
      console.error('Structured request error:', error);
    }
  };

  return {
    chatContainerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    handleSubmit,
    stopGeneration,
    handleStructuredSubmit,
    loadConversation,
    startNewChat,
    loadChats,
  };
}
