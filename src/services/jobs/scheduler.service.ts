import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { JobQueueService } from './job-queue.service.js';

/**
 * Scheduler Service running periodic background market quote refreshes.
 * Configurable via MARKET_REFRESH_INTERVAL_MS.
 */
export class SchedulerService {
  private static timer: NodeJS.Timeout | null = null;

  public static start(): void {
    const intervalMs = config.marketData.refreshIntervalMs;

    if (this.timer) {
      clearInterval(this.timer);
    }

    logger.info(`⏰ Market data refresh scheduler started (Interval: ${intervalMs}ms).`);

    this.timer = setInterval(async () => {
      if (JobQueueService.isJobRunning()) {
        logger.info('⏰ Scheduler skipped tick: previous refresh job is still running.');
        return;
      }

      logger.info('⏰ Scheduler tick triggered background market refresh job...');
      await JobQueueService.dispatchRefreshJob();
    }, intervalMs);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('⏰ Market data refresh scheduler stopped.');
    }
  }
}
