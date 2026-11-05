import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { Message, TokenUsage } from '../types/chat';

export interface StreamChatParams {
  messages: Message[];
  chatId?: string;
  signal?: AbortSignal;
}

export interface StreamChatCallbacks {
  onChatId?: (chatId: string) => void;
  onContent?: (content: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  onDone?: () => void;
}

// streaming chat completion via sse and feeding parsed chunks to callbacks
export async function streamChat(
  { messages, chatId, signal }: StreamChatParams,
  callbacks: StreamChatCallbacks
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      chatId: chatId || undefined,
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = 'Connection Failed. Check network connection and Try Again';
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // falling back to default connection error message when json parsing fails
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('Connection Failed. No response body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let streamError: string | null = null;

  // parsing sse event stream messages and triggering matching callbacks
  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      const data = event.data;
      if (data === '[DONE]') {
        callbacks.onDone?.();
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (parsed.error) {
          streamError = typeof parsed.error === 'string' ? parsed.error : 'Streaming Failed';
          return;
        }

        if (parsed.chatId) {
          callbacks.onChatId?.(parsed.chatId);
        }

        if (parsed.content) {
          callbacks.onContent?.(parsed.content);
        }

        if (parsed.usage) {
          callbacks.onUsage?.({
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

  try {
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
  } finally {
    // releasing reader lock once stream reading completes or fails
    reader.releaseLock();
  }
}
