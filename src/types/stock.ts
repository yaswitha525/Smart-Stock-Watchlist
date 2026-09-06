import { z } from 'zod';

/**
 * Zod schema for querying/searching stock master catalog with pagination.
 */
export const stockQuerySchema = z.object({
  search: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  exchange: z.string().trim().toUpperCase().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page must be a positive integer greater than or equal to 1',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Limit must be an integer between 1 and 100',
    }),
});

export type StockQueryDto = z.infer<typeof stockQuerySchema>;

/**
 * Zod schema for route parameter with Stock ID (`:id`).
 */
export const stockIdParamsSchema = z.object({
  id: z.string().uuid('Invalid stock ID format (UUID expected)'),
});

/**
 * Zod schema for route parameter with Stock Symbol (`:symbol`).
 */
export const stockSymbolParamsSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, 'Stock symbol cannot be empty')
    .transform((val) => val.toUpperCase()),
});

/**
 * Zod schema for querying stock historical snapshots.
 */
export const snapshotQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 500, {
      message: 'Limit must be an integer between 1 and 500',
    }),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

export type SnapshotQueryDto = z.infer<typeof snapshotQuerySchema>;

/**
 * Zod schema for recording/ingesting a stock price snapshot.
 */
export const recordSnapshotSchema = z.object({
  price: z
    .number({ required_error: 'Stock price is required' })
    .positive('Stock price must be greater than 0'),
  volume: z
    .number({ required_error: 'Volume is required' })
    .int('Volume must be an integer')
    .nonnegative('Volume cannot be negative'),
  changePercent: z
    .number({ required_error: 'Change percent is required' }),
  dataTimestamp: z
    .string()
    .datetime('Invalid dataTimestamp format (ISO 8601 string expected)')
    .optional(),
});

export type RecordSnapshotDto = z.infer<typeof recordSnapshotSchema>;

/**
 * Market status container for NSE/BSE trading sessions in IST.
 */
export interface MarketStatusResponse {
  status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  isWeekend: boolean;
  isMarketOpen: boolean;
  sessionDate: string;
  sessionDateFormatted: string;
  sessionDateFormattedShort: string;
  sessionDateLabel: string;
  statusMessage: string;
}

/**
 * Response DTO for a Stock Snapshot.
 */
export interface StockSnapshotResponse {
  id: string;
  stockId: string;
  price: number;
  previousClose: number;
  changeAmount: number;
  changePercent: number;
  direction: 'positive' | 'negative' | 'neutral';
  volume: number;
  dataTimestamp: string;
  recordedAt: string;
  isStale: boolean;
  dataFreshnessStatus: 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';
}

/**
 * Public Response DTO for a Stock entity.
 */
export interface StockResponse {
  id: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  latestSnapshot?: StockSnapshotResponse | null;
  marketStatus?: MarketStatusResponse;
}

/**
 * Paginated response container for stock list.
 */
export interface PaginatedStockResponse {
  items: StockResponse[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Response DTO for batch market data refresh operation.
 */
export interface BatchRefreshResponse {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  snapshots: StockSnapshotResponse[];
}
