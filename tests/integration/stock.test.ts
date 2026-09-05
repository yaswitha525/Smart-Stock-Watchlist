import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { AuthService } from '../../src/services/auth.service.js';
import { StockService } from '../../src/services/stock.service.js';
import { MockMarketDataProvider } from '../../src/services/market-data/mock-provider.js';
import { prisma, connectDatabase, isDatabaseConnected } from '../../src/db/prisma.js';

describe('Phase 5 Market Data Integration Tests', () => {
  let authToken: string;
  let testStockId: string;
  const mockStockId = '11111111-2222-3333-4444-555555555555';
  const mockSnapshots: any[] = [];
  const mockStocks = [
    {
      id: mockStockId,
      symbol: 'RELIANCE',
      exchange: 'NSE',
      name: 'Reliance Industries Limited',
      sector: 'Energy & Conglomerate',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '22222222-3333-4444-5555-666666666666',
      symbol: 'TCS',
      exchange: 'NSE',
      name: 'Tata Consultancy Services Limited',
      sector: 'Information Technology',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
    await connectDatabase();

    const user = await AuthService.register({
      email: `stock_tester_${Date.now()}@example.com`,
      password: 'password123',
    });
    authToken = user.token;

    // Set up Prisma mocks if database server is offline in test runner
    if (!isDatabaseConnected()) {
      vi.spyOn(prisma.stock, 'count').mockImplementation(async (args: any) => {
        let list = mockStocks;
        if (args?.where?.symbol?.contains) {
          list = list.filter((s) => s.symbol.toLowerCase().includes(args.where.symbol.contains.toLowerCase()));
        }
        return list.length;
      });

      vi.spyOn(prisma.stock, 'findMany').mockImplementation(async (args: any) => {
        let list = mockStocks;
        if (args?.where?.symbol?.contains) {
          list = list.filter((s) => s.symbol.toLowerCase().includes(args.where.symbol.contains.toLowerCase()));
        }
        return list.map((s) => ({
          ...s,
          snapshots: mockSnapshots.filter((sn) => sn.stockId === s.id).slice(0, 1),
        })) as any;
      });

      vi.spyOn(prisma.stock, 'findUnique').mockImplementation(async (args: any) => {
        let found = null;
        if (args?.where?.id) {
          found = mockStocks.find((s) => s.id === args.where.id);
        } else if (args?.where?.symbol_exchange) {
          found = mockStocks.find(
            (s) =>
              s.symbol === args.where.symbol_exchange.symbol &&
              s.exchange === args.where.symbol_exchange.exchange
          );
        }

        if (!found) return null as any;

        const snapshots = mockSnapshots
          .filter((sn) => sn.stockId === found.id)
          .sort((a, b) => b.dataTimestamp.getTime() - a.dataTimestamp.getTime());

        return {
          ...found,
          snapshots: snapshots.slice(0, 1),
        } as any;
      });

      vi.spyOn(prisma.stockSnapshot, 'findMany').mockImplementation(async (args: any) => {
        const stockId = args.where.stockId;
        return mockSnapshots.filter((sn) => sn.stockId === stockId) as any;
      });

      vi.spyOn(prisma.stockSnapshot, 'create').mockImplementation(async (args: any) => {
        const now = new Date();
        const record = {
          id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stockId: args.data.stockId,
          price: args.data.price,
          volume: args.data.volume,
          changePercent: args.data.changePercent,
          dataTimestamp: args.data.dataTimestamp || now,
          recordedAt: args.data.recordedAt || now,
        };
        mockSnapshots.push(record);
        return record as any;
      });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(prisma);
      });
    }
  });

  describe('Deterministic Mock Market Data Provider Unit Tests', () => {
    it('MockMarketDataProvider generates controlled and deterministic quotes', async () => {
      const mockProvider = new MockMarketDataProvider(true);
      mockProvider.setTick(10);

      const quote1 = await mockProvider.fetchQuote('RELIANCE', 'NSE');
      expect(quote1.symbol).toBe('RELIANCE');
      expect(quote1.exchange).toBe('NSE');
      expect(quote1.providerId).toBe('MOCK_SIMULATOR_V1');
      expect(quote1.price).toBe(2950.5);
      expect(quote1.dataTimestamp).toBeInstanceOf(Date);

      // Verify second call with same tick returns deterministic results
      mockProvider.setTick(10);
      const quote2 = await mockProvider.fetchQuote('RELIANCE', 'NSE');
      expect(quote2.price).toBe(quote1.price);
    });

    it('Swappable Provider Architecture - StockService.setProvider updates provider', () => {
      const customProvider = new MockMarketDataProvider(true);
      StockService.setProvider(customProvider);
      expect(StockService.getProvider()).toBe(customProvider);
    });
  });

  describe('GET /api/v1/stocks (Stock Master Catalog & Search)', () => {
    it('should list stock catalog with pagination metadata', async () => {
      const response = await request(app).get('/api/v1/stocks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');

      testStockId = response.body.data[0].id;
    });

    it('should filter stocks by search query', async () => {
      const response = await request(app).get('/api/v1/stocks?search=RELIANCE');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].symbol).toBe('RELIANCE');
    });
  });

  describe('GET /api/v1/stocks/:id & GET /api/v1/stocks/symbol/:symbol', () => {
    it('should retrieve stock details by ID', async () => {
      const response = await request(app).get(`/api/v1/stocks/${testStockId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testStockId);
    });

    it('should retrieve stock details by symbol (e.g. RELIANCE)', async () => {
      const response = await request(app).get('/api/v1/stocks/symbol/RELIANCE');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('RELIANCE');
    });

    it('should return 404 NOT_FOUND for non-existent stock symbol', async () => {
      const response = await request(app).get('/api/v1/stocks/symbol/NONEXISTENTSTOCK999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/stocks/:id/snapshots (Protected Snapshot Ingestion)', () => {
    it('should reject unauthenticated snapshot ingestion with 401 UNAUTHORIZED', async () => {
      const response = await request(app)
        .post(`/api/v1/stocks/${testStockId}/snapshots`)
        .send({
          price: 3050.5,
          volume: 6000000,
          changePercent: 3.38,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should ingest price snapshot for authenticated user and distinguish dataTimestamp & recordedAt', async () => {
      const customTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const response = await request(app)
        .post(`/api/v1/stocks/${testStockId}/snapshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: 3050.5,
          volume: 6000000,
          changePercent: 3.38,
          dataTimestamp: customTimestamp,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.stockId).toBe(testStockId);
      expect(response.body.data.price).toBe(3050.5);
      expect(response.body.data.volume).toBe(6000000);
      expect(response.body.data.changePercent).toBe(3.38);

      // Verify distinction between dataTimestamp and recordedAt
      expect(response.body.data).toHaveProperty('dataTimestamp');
      expect(response.body.data).toHaveProperty('recordedAt');
      expect(new Date(response.body.data.dataTimestamp).getTime()).toBeLessThan(
        new Date(response.body.data.recordedAt).getTime()
      );
    });

    it('should fail with 400 BAD_REQUEST when price is non-positive (e.g. -10)', async () => {
      const response = await request(app)
        .post(`/api/v1/stocks/${testStockId}/snapshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: -10,
          volume: 100000,
          changePercent: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should fail with 400 BAD_REQUEST when volume is negative', async () => {
      const response = await request(app)
        .post(`/api/v1/stocks/${testStockId}/snapshots`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: 100,
          volume: -500,
          changePercent: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/v1/stocks/:id/snapshots (Historical Time-Series)', () => {
    it('should retrieve historical snapshots for a stock', async () => {
      const response = await request(app).get(`/api/v1/stocks/${testStockId}/snapshots`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/v1/stocks/refresh (Protected Batch Refresh)', () => {
    it('should reject unauthenticated batch refresh with 401 UNAUTHORIZED', async () => {
      const response = await request(app).post('/api/v1/stocks/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should trigger batch refresh of stock snapshots for authenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/stocks/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalProcessed');
      expect(response.body.data).toHaveProperty('succeeded');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('snapshots');
      expect(Array.isArray(response.body.data.snapshots)).toBe(true);
    });
  });
});
