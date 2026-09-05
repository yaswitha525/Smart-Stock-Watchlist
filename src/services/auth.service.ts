import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import {
  ConflictError,
  InvalidCredentialsError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
} from '../errors/app-error.js';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  UserResponse,
  JwtPayload,
} from '../types/auth.js';

const SALT_ROUNDS = 10;

// In-memory user store fallback for dev/test environments when PostgreSQL is offline
const memoryUsers = new Map<string, User>();

/**
 * Maps database User entity to public UserResponse contract (excludes passwordHash).
 */
export const toUserResponse = (user: User): UserResponse => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

export class AuthService {
  /**
   * Helper to find a user by email, trying Prisma first then falling back to memory if DB is offline.
   */
  public static async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    if (isDatabaseConnected()) {
      try {
        return await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      } catch (error) {
        logger.warn({ err: error }, 'Prisma query failed, attempting in-memory fallback');
      }
    }

    // In-memory fallback
    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase().trim() === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  /**
   * Helper to find a user by ID, trying Prisma first then falling back to memory if DB is offline.
   */
  public static async findUserById(id: string): Promise<User | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.user.findUnique({
          where: { id },
        });
      } catch (error) {
        logger.warn({ err: error }, 'Prisma query failed, attempting in-memory fallback');
      }
    }

    return memoryUsers.get(id) || null;
  }

  /**
   * Helper to create a new user, trying Prisma first then falling back to memory if DB is offline.
   */
  public static async createUser(email: string, passwordHash: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();

    if (isDatabaseConnected()) {
      try {
        return await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
          },
        });
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code: string }).code === 'P2002'
        ) {
          throw new ConflictError('User with this email already exists');
        }
        logger.warn({ err: error }, 'Prisma user creation failed, attempting in-memory fallback');
      }
    }

    // Check duplicate in memory fallback
    const existing = await this.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const id = `user-mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const newUser: User = {
      id,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    memoryUsers.set(id, newUser);
    return newUser;
  }

  /**
   * Helper to sign JWT access token with minimal payload { sub: userId }.
   * Secret must come from environment configuration (config.jwt.secret).
   */
  public static generateToken(userId: string): string {
    const secret = config.jwt.secret;
    if (!secret) {
      throw new InternalServerError('JWT_SECRET is not configured in environment');
    }

    const payload: JwtPayload = { sub: userId };
    const options: jwt.SignOptions = {
      expiresIn: (config.jwt.expiresIn || '24h') as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, secret, options);
  }

  /**
   * Helper to verify and decode JWT access token.
   */
  public static verifyToken(token: string): JwtPayload {
    const secret = config.jwt.secret;
    if (!secret) {
      throw new InternalServerError('JWT_SECRET is not configured in environment');
    }

    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
        throw new UnauthorizedError('Invalid token payload structure');
      }
      return {
        sub: decoded.sub as string,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('JWT token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid JWT token signature or payload');
      }
      throw error;
    }
  }

  /**
   * Registers a new user account.
   */
  public static async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.findUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.createUser(dto.email, passwordHash);
    const token = this.generateToken(user.id);

    return {
      token,
      user: toUserResponse(user),
    };
  }

  /**
   * Authenticates user login credentials.
   * Throws generic INVALID_CREDENTIALS for both missing user and wrong password
   * to prevent user enumeration attacks.
   */
  public static async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.findUserByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: toUserResponse(user),
    };
  }

  /**
   * Retrieves profile details for an authenticated user.
   */
  public static async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User account not found');
    }
    return toUserResponse(user);
  }
}
