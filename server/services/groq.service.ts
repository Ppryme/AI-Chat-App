import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 20 * 1000, // 20 seconds timeout instead of hanging indefinitely
  maxRetries: 2,
});
