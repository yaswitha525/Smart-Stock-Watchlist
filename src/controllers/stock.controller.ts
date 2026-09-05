import { Request, Response } from 'express';
import { StockService } from '../services/stock.service.js';
import { DeltaService } from '../services/delta.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * List & search stock master catalog with pagination.
 * GET /api/v1/stocks
 */
export const getStocks = asyncHandler(async (req: Request, res: Response) => {
  const result = await StockService.listStocks(req.query as any);
  return sendSuccess(res, result.items, 200, { pagination: result.pagination });
});

/**
 * Get single stock details by ID (with latest snapshot).
 * GET /api/v1/stocks/:id
 */
export const getStockById = asyncHandler(async (req: Request, res: Response) => {
  const stock = await StockService.getStockById(req.params.id);
  return sendSuccess(res, stock, 200);
});

/**
 * Get single stock details by Symbol and optional Exchange query.
 * GET /api/v1/stocks/symbol/:symbol
 */
export const getStockBySymbol = asyncHandler(async (req: Request, res: Response) => {
  const symbol = req.params.symbol;
  const exchange = (req.query.exchange as string) || 'NSE';
  const stock = await StockService.getStockBySymbol(symbol, exchange);
  return sendSuccess(res, stock, 200);
});

/**
 * Get historical price snapshots time-series for a stock.
 * GET /api/v1/stocks/:id/snapshots
 */
export const getSnapshotHistory = asyncHandler(async (req: Request, res: Response) => {
  const stockId = req.params.id;
  const snapshots = await StockService.getSnapshotHistory(stockId, req.query as any);
  return sendSuccess(res, snapshots, 200);
});

/**
 * Ingest/record a new market quote price snapshot for a stock.
 * Protected Endpoint: POST /api/v1/stocks/:id/snapshots
 */
export const recordSnapshot = asyncHandler(async (req: Request, res: Response) => {
  const stockId = req.params.id;
  const snapshot = await StockService.recordSnapshot(stockId, req.body);
  return sendSuccess(res, snapshot, 201);
});

import { JobQueueService } from '../services/jobs/job-queue.service.js';

/**
 * Trigger batch refresh of live market data quotes for all active stocks.
 * Supports async background job execution when ?async=true is passed.
 * Protected Endpoint: POST /api/v1/stocks/refresh
 */
export const refreshMarketData = asyncHandler(async (req: Request, res: Response) => {
  const isAsync = req.query.async === 'true';

  if (isAsync) {
    const jobResult = await JobQueueService.dispatchRefreshJob();
    return sendSuccess(res, jobResult, 202);
  }

  const result = await StockService.refreshMarketData();
  return sendSuccess(res, result, 200);
});

/**
 * Calculate meaningful-change delta analysis for a single stock against a reference timestamp.
 * GET /api/v1/stocks/:id/delta
 */
export const getStockDelta = asyncHandler(async (req: Request, res: Response) => {
  const stockId = req.params.id;
  const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const delta = await DeltaService.calculateStockDelta(stockId, since, req.query as any);
  return sendSuccess(res, delta, 200);
});
