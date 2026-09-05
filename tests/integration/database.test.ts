import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrismaClient, checkDatabaseHealth } from '../../src/db/prisma.js';

describe('Phase 2 Database & Persistence Integration Tests', () => {
  it('Prisma Client Singleton - should instantiate PrismaClient instance', () => {
    const client = getPrismaClient();
    expect(client).toBeDefined();
    expect(typeof client.$connect).toBe('function');
    expect(typeof client.$disconnect).toBe('function');
  });

  it('Database Health Utility - checkDatabaseHealth() returns structured status', async () => {
    const dbStatus = await checkDatabaseHealth();
    expect(dbStatus).toHaveProperty('connected');
    expect(typeof dbStatus.connected).toBe('boolean');
  });

  it('GET /api/health - should include database connectivity details', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('connected');
  });
});
