import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';

export function useChatStreamController() {
  const setMessages = useChatStore((state) => state.setMessages);
  const setLoading = useChatStore((state) => state.setLoading);

  // holding incoming text chunks awaiting typewriter animation display
  const bufferRef = useRef('');

  // controlling interval timer for streaming text display
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tracking whether server has completed response delivery
  const streamDoneRef = useRef(false);

  // accumulating response text displayed to user so far
  const displayedReplyRef = useRef('');

  // clearing typewriter interval timer
  const stopDisplayLoop = useCallback(() => {
    if (displayTimerRef.current !== null) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  }, []);

  // starting typewriter display loop if not already running
  const startDisplayLoop = useCallback(() => {
    // preventing multiple intervals from running simultaneously
    if (displayTimerRef.current !== null) return;

    displayTimerRef.current = setInterval(() => {
      // checking if incoming text buffer has been completely displayed
      if (bufferRef.current.length === 0) {
        if (streamDoneRef.current) {
          stopDisplayLoop();
          setLoading(false);
        }
        return;
      }

      // slicing unicode characters safely without splitting multi-byte code units
      const chars = Array.from(bufferRef.current);
      const chunkSize = Math.max(2, Math.ceil(chars.length / 25));

      const nextCharacters = chars.slice(0, chunkSize).join('');
      bufferRef.current = chars.slice(chunkSize).join('');

      displayedReplyRef.current += nextCharacters;

      // updating assistant message content in store
      setMessages((prev) => {
        const updated = [...prev];

        if (
          updated.length > 0 &&
          updated[updated.length - 1].role === 'assistant'
        ) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: displayedReplyRef.current,
          };
        }

        return updated;
      });
    }, 20);
  }, [setLoading, setMessages, stopDisplayLoop]);

  // resetting streaming state and clearing display buffers for a fresh response
  const resetStream = useCallback(() => {
    stopDisplayLoop();
    bufferRef.current = '';
    displayedReplyRef.current = '';
    streamDoneRef.current = false;
  }, [stopDisplayLoop]);

  // receiving new text chunk from sse service and starting animation loop
  const appendChunk = useCallback(
    (chunk: string) => {
      bufferRef.current += chunk;
      startDisplayLoop();
    },
    [startDisplayLoop]
  );

  // marking stream as complete and ensuring display loop drains remaining buffer
  const finishStream = useCallback(() => {
    streamDoneRef.current = true;
    startDisplayLoop();
  }, [startDisplayLoop]);

  // halting display immediately and discarding pending buffer text
  const stopDisplay = useCallback(() => {
    stopDisplayLoop();
    bufferRef.current = '';
    streamDoneRef.current = true;
    setLoading(false);
  }, [setLoading, stopDisplayLoop]);

  // cleaning up interval timer on unmount
  useEffect(() => {
    return () => {
      stopDisplayLoop();
    };
  }, [stopDisplayLoop]);

  return {
    resetStream,
    appendChunk,
    finishStream,
    stopDisplay,
    stopDisplayLoop,
  };
}
