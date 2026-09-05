import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import watchlistRoutes from './watchlist.routes.js';
import stockRoutes from './stock.routes.js';

const router = Router();

// Health check module route
router.use('/health', healthRoutes);

// Authentication module routes (Phase 3)
router.use('/auth', authRoutes);

// Watchlist module routes (Phase 4)
router.use('/watchlists', watchlistRoutes);

// Stock & Market Data module routes (Phase 5)
router.use('/stocks', stockRoutes);

export default router;
