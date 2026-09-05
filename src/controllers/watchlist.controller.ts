import { Response } from 'express';
import { WatchlistService } from '../services/watchlist.service.js';
import { DeltaService } from '../services/delta.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthenticatedRequest } from '../types/auth.js';

/**
 * Create a new watchlist.
 * POST /api/v1/watchlists
 */
export const createWatchlist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlist = await WatchlistService.createWatchlist(userId, req.body);
  return sendSuccess(res, watchlist, 201);
});

/**
 * Get all watchlists owned by current authenticated user.
 * GET /api/v1/watchlists
 */
export const getWatchlists = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlists = await WatchlistService.getUserWatchlists(userId);
  return sendSuccess(res, watchlists, 200);
});

/**
 * Get a specific watchlist owned by current user (with stock items).
 * GET /api/v1/watchlists/:id
 */
export const getWatchlistById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  const watchlist = await WatchlistService.getWatchlistById(userId, watchlistId);
  return sendSuccess(res, watchlist, 200);
});

/**
 * Update watchlist name/description.
 * PUT /api/v1/watchlists/:id
 */
export const updateWatchlist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  const watchlist = await WatchlistService.updateWatchlist(userId, watchlistId, req.body);
  return sendSuccess(res, watchlist, 200);
});

/**
 * Delete a watchlist owned by current user.
 * DELETE /api/v1/watchlists/:id
 */
export const deleteWatchlist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  await WatchlistService.deleteWatchlist(userId, watchlistId);
  return sendSuccess(res, { message: 'Watchlist deleted successfully' }, 200);
});

/**
 * Add a stock to a watchlist.
 * POST /api/v1/watchlists/:id/items
 */
export const addStockToWatchlist = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  const item = await WatchlistService.addStockToWatchlist(userId, watchlistId, req.body);
  return sendSuccess(res, item, 201);
});

/**
 * Remove a stock from a watchlist.
 * DELETE /api/v1/watchlists/:id/items/:stockId
 */
export const removeStockFromWatchlist = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id: watchlistId, stockId } = req.params;
    await WatchlistService.removeStockFromWatchlist(userId, watchlistId, stockId);
    return sendSuccess(res, { message: 'Stock removed from watchlist successfully' }, 200);
  }
);

/**
 * Explicitly record a user visit timestamp for a watchlist.
 * POST /api/v1/watchlists/:id/visit
 */
export const recordWatchlistVisit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  const visit = await WatchlistService.recordWatchlistVisit(userId, watchlistId);
  return sendSuccess(res, visit, 200);
});

/**
 * Calculate and retrieve meaningful-change delta analysis for a user watchlist.
 * GET /api/v1/watchlists/:id/delta
 * NOTE: Completely read-only, does NOT mutate lastVisitedAt.
 */
export const getWatchlistDelta = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const watchlistId = req.params.id;
  const delta = await DeltaService.calculateWatchlistDelta(userId, watchlistId, req.query as any);
  return sendSuccess(res, delta, 200);
});
