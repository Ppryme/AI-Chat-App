import { Router } from 'express';
import { streamChat, structuredChat } from '../controllers/chat.controller.ts';
import { limiter, dailyLimiter } from '../middleware/rateLimiter.ts';

const router = Router();

// Apply rate limiters to all chat routes
router.use(limiter);
router.use(dailyLimiter);

router.post('/stream', streamChat);
router.post('/structured', structuredChat);

export default router;
