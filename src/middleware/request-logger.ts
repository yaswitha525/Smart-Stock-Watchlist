import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

/**
 * Express HTTP request logger middleware.
 * Attaches request correlation loggers and logs status codes & response times.
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => {
      // Avoid spamming logs with frequent health checks if needed
      return req.url === '/api/health' || req.url === '/api/v1/health';
    },
  },
});
