import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthenticatedRequest, RegisterDto, LoginDto } from '../types/auth.js';

/**
 * Controller for user registration (POST /api/v1/auth/register).
 */
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = req.body as RegisterDto;
  const result = await AuthService.register(dto);
  sendSuccess(res, result, 201);
});

/**
 * Controller for user authentication & login (POST /api/v1/auth/login).
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = req.body as LoginDto;
  const result = await AuthService.login(dto);
  sendSuccess(res, result, 200);
});

/**
 * Controller for fetching current authenticated user profile (GET /api/v1/auth/me).
 */
export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const user = await AuthService.getCurrentUser(userId);
  sendSuccess(res, user, 200);
});
