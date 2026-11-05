import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// importing route handlers
import chatRoutes from './routes/chat.routes.ts';
import conversationRoutes from './routes/conversation.routes.ts';
import { testConnection } from './db/pool.ts';

dotenv.config();

const app = express();
app.use(helmet());

const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, '');

const allowedOrigins = new Set([
  'http://localhost:5173',
  clientUrl,
].filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {

      // allowing exact matches against localhost or configured client url
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // blocking unauthorized origins cleanly without throwing unhandled exceptions
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// responding to health-check requests for deployment verification
app.get(['/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  
});

// mounting api route handlers
app.use('/api/chat', chatRoutes);
app.use('/api/chats', conversationRoutes);


// exporting express app for vercel serverless function compatibility
export default app;

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await testConnection();
});