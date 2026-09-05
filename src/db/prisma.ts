import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { DatabaseConnectionError } from '../errors/app-error.js';

let prismaInstance: PrismaClient | null = null;
let isConnected = false;

/**
 * Returns singleton PrismaClient instance.
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
};

export const prisma = getPrismaClient();

export interface DatabaseHealthStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Connects to PostgreSQL database on server initialization.
 */
export const connectDatabase = async (): Promise<void> => {
  if (!config.database.isConfigured) {
    const msg = 'DATABASE_URL is not configured in environment variables.';
    if (config.isProduction) {
      logger.fatal(msg);
      throw new DatabaseConnectionError(msg, 503);
    } else {
      logger.warn(`⚠️ [DEV MODE] ${msg} Database features will be unavailable.`);
      isConnected = false;
      return;
    }
  }

  try {
    const client = getPrismaClient();
    const startTime = Date.now();
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    isConnected = true;
    logger.info(`✅ PostgreSQL Database connected successfully (${latency}ms)`);
  } catch (error) {
    isConnected = false;
    const errMsg = error instanceof Error ? error.message : 'Unknown database connection error';
    logger.error({ err: error }, `❌ Failed to connect to PostgreSQL: ${errMsg}`);

    if (config.isProduction) {
      throw new DatabaseConnectionError(
        `Critical: Database service connection failed - ${errMsg}`,
        503
      );
    } else {
      logger.warn('⚠️ [DEV MODE] Continuing without active database connection.');
    }
  }
};

/**
 * Disconnects PrismaClient gracefully on server shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      isConnected = false;
      logger.info('PostgreSQL Database connection closed gracefully.');
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting PrismaClient');
    }
  }
};

/**
 * Checks active database connectivity status & latency.
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  if (!config.database.isConfigured) {
    return {
      connected: false,
      error: 'DATABASE_URL is not configured',
    };
  }

  try {
    const client = getPrismaClient();
    const startTime = Date.now();
    await client.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    isConnected = true;
    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    isConnected = false;
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Database ping query failed',
    };
  }
};

export const isDatabaseConnected = (): boolean => isConnected;
