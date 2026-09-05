import { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * Health Controller handling health check endpoints.
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const healthData = await HealthService.getStatus();

  // In production, database unavailability MUST result in 503 Service Unavailable
  if (config.isProduction && !healthData.database.connected) {
    res.status(503).json(healthData);
    return;
  }

  res.status(200).json(healthData);
});
