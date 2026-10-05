import { z } from 'zod';

export const chatIdParamSchema = z.object({
  chatId: z.string().uuid({ message: 'Invalid chat ID format (must be a valid UUID)' }),
});

export const createChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters'),
});

export const updateChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters'),
});
