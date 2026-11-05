import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { type Message } from '../types/chat';

interface UseChatScrollOptions {
  messages: Message[];
  loading: boolean;
}

const SCROLL_THRESHOLD = 150;

export function useChatScroll({
  messages,
  loading,
}: UseChatScrollOptions) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(loading);

  const setShowScrollButton = useChatStore(
    (state) => state.setShowScrollButton
  );

  // scrolling to the bottom of the chat container or end reference
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior,
          block: 'end',
        });
        return;
      }

      const container = chatContainerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    },
    []
  );

  // detecting whether the user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const canScroll = scrollHeight > clientHeight;

    const isScrolledUp =
      canScroll &&
      scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD;

    setShowScrollButton(isScrolledUp);
  }, [setShowScrollButton]);

  // auto-scrolling when messages change, loading starts, or when user is near bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isJustLoading = loading && !prevLoadingRef.current;
    prevLoadingRef.current = loading;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const isNearBottom =
      scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;

    if (isJustLoading || isNearBottom) {
      requestAnimationFrame(() => {
        scrollToBottom(isJustLoading ? 'smooth' : (loading ? 'auto' : 'smooth'));
      });
    }
  }, [messages, loading, scrollToBottom]);

  // resetting scroll position when switching conversations
  const resetScroll = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }

    setShowScrollButton(false);
  }, [setShowScrollButton]);

  return {
    chatContainerRef,
    messagesEndRef,
    scrollToBottom,
    handleScroll,
    resetScroll,
  };
}
