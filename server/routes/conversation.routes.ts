import { Router } from 'express';
import {
  getConversations,
  createConversation,
  getConversationMessages,
  renameConversation,
  deleteConversation,
} from '../controllers/conversation.controller.ts';
import { limiter } from '../middleware/rateLimiter.ts';

const router = Router();

// Apply standard rate limiter
router.use(limiter);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:chatId/messages', getConversationMessages);
router.patch('/:chatId', renameConversation);
router.delete('/:chatId', deleteConversation);

export default router;
