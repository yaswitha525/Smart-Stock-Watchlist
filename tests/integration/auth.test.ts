import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';

describe('Phase 3 Authentication Integration Tests', () => {
  const testUser = {
    email: `test_user_${Date.now()}@example.com`,
    password: 'password123',
  };

  let authToken: string;
  let userId: string;

  beforeAll(() => {
    // Ensure JWT_SECRET is set for integration tests
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUser.email);

      // SECURITY ASSERTION: passwordHash must NEVER be exposed
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.user).not.toHaveProperty('password');

      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('should fail with 400 BAD_REQUEST when email is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'validpassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should fail with 400 BAD_REQUEST when password is less than 8 characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'shortpass@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should fail with 409 CONFLICT when email is already registered', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with 401 INVALID_CREDENTIALS for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should fail with 401 INVALID_CREDENTIALS for incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me (Protected Profile Endpoint)', () => {
    it('should return authenticated user profile when valid Bearer token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should fail with 401 UNAUTHORIZED when Authorization header is missing', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with 401 UNAUTHORIZED when Authorization header is not Bearer format', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Basic ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with 401 UNAUTHORIZED when JWT token is malformed', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token.string');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with 401 UNAUTHORIZED when JWT token is expired', async () => {
      const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
      // Generate token expired 1 hour ago (-3600s)
      const expiredToken = jwt.sign({ sub: userId }, secret, { expiresIn: '-1h' });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('expired');
    });
  });
});
