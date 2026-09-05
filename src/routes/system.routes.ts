import { Router } from 'express';
import { getSystemCacheStats } from '../controllers/system.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

/**
 * Get internal system cache and queue metrics (Protected endpoint).
 * GET /api/v1/system/cache-stats
 */
router.get('/cache-stats', authenticate, getSystemCacheStats);

export default router;
