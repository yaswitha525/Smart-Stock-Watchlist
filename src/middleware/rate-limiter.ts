import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Authentication Endpoints (Registration & Login).
 * Prevents credential brute-forcing while allowing normal user usage.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again after 1 minute.',
    },
  },
});

/**
 * Rate Limiter for Expensive API & Ingestion Operations.
 * Protects server resources without blocking standard application usage.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Max 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please lower request frequency.',
    },
  },
});
