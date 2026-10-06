/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRef, useEffect, useCallback } from 'react';
import { createParser, type EventSourceMessage } from 'eventsource-parser';
import { useChatStore } from '../stores/chatStore';
import { fetchChats, fetchChatMessages } from '../services/chatApi';

const DEFAULT_SYSTEM_PROMPT = 'You are an expert in data analysis and AI assistant.';

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const loading = useChatStore((state) => state.loading);
  const setLoading = useChatStore((state) => state.setLoading);
  const setTokenUsage = useChatStore((state) => state.setTokenUsage);
  const setShowScrollButton = useChatStore((state) => state.setShowScrollButton);

  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const setChats = useChatStore((state) => state.setChats);
  const setChatsLoading = useChatStore((state) => state.setChatsLoading);
  const resetConversation = useChatStore((state) => state.resetConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);

  const bufferRef = useRef('');
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef = useRef(false);
  const displayedReplyRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };

  // Only auto-scroll on message changes if user is already near the bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight <= 150;
      if (isNearBottom) {
        scrollToBottom(loading ? 'auto' : 'smooth');
      }
    }
  }, [messages, loading, scrollToBottom]);

  const stopDisplayLoop = useCallback(() => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  }, []);

  const startDisplayLoop = useCallback(() => {
    if (displayTimerRef.current) return;

    displayTimerRef.current = setInterval(() => {
      // If buffer is drained
      if (bufferRef.current.length === 0) {
        if (streamDoneRef.current) {
          clearInterval(displayTimerRef.current!);
          displayTimerRef.current = null;
          setLoading(false); // Loading only finishes once the animation is fully drained
        }
        return;
      }

      // Handle multi-byte unicode characters safely without splitting
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

  // Clean up timer and in-flight fetch when unmounting
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

  // Refresh conversation history list
  const refreshConversations = useCallback(async () => {
    try {
      setChatsLoading(true);
      const chats = await fetchChats();
      setChats(chats);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setChatsLoading(false);
    }
  }, [setChats, setChatsLoading]);

  // Initial load of past chats on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load a selected conversation's messages from PostgreSQL
  const loadConversation = useCallback(
    async (chatId: string) => {
      stopGeneration();
      setInput('');
      setTokenUsage(null);
      setCurrentChatId(chatId);
      setSidebarOpen(false);

      try {
        setLoading(true);
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
        setLoading(false);
      }
    },
    [stopGeneration, setInput, setTokenUsage, setCurrentChatId, setSidebarOpen, setLoading, setMessages]
  );

  // Start fresh chat
  const startNewChat = useCallback(() => {
    stopGeneration();
    resetConversation();
    setSidebarOpen(false);
  }, [stopGeneration, resetConversation, setSidebarOpen]);

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
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          chatId: currentChatId || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = 'Connection Failed. Check network connection and Try Again';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        // eslint-disable-next-line no-empty
        } catch (e) {}
        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error('Connection Failed. No response body.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamError: string | null = null;

      const parser = createParser({
        onEvent(event: EventSourceMessage) {
          const data = event.data;
          if (data === '[DONE]') {
            streamDoneRef.current = true;
            refreshConversations();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const parsedError: string = 'Streaming Failed';

            if (parsed.error) {
              streamError = typeof parsed.error === 'string' ? parsed.error : parsedError;
              return;
            }

            // Sync chatId assigned by backend for newly created conversation
            if (parsed.chatId && !currentChatId) {
              setCurrentChatId(parsed.chatId);
            }

            if (parsed.content) {
              bufferRef.current += parsed.content;
              startDisplayLoop();
            }

            if (parsed.usage) {
              setTokenUsage({
                prompt: parsed.usage.prompt_tokens,
                completion: parsed.usage.completion_tokens,
                total: parsed.usage.total_tokens,
              });
            }
          } catch (error) {
            console.error('SSE JSON parse error:', data, error);
          }
        },
      });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));

        if (streamError) {
          throw new Error(streamError);
        }
      }

      parser.feed(decoder.decode());

      if (streamError) {
        throw new Error(streamError);
      }

      streamDoneRef.current = true;
      startDisplayLoop();
      refreshConversations();

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
    refreshConversations,
  };
}
