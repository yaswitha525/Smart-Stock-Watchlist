import { z } from 'zod';
import { StockSnapshotResponse } from './stock.js';

export type ChangeSignal = 'SIGNIFICANT_GAIN' | 'SIGNIFICANT_DROP' | 'VOLUME_SURGE' | 'NEUTRAL';

export const DEFAULT_PRICE_THRESHOLD = 2.0; // 2.0%
export const DEFAULT_VOLUME_THRESHOLD = 50.0; // 50.0%

/**
 * Zod schema for Watchlist Delta query parameters.
 */
export const watchlistDeltaQuerySchema = z.object({
  since: z
    .string()
    .datetime({ message: 'Invalid ISO datetime string for parameter "since"' })
    .optional(),
  priceThreshold: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : DEFAULT_PRICE_THRESHOLD))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000, {
      message: 'priceThreshold must be a number between 0.01 and 1000 (percentage)',
    }),
  volumeThreshold: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : DEFAULT_VOLUME_THRESHOLD))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 10000, {
      message: 'volumeThreshold must be a number between 0.01 and 10000 (percentage)',
    }),
});

export type WatchlistDeltaQueryDto = z.infer<typeof watchlistDeltaQuerySchema>;

/**
 * Zod schema for Stock Delta query parameters.
 */
export const stockDeltaQuerySchema = z.object({
  since: z
    .string()
    .datetime({ message: 'Invalid ISO datetime string for parameter "since"' })
    .optional(),
  priceThreshold: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : DEFAULT_PRICE_THRESHOLD))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 1000, {
      message: 'priceThreshold must be a number between 0.01 and 1000 (percentage)',
    }),
  volumeThreshold: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : DEFAULT_VOLUME_THRESHOLD))
    .refine((val) => !isNaN(val) && val >= 0.01 && val <= 10000, {
      message: 'volumeThreshold must be a number between 0.01 and 10000 (percentage)',
    }),
});

export type StockDeltaQueryDto = z.infer<typeof stockDeltaQuerySchema>;

/**
 * Per-Stock Meaningful Change Analysis result.
 */
export interface StockDeltaAnalysis {
  stockId: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  baselinePrice: number | null;
  currentPrice: number | null;
  priceDelta: number;
  priceChangePercent: number;
  baselineVolume: number | null;
  currentVolume: number | null;
  volumeDelta: number;
  volumeChangePercent: number | null;
  signals: ChangeSignal[];
  isMeaningful: boolean;
  insight: string;
  baselineSnapshot: StockSnapshotResponse | null;
  currentSnapshot: StockSnapshotResponse | null;
}

/**
 * Watchlist-level Meaningful Change Delta response.
 */
export interface WatchlistDeltaResponse {
  watchlistId: string;
  watchlistName: string;
  referenceTimestamp: string;
  hasPreviousVisit: boolean;
  totalStocks: number;
  meaningfulChangesCount: number;
  summaryInsight: string;
  items: StockDeltaAnalysis[];
}
