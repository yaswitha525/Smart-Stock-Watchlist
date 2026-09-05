import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../errors/app-error.js';
import { AuthenticatedRequest } from '../types/auth.js';

/**
 * Authentication Middleware.
 * Verifies Bearer JWT token from Authorization header and attaches
 * authenticated user details (`req.user = { id, email }`) to request.
 * Designed for future watchlist and user resource ownership enforcement.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or malformed (expected format: Bearer <token>)');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token cannot be empty');
    }

    // Verify token & decode payload { sub: userId }
    const payload = AuthService.verifyToken(token);

    // Verify user exists in database or memory store
    const user = await AuthService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists');
    }

    // Attach authenticated user to request object
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};
