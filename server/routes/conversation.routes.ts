import { Router } from 'express';
import {
  getConversations,
  createConversation,
  getConversationMessages,
  renameConversation,
  deleteConversation,
} from '../controllers/conversation.controller.ts';


const router = Router();

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:chatId/messages', getConversationMessages);
router.patch('/:chatId', renameConversation);
router.delete('/:chatId', deleteConversation);

export default router;
