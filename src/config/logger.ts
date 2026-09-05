import pino from 'pino';
import { config } from './index.js';

/**
 * Centralized Pino logger setup.
 * Outputs structured JSON in production and readable formatting in development.
 */
export const logger = pino({
  level: config.logLevel,
  ...(config.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          },
        },
      }
    : {}),
  base: {
    service: 'smart-market-watchlist-api',
    env: config.env,
  },
});
