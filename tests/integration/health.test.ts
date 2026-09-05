import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Health Check API & Error Middleware Integration Tests', () => {
  it('GET /api/health - should return 200 OK with health metadata', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(['ok', 'degraded']).toContain(response.body.status);
    expect(response.body).toHaveProperty('service', 'smart-market-watchlist-api');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('database');
  });

  it('GET /api/v1/health - should return 200 OK via API v1 router', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(['ok', 'degraded']).toContain(response.body.status);
    expect(response.body).toHaveProperty('service', 'smart-market-watchlist-api');
  });

  it('GET /api/non-existent-route - should return 404 with standardized error JSON', async () => {
    const response = await request(app).get('/api/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found: GET /api/non-existent-route',
      },
    });
  });
});
