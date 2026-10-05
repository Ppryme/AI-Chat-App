import { type Request, type Response } from 'express';
import {
  chatIdParamSchema,
  createChatSchema,
  updateChatSchema,
} from '../schemas/conversation.schema.ts';
import * as chatDb from '../services/chatDb.service.ts';

// GET /api/chats
export async function getConversations(_req: Request, res: Response): Promise<void> {
  try {
    const chats = await chatDb.listChatsWithCount();
    res.status(200).json({ chats });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
}

// POST /api/chats
export async function createConversation(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createChatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
      return;
    }

    const newChat = await chatDb.createChat(parsed.data.title);
    res.status(201).json({ chat: newChat });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

// GET /api/chats/:chatId/messages
export async function getConversationMessages(req: Request, res: Response): Promise<void> {
  try {
    const parsedParams = chatIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Invalid chat ID format' });
      return;
    }

    const { chatId } = parsedParams.data;
    const chat = await chatDb.getChatById(chatId);
    if (!chat) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const messages = await chatDb.getMessagesByChatId(chatId);
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error loading conversation messages:', error);
    res.status(500).json({ error: 'Failed to load conversation messages' });
  }
}

// PATCH /api/chats/:chatId
export async function renameConversation(req: Request, res: Response): Promise<void> {
  try {
    const parsedParams = chatIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Invalid chat ID format' });
      return;
    }

    const parsedBody = updateChatSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Invalid title', details: parsedBody.error.format() });
      return;
    }

    const { chatId } = parsedParams.data;
    const updated = await chatDb.renameChat(chatId, parsedBody.data.title);

    if (!updated) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.status(200).json({ chat: updated });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
}

// DELETE /api/chats/:chatId
export async function deleteConversation(req: Request, res: Response): Promise<void> {
  try {
    const parsedParams = chatIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: 'Invalid chat ID format' });
      return;
    }

    const { chatId } = parsedParams.data;
    const deleted = await chatDb.deleteChat(chatId);

    if (!deleted) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
}
