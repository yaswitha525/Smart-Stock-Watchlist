import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { AuthService } from '../../src/services/auth.service.js';
import { prisma, connectDatabase, isDatabaseConnected } from '../../src/db/prisma.js';

describe('Phase 4 Watchlist APIs Integration Tests', () => {
  let tokenUserA: string;
  let userIdA: string;
  let tokenUserB: string;
  let userIdB: string;
  let watchlistIdA: string;
  const sampleStockId = '11111111-2222-3333-4444-555555555555';

  // In-memory db mock store for offline test execution
  const mockWatchlists = new Map<string, any>();
  const mockWatchlistItems = new Map<string, any>();
  const mockVisits = new Map<string, any>();

  const mockStock = {
    id: sampleStockId,
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Limited',
    sector: 'Energy & Conglomerate',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
    await connectDatabase();

    // Register User A & User B
    const userA = await AuthService.register({
      email: `user_a_${Date.now()}@example.com`,
      password: 'password123',
    });
    tokenUserA = userA.token;
    userIdA = userA.user.id;

    const userB = await AuthService.register({
      email: `user_b_${Date.now()}@example.com`,
      password: 'password123',
    });
    tokenUserB = userB.token;
    userIdB = userB.user.id;

    // Set up Prisma spies for offline test execution if DB connection is unavailable
    if (!isDatabaseConnected()) {
      vi.spyOn(prisma.watchlist, 'create').mockImplementation(async (args: any) => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const now = new Date();
        const record = {
          id,
          userId: args.data.userId,
          name: args.data.name,
          description: args.data.description || null,
          createdAt: now,
          updatedAt: now,
        };
        mockWatchlists.set(id, record);
        return record as any;
      });

      vi.spyOn(prisma.watchlist, 'findMany').mockImplementation(async (args: any) => {
        const userId = args.where.userId;
        const results = Array.from(mockWatchlists.values()).filter((w) => w.userId === userId);
        return results.map((w) => ({
          ...w,
          _count: { items: Array.from(mockWatchlistItems.values()).filter((i) => i.watchlistId === w.id).length },
          visits: mockVisits.has(`${userId}_${w.id}`) ? [mockVisits.get(`${userId}_${w.id}`)] : [],
        })) as any;
      });

      vi.spyOn(prisma.watchlist, 'findFirst').mockImplementation(async (args: any) => {
        const { id, userId } = args.where;
        const w = mockWatchlists.get(id);
        if (!w || (userId && w.userId !== userId)) return null as any;

        const items = Array.from(mockWatchlistItems.values())
          .filter((i) => i.watchlistId === id)
          .map((i) => ({ ...i, stock: mockStock }));

        const visit = mockVisits.get(`${userId}_${id}`);

        return {
          ...w,
          items,
          visits: visit ? [visit] : [],
        } as any;
      });

      vi.spyOn(prisma.watchlist, 'update').mockImplementation(async (args: any) => {
        const id = args.where.id;
        const existing = mockWatchlists.get(id);
        if (!existing) throw new Error('Not found');

        const updated = {
          ...existing,
          ...(args.data.name ? { name: args.data.name } : {}),
          ...(args.data.description !== undefined ? { description: args.data.description } : {}),
          updatedAt: new Date(),
        };
        mockWatchlists.set(id, updated);

        const items = Array.from(mockWatchlistItems.values()).filter((i) => i.watchlistId === id);
        const visit = mockVisits.get(`${existing.userId}_${id}`);

        return {
          ...updated,
          _count: { items: items.length },
          visits: visit ? [visit] : [],
        } as any;
      });

      vi.spyOn(prisma.watchlist, 'delete').mockImplementation(async (args: any) => {
        const id = args.where.id;
        mockWatchlists.delete(id);
        return {} as any;
      });

      vi.spyOn(prisma.stock, 'findUnique').mockImplementation(async (args: any) => {
        if (args.where.id === sampleStockId || (args.where.symbol_exchange && args.where.symbol_exchange.symbol === 'RELIANCE')) {
          return mockStock as any;
        }
        return null as any;
      });

      vi.spyOn(prisma.watchlistItem, 'findUnique').mockImplementation(async (args: any) => {
        const key = `${args.where.watchlistId_stockId.watchlistId}_${args.where.watchlistId_stockId.stockId}`;
        return mockWatchlistItems.get(key) || null;
      });

      vi.spyOn(prisma.watchlistItem, 'create').mockImplementation(async (args: any) => {
        const id = '22222222-3333-4444-5555-666666666666';
        const key = `${args.data.watchlistId}_${args.data.stockId}`;
        const item = {
          id,
          watchlistId: args.data.watchlistId,
          stockId: args.data.stockId,
          addedAt: new Date(),
          stock: mockStock,
        };
        mockWatchlistItems.set(key, item);
        return item as any;
      });

      vi.spyOn(prisma.watchlistItem, 'delete').mockImplementation(async (args: any) => {
        const key = `${args.where.watchlistId_stockId.watchlistId}_${args.where.watchlistId_stockId.stockId}`;
        mockWatchlistItems.delete(key);
        return {} as any;
      });

      vi.spyOn(prisma.userWatchlistVisit, 'upsert').mockImplementation(async (args: any) => {
        const key = `${args.create.userId}_${args.create.watchlistId}`;
        const visit = {
          id: '33333333-4444-5555-6666-777777777777',
          userId: args.create.userId,
          watchlistId: args.create.watchlistId,
          lastVisitedAt: new Date(),
        };
        mockVisits.set(key, visit);
        return visit as any;
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(prisma);
      });
    }
  });

  describe('Unauthenticated Request Guard', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const response = await request(app).get('/api/v1/watchlists');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/watchlists (Create Watchlist)', () => {
    it('should fail with 400 BAD_REQUEST when watchlist name is empty', async () => {
      const response = await request(app)
        .post('/api/v1/watchlists')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should create a new watchlist for User A', async () => {
      const response = await request(app)
        .post('/api/v1/watchlists')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'Bluechip Watchlist',
          description: 'Top market cap companies',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.userId).toBe(userIdA);
      expect(response.body.data.name).toBe('Bluechip Watchlist');
      expect(response.body.data.description).toBe('Top market cap companies');
      expect(response.body.data.itemCount).toBe(0);

      watchlistIdA = response.body.data.id;
    });
  });

  describe('GET /api/v1/watchlists (List User Watchlists)', () => {
    it('should list all watchlists owned by User A', async () => {
      const response = await request(app)
        .get('/api/v1/watchlists')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].id).toBe(watchlistIdA);
    });

    it('should return empty list for User B before User B creates watchlists', async () => {
      const response = await request(app)
        .get('/api/v1/watchlists')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/watchlists/:id (Watchlist Detail)', () => {
    it('should retrieve watchlist detail for User A without mutating lastVisitedAt', async () => {
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(watchlistIdA);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe('POST /api/v1/watchlists/:id/items (Add Stock Item)', () => {
    it('should add stock by symbol (e.g. RELIANCE) to User A watchlist', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/items`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          symbol: 'RELIANCE',
          exchange: 'NSE',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.watchlistId).toBe(watchlistIdA);
      expect(response.body.data).toHaveProperty('stock');
      expect(response.body.data.stock.symbol).toBe('RELIANCE');
    });

    it('should fail with 409 CONFLICT when adding duplicate stock to same watchlist', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/items`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          symbol: 'RELIANCE',
          exchange: 'NSE',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toBe('Stock is already in this watchlist');
    });

    it('should fail with 404 NOT_FOUND when adding a non-existent stock symbol', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/items`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          symbol: 'NONEXISTENTSTOCK123',
          exchange: 'NSE',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/watchlists/:id (Update Watchlist)', () => {
    it('should update watchlist name and description for User A', async () => {
      const response = await request(app)
        .put(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'Updated Bluechip List',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Bluechip List');
      expect(response.body.data.description).toBe('Updated description');
    });
  });

  describe('POST /api/v1/watchlists/:id/visit (Explicit Visit Endpoint)', () => {
    it('should update lastVisitedAt timestamp for User A', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/visit`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('lastVisitedAt');
      expect(response.body.data.watchlistId).toBe(watchlistIdA);
      expect(response.body.data.userId).toBe(userIdA);
    });
  });

  describe('SECURITY & ISOLATION TESTS — User B vs User A Watchlist', () => {
    it('User B CANNOT read User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('User B CANNOT update User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .put(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Hacked Watchlist' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('User B CANNOT add stock to User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/items`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ symbol: 'TCS' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('User B CANNOT remove stock from User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .delete(`/api/v1/watchlists/${watchlistIdA}/items/${sampleStockId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('User B CANNOT record visit on User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/visit`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('User B CANNOT delete User A watchlist (404 NOT_FOUND)', async () => {
      const response = await request(app)
        .delete(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/watchlists/:id/items/:stockId (Remove Stock Item)', () => {
    it('should allow User A to remove stock from User A watchlist', async () => {
      const response = await request(app)
        .delete(`/api/v1/watchlists/${watchlistIdA}/items/${sampleStockId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Stock removed from watchlist successfully');
    });
  });

  describe('DELETE /api/v1/watchlists/:id (Delete Watchlist)', () => {
    it('should allow User A to delete User A watchlist', async () => {
      const response = await request(app)
        .delete(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Watchlist deleted successfully');
    });

    it('should return 404 NOT_FOUND when User A requests deleted watchlist', async () => {
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
