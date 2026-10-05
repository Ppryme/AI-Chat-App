import { z } from 'zod';

export const chatRequestSchema = z.object({
  chatId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z
          .string()
          .min(1, 'Content cannot be empty')
          .max(10000, 'Content is too long'),
      })
    )
    .min(1, 'Messages array must contain at least one message')
    .max(100, 'Conversation history is too long'),
});
