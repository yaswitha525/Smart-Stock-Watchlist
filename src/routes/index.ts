import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import watchlistRoutes from './watchlist.routes.js';
import stockRoutes from './stock.routes.js';
import systemRoutes from './system.routes.js';

const router = Router();

// Health check module route
router.use('/health', healthRoutes);

// Authentication module routes (Phase 3)
router.use('/auth', authRoutes);

// Watchlist module routes (Phase 4)
router.use('/watchlists', watchlistRoutes);

// Stock & Market Data module routes (Phase 5)
router.use('/stocks', stockRoutes);

// System telemetry & cache stats routes (Phase 7)
router.use('/system', systemRoutes);

export default router;
