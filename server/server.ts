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

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

// Mount routes
app.use('/api/chat', chatRoutes);
app.use('/api/chats', conversationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
});