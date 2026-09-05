import { z } from 'zod';

/**
 * Zod schema for creating a new watchlist.
 */
export const createWatchlistSchema = z.object({
  name: z
    .string({ required_error: 'Watchlist name is required' })
    .trim()
    .min(1, 'Watchlist name cannot be empty')
    .max(100, 'Watchlist name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

export type CreateWatchlistDto = z.infer<typeof createWatchlistSchema>;

/**
 * Zod schema for updating a watchlist.
 * Ensures at least one field (name or description) is provided.
 */
export const updateWatchlistSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Watchlist name cannot be empty')
      .max(100, 'Watchlist name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    {
      message: 'At least one field (name or description) must be provided for update',
    }
  );

export type UpdateWatchlistDto = z.infer<typeof updateWatchlistSchema>;

/**
 * Zod schema for adding a stock item to a watchlist.
 * Accepts either `stockId` (UUID) or `symbol` (+ optional `exchange`, defaults to NSE).
 */
export const addWatchlistItemSchema = z
  .object({
    stockId: z.string().uuid('Invalid stock ID format (UUID expected)').optional(),
    symbol: z
      .string()
      .trim()
      .min(1, 'Stock symbol cannot be empty')
      .transform((val) => val.toUpperCase())
      .optional(),
    exchange: z
      .string()
      .trim()
      .min(1)
      .default('NSE')
      .transform((val) => val.toUpperCase())
      .optional(),
  })
  .refine(
    (data) => Boolean(data.stockId) || Boolean(data.symbol),
    {
      message: 'Either stockId or symbol must be provided to add a stock to watchlist',
      path: ['symbol'],
    }
  );

export type AddWatchlistItemDto = z.infer<typeof addWatchlistItemSchema>;

/**
 * Zod schema for route params with watchlist ID (`:id`).
 */
export const watchlistParamsSchema = z.object({
  id: z.string().uuid('Invalid watchlist ID format (UUID expected)'),
});

/**
 * Zod schema for route params with watchlist ID and stock ID (`:id/items/:stockId`).
 */
export const watchlistItemParamsSchema = z.object({
  id: z.string().uuid('Invalid watchlist ID format (UUID expected)'),
  stockId: z.string().uuid('Invalid stock ID format (UUID expected)'),
});

/**
 * Response DTO for a Stock item.
 */
export interface StockDetailResponse {
  id: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  isActive: boolean;
}

/**
 * Response DTO for a Watchlist Item.
 */
export interface WatchlistItemResponse {
  id: string;
  watchlistId: string;
  stockId: string;
  addedAt: string;
  stock?: StockDetailResponse;
}

/**
 * Response DTO for Watchlist Visit record.
 */
export interface UserWatchlistVisitResponse {
  id: string;
  userId: string;
  watchlistId: string;
  lastVisitedAt: string;
}

/**
 * Public Response DTO for a Watchlist.
 */
export interface WatchlistResponse {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  items?: WatchlistItemResponse[];
  lastVisitedAt?: string | null;
}
