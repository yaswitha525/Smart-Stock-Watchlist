import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate-request.js';
import { authenticate } from '../middleware/authenticate.js';
import { registerSchema, loginSchema } from '../types/auth.js';

import { authRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

/**
 * Register a new user account.
 * POST /api/v1/auth/register
 */
router.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), register);

/**
 * User login & JWT issuance.
 * POST /api/v1/auth/login
 */
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);

/**
 * Get current user profile (Protected endpoint).
 * GET /api/v1/auth/me
 */
router.get('/me', authenticate, me);

export default router;
