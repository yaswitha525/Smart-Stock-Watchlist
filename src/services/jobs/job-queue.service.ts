import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { StockService } from '../stock.service.js';

export interface RefreshJobResult {
  jobId: string;
  status: 'queued' | 'completed' | 'failed' | 'already_running';
  processedCount?: number;
  successCount?: number;
  failedCount?: number;
}

export class JobQueueService {
  private static queue: Queue | null = null;
  private static worker: Worker | null = null;
  private static isRunningLock = false; // Lock to prevent duplicate overlapping refresh jobs

  /**
   * Initializes BullMQ queue and worker if Redis is configured.
   */
  public static init(): void {
    if (config.redis.isConfigured && config.redis.url && !this.queue) {
      try {
        const connection = new Redis(config.redis.url, { maxRetriesPerRequest: null });

        this.queue = new Queue('market-refresh-queue', { connection });

        this.worker = new Worker(
          'market-refresh-queue',
          async (job) => {
            logger.info({ jobId: job.id }, '⚙️ Executing background market refresh job via BullMQ...');
            return await this.executeRefreshTask();
          },
          { connection }
        );

        this.worker.on('completed', (job, returnvalue) => {
          logger.info({ jobId: job.id, returnvalue }, '✅ BullMQ market refresh job completed.');
        });

        this.worker.on('failed', (job, err) => {
          logger.error({ jobId: job?.id, err: err.message }, '❌ BullMQ market refresh job failed.');
        });

        logger.info('✅ BullMQ job queue & worker initialized with Redis.');
      } catch (error) {
        logger.warn({ err: error }, '⚠️ BullMQ initialization failed. Falling back to in-memory job runner.');
      }
    }
  }

  /**
   * Dispatches a market refresh job. Deduplicates if a refresh job is currently running.
   */
  public static async dispatchRefreshJob(): Promise<RefreshJobResult> {
    const jobId = `refresh-${Date.now()}`;

    // Deduplication Lock Check
    if (this.isRunningLock) {
      logger.warn('⚠️ Duplicate market refresh job suppressed: previous job is still running.');
      return {
        jobId,
        status: 'already_running',
      };
    }

    if (this.queue) {
      try {
        this.isRunningLock = true;
        const job = await this.queue.add('refresh-stocks', { timestamp: new Date().toISOString() }, { jobId });
        return {
          jobId: job.id || jobId,
          status: 'queued',
        };
      } catch (error) {
        logger.warn({ err: error }, 'BullMQ dispatch failed, running in-memory fallback.');
      }
    }

    // In-Memory Fallback Execution for Dev/Test
    return await this.executeInMemoryJob(jobId);
  }

  /**
   * Executes in-memory job with locking and error handling.
   */
  private static async executeInMemoryJob(jobId: string): Promise<RefreshJobResult> {
    this.isRunningLock = true;
    try {
      logger.info({ jobId }, '⚙️ Executing in-memory market refresh task...');
      const summary = await this.executeRefreshTask();
      return {
        jobId,
        status: 'completed',
        processedCount: summary.totalProcessed,
        successCount: summary.succeeded,
        failedCount: summary.failed,
      };
    } catch (error) {
      logger.error({ err: error }, 'Error executing in-memory refresh job');
      return {
        jobId,
        status: 'failed',
      };
    } finally {
      this.isRunningLock = false;
    }
  }

  /**
   * Core market data refresh execution with partial success handling.
   */
  public static async executeRefreshTask() {
    this.isRunningLock = true;
    try {
      return await StockService.refreshMarketData();
    } finally {
      this.isRunningLock = false;
    }
  }

  public static isJobRunning(): boolean {
    return this.isRunningLock;
  }

  public static async shutdown(): Promise<void> {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
