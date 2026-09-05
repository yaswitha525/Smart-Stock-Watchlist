import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express request handler to catch any unhandled promises
 * and pass the error to Express error middleware (`next(err)`).
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
