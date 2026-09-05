import { Router } from 'express';
import {
  getStocks,
  getStockById,
  getStockBySymbol,
  getSnapshotHistory,
  recordSnapshot,
  refreshMarketData,
} from '../controllers/stock.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  stockQuerySchema,
  stockIdParamsSchema,
  stockSymbolParamsSchema,
  snapshotQuerySchema,
  recordSnapshotSchema,
} from '../types/stock.js';

const router = Router();

/**
 * List & search stock catalog with pagination.
 * Public Endpoint: GET /api/v1/stocks
 */
router.get('/', validateRequest({ query: stockQuerySchema }), getStocks);

/**
 * Get stock by symbol.
 * Public Endpoint: GET /api/v1/stocks/symbol/:symbol
 */
router.get('/symbol/:symbol', validateRequest({ params: stockSymbolParamsSchema }), getStockBySymbol);

/**
 * Batch refresh market data snapshots for all active stocks.
 * Protected Endpoint (Directive #7): POST /api/v1/stocks/refresh
 */
router.post('/refresh', authenticate, refreshMarketData);

/**
 * Get single stock details by ID (with latest snapshot).
 * Public Endpoint: GET /api/v1/stocks/:id
 */
router.get('/:id', validateRequest({ params: stockIdParamsSchema }), getStockById);

/**
 * Get historical price snapshots time-series for a stock.
 * Public Endpoint: GET /api/v1/stocks/:id/snapshots
 */
router.get(
  '/:id/snapshots',
  validateRequest({ params: stockIdParamsSchema, query: snapshotQuerySchema }),
  getSnapshotHistory
);

/**
 * Ingest/record a new price snapshot for a stock.
 * Protected Endpoint (Directive #6): POST /api/v1/stocks/:id/snapshots
 */
router.post(
  '/:id/snapshots',
  authenticate,
  validateRequest({ params: stockIdParamsSchema, body: recordSnapshotSchema }),
  recordSnapshot
);

export default router;
