import rateLimit from 'express-rate-limit';

// Burst protection
export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sustained usage protection
export const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours window
  max: 100, // Limit each IP to 100 requests per day
  message: { error: 'Daily request limit exceeded. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});
