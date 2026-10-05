import { type Request, type Response } from 'express';
import { chatRequestSchema } from '../schemas/chat.schema.ts';
import { PersonSchema } from '../schemas/person.schema.ts';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { groq } from '../services/groq.service.ts';
import * as chatDb from '../services/chatDb.service.ts';

export const streamChat = async (req: Request, res: Response) => {
  try {
    const validationResult = chatRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Content is over 10,000 characters or invalid format',
        details: validationResult.error.format(),
      });
    }

    const { messages, chatId: incomingChatId } = validationResult.data;

    // Resolve or create conversation in PostgreSQL
    let currentChatId = incomingChatId;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

    if (!currentChatId) {
      // Derive chat title from first user message, truncated (~50 chars)
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'New Chat';
      const title = firstUserMsg.length > 50 ? `${firstUserMsg.slice(0, 47)}...` : firstUserMsg;
      const newChat = await chatDb.createChat(title);
      currentChatId = newChat.id;
    } else {
      // Validate that existing chat actually exists in DB
      const existingChat = await chatDb.getChatById(currentChatId);
      if (!existingChat) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    // Persist the user message before streaming
    if (lastUserMessage) {
      await chatDb.saveMessage(currentChatId, 'user', lastUserMessage.content);
    }

    // SSE headers
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    // Emit chatId as the first event so client knows the chat ID immediately
    res.write(`data: ${JSON.stringify({ chatId: currentChatId })}\n\n`);

    const stream = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      stream: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let totalUsage: any = null;
    let fullAssistantResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? '';
      if (chunk.x_groq?.usage) totalUsage = chunk.x_groq.usage;
      if (content) {
        fullAssistantResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    if (totalUsage) res.write(`data: ${JSON.stringify({ usage: totalUsage })}\n\n`);

    // Persist completed assistant message and touch chat updated_at
    if (fullAssistantResponse) {
      await chatDb.saveMessage(currentChatId, 'assistant', fullAssistantResponse);
      await chatDb.touchChat(currentChatId);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming Error:', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Connection Failed: check your network connection and try again.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Connection Failed: check your network connection and try again.' })}\n\n`);
      res.end();
    }
  }
};

export const structuredChat = async (req: Request, res: Response) => {
  try {
    const validationResult = chatRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid chat request',
        details: validationResult.error.format(),
      });
    }

    const { messages } = validationResult.data;

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'person',
          strict: true,
          schema: zodToJsonSchema(PersonSchema),
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No content received from model' });
    }

    const rawPerson = JSON.parse(content);
    const parsedPerson = PersonSchema.parse(rawPerson);

    return res.status(200).json({
      data: parsedPerson,
    });
  } catch (error) {
    console.error('Structured Chat Error:', error);
    return res.status(500).json({
      error: 'Failed to generate structured response. Please try again.',
    });
  }
};
