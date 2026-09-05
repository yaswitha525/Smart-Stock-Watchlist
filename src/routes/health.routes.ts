import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * Health check route.
 * GET /api/health or GET /api/v1/health
 */
router.get('/', getHealth);

export default router;
