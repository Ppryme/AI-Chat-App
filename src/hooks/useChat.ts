import { useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { fetchChats, fetchChatMessages } from '../services/chatApi';
import { streamChat } from '../services/chatStream';
import { useChatScroll } from './useChatScroll';

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

  const bufferRef = useRef('');
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef = useRef(false);
  const displayedReplyRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const stopDisplayLoop = useCallback(() => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  }, []);

  const startDisplayLoop = useCallback(() => {
    if (displayTimerRef.current) return;

    displayTimerRef.current = setInterval(() => {
      // checking if stream buffer is drained
      if (bufferRef.current.length === 0) {
        if (streamDoneRef.current) {
          clearInterval(displayTimerRef.current!);
          displayTimerRef.current = null;
          setLoading(false); // finalizing loading state once stream animation finishes draining
        }
        return;
      }

      // slicing unicode characters safely without splitting multi-byte code units
      const chars = Array.from(bufferRef.current);
      const chunkSize = Math.max(2, Math.ceil(chars.length / 25));
      const nextCharacters = chars.slice(0, chunkSize).join('');
      bufferRef.current = chars.slice(chunkSize).join('');

      displayedReplyRef.current += nextCharacters;

      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: displayedReplyRef.current,
          };
        }
        return updated;
      });
    }, 20);
  }, [setLoading, setMessages]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopDisplayLoop();
    bufferRef.current = '';
    streamDoneRef.current = true;
    setLoading(false);
  }, [stopDisplayLoop, setLoading]);

  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (displayTimerRef.current) {
        clearInterval(displayTimerRef.current);
      }
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

    stopDisplayLoop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    bufferRef.current = '';
    displayedReplyRef.current = '';
    streamDoneRef.current = false;

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
            bufferRef.current += chunk;
            startDisplayLoop();
          },
          onUsage: (usage) => {
            setTokenUsage(usage);
          },
          onDone: () => {
            streamDoneRef.current = true;
          },
        }
      );

      streamDoneRef.current = true;
      startDisplayLoop();
      loadChats();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      console.error(err);
      stopDisplayLoop();
      bufferRef.current = '';
      streamDoneRef.current = true;
      setLoading(false);

      const errorMessage =
        err.message === 'Failed to fetch'
          ? 'Connection Failed. Please check your network and server connection.'
          : err.message || 'An unexpected error occurred';

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: errorMessage },
      ]);
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
    streamDoneRef,
    loadConversation,
    startNewChat,
    loadChats,
  };
}
