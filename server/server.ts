import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Routes
import chatRoutes from './routes/chat.routes.ts';
import conversationRoutes from './routes/conversation.routes.ts';
import { testConnection } from './db/pool.ts';

dotenv.config();

const app = express();
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, same-origin)
      if (!origin) return callback(null, true);
      if (
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app') ||
        origin === process.env.CLIENT_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Health-check endpoint for deployment verification
app.get(['/api/health', '/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes with and without /api prefix for Vercel routing flexibility
app.use('/api/chat', chatRoutes);
app.use('/chat', chatRoutes);

app.use('/api/chats', conversationRoutes);
app.use('/chats', conversationRoutes);

// Export for Vercel Serverless Function entry point
export default app;

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
});