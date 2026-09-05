import { Router } from 'express';
import {
  createWatchlist,
  getWatchlists,
  getWatchlistById,
  updateWatchlist,
  deleteWatchlist,
  addStockToWatchlist,
  removeStockFromWatchlist,
  recordWatchlistVisit,
} from '../controllers/watchlist.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  createWatchlistSchema,
  updateWatchlistSchema,
  addWatchlistItemSchema,
  watchlistParamsSchema,
  watchlistItemParamsSchema,
} from '../types/watchlist.js';

const router = Router();

// Apply authentication middleware to all watchlist routes
router.use(authenticate);

/**
 * Create a new watchlist.
 * POST /api/v1/watchlists
 */
router.post('/', validateRequest({ body: createWatchlistSchema }), createWatchlist);

/**
 * Get all watchlists for authenticated user.
 * GET /api/v1/watchlists
 */
router.get('/', getWatchlists);

/**
 * Get single watchlist details and stock items.
 * GET /api/v1/watchlists/:id
 */
router.get('/:id', validateRequest({ params: watchlistParamsSchema }), getWatchlistById);

/**
 * Update watchlist name/description.
 * PUT /api/v1/watchlists/:id
 */
router.put(
  '/:id',
  validateRequest({ params: watchlistParamsSchema, body: updateWatchlistSchema }),
  updateWatchlist
);

/**
 * Delete watchlist.
 * DELETE /api/v1/watchlists/:id
 */
router.delete('/:id', validateRequest({ params: watchlistParamsSchema }), deleteWatchlist);

/**
 * Add stock item to watchlist.
 * POST /api/v1/watchlists/:id/items
 */
router.post(
  '/:id/items',
  validateRequest({ params: watchlistParamsSchema, body: addWatchlistItemSchema }),
  addStockToWatchlist
);

/**
 * Remove stock item from watchlist.
 * DELETE /api/v1/watchlists/:id/items/:stockId
 */
router.delete(
  '/:id/items/:stockId',
  validateRequest({ params: watchlistItemParamsSchema }),
  removeStockFromWatchlist
);

/**
 * Explicitly record visit timestamp.
 * POST /api/v1/watchlists/:id/visit
 */
router.post(
  '/:id/visit',
  validateRequest({ params: watchlistParamsSchema }),
  recordWatchlistVisit
);

export default router;
