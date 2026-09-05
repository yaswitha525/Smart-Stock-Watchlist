import { Request } from 'express';
import { z } from 'zod';

/**
 * Zod schema for User Registration request payload.
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type RegisterDto = z.infer<typeof registerSchema>;

/**
 * Zod schema for User Login request payload.
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

/**
 * Safe public user representation without sensitive fields (passwordHash).
 */
export interface UserResponse {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication response payload containing JWT token and user profile.
 */
export interface AuthResponse {
  token: string;
  user: UserResponse;
}

/**
 * JWT Token payload contract (sub = user.id).
 */
export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user object attached to Express Request.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Express Request augmented with authenticated user metadata.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
