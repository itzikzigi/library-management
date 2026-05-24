import rateLimit from 'express-rate-limit'

/**
 * Per-IP rate limiter for auth endpoints. 10 requests per 15 minutes is
 * strict enough to slow credential-stuffing but lenient enough for honest
 * users who mistype a password a few times.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many auth attempts. Try again in a few minutes.',
    },
  },
})
