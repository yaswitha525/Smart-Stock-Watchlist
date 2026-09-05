import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache/cache.service.js';
import { JobQueueService } from '../services/jobs/job-queue.service.js';

/**
 * Controller handler for protected internal system telemetry.
 * GET /api/v1/system/cache-stats
 */
export const getSystemCacheStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cacheStats = await CacheService.getStats();
    const isJobRunning = JobQueueService.isJobRunning();

    res.status(200).json({
      success: true,
      data: {
        cache: cacheStats,
        jobs: {
          isRefreshRunning: isJobRunning,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
