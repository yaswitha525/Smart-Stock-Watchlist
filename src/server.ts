import { Server } from 'http';
import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './db/prisma.js';
import { JobQueueService } from './services/jobs/job-queue.service.js';
import { SchedulerService } from './services/jobs/scheduler.service.js';

let server: Server;

const startServer = async (): Promise<void> => {
  try {
    // 1. Initialize Database connection
    await connectDatabase();

    // 2. Initialize Background Job Queue & Start Scheduler
    JobQueueService.init();
    SchedulerService.start();

    // 3. Start HTTP listener
    server = app.listen(config.port, () => {
      logger.info(
        `🚀 Smart Market Watchlist API started successfully on port ${config.port} [${config.env}]`
      );
      logger.info(`Health check available at http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start HTTP server');
    process.exit(1);
  }
};

/**
 * Graceful server shutdown procedure.
 * Stops accepting new connections, drains requests, and closes database pools.
 */
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  SchedulerService.stop();

  if (!server) {
    logger.info('HTTP server was not running. Exiting now.');
    process.exit(0);
  }

  // Timeout for forced exit if shutdown takes longer than 10 seconds
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  }, 10000);

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
    } else {
      logger.info('HTTP server closed successfully.');
    }

    // Stop BullMQ job queue & worker
    await JobQueueService.shutdown();

    // Disconnect PostgreSQL PrismaClient pool
    await disconnectDatabase();

    clearTimeout(shutdownTimeout);
    logger.info('Cleanup complete. Process exiting gracefully.');
    process.exit(0);
  });
};

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unexpected process errors
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception detected! Shutting down process...');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled Promise Rejection detected! Shutting down process...');
  gracefulShutdown('unhandledRejection');
});

startServer();
