import { config } from '../config/index.js';
import { checkDatabaseHealth, DatabaseHealthStatus } from '../db/prisma.js';
import { CacheService } from './cache/cache.service.js';
import { CacheStats } from './cache/cache.interface.js';
import { JobQueueService } from './jobs/job-queue.service.js';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  uptime: number;
  database: DatabaseHealthStatus;
  cache?: CacheStats;
  jobs?: {
    isRefreshRunning: boolean;
  };
}

/**
 * Health Service providing application health metadata & DB health checks.
 */
export class HealthService {
  public static async getStatus(): Promise<HealthStatus> {
    const dbHealth = await checkDatabaseHealth();
    const cacheStats = await CacheService.getStats();
    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

    if (!dbHealth.connected) {
      overallStatus = config.isProduction ? 'error' : 'degraded';
    }

    return {
      status: overallStatus,
      service: 'smart-market-watchlist-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: config.env,
      uptime: Math.floor(process.uptime()),
      database: dbHealth,
      cache: cacheStats,
      jobs: {
        isRefreshRunning: JobQueueService.isJobRunning(),
      },
    };
  }
}
