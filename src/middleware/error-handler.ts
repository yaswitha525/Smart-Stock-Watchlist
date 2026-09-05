import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

/**
 * Centralized Express Error Handling Middleware.
 * Catches all operational & system errors and formats consistent JSON responses.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return;
  }

  // Handle known operational AppError exceptions
  if (err instanceof AppError) {
    logger.warn(
      {
        code: err.errorCode,
        statusCode: err.statusCode,
        details: err.details,
        message: err.message,
      },
      `Operational Error: [${err.errorCode}] ${err.message}`
    );

    sendError(
      res,
      err.errorCode,
      err.message,
      err.statusCode,
      config.isDevelopment ? err.details : undefined
    );
    return;
  }

  // Handle syntax/JSON body parsing errors thrown by Express body-parser
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    logger.warn({ message: err.message }, 'Malformed JSON body');
    sendError(res, 'BAD_REQUEST', 'Malformed JSON in request body', 400);
    return;
  }

  // Log unexpected/programmer errors
  logger.error(
    {
      err,
      stack: err.stack,
    },
    `Unhandled Exception: ${err.message}`
  );

  // Send generic error message in production to prevent leaking internal stack trace details
  const message = config.isProduction
    ? 'An unexpected server error occurred'
    : err.message || 'Internal Server Error';

  sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
};
