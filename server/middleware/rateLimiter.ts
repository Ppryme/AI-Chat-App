import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 100,
  message: {
    error: 'Daily request limit exceeded. Please try again tomorrow.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
