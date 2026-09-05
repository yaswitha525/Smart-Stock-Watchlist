import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Health check module route
router.use('/health', healthRoutes);

// Authentication module routes (Phase 3)
router.use('/auth', authRoutes);

// Placeholder structure for upcoming Phase modules:
// router.use('/watchlists', watchlistRoutes); // Phase 4: Watchlist APIs
// router.use('/stocks', stockRoutes);       // Phase 5: Stock / Market Data APIs

export default router;
