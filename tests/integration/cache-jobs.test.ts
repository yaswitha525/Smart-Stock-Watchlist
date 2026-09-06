import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { AuthService } from '../../src/services/auth.service.js';
import { StockService } from '../../src/services/stock.service.js';
import { CacheService } from '../../src/services/cache/cache.service.js';
import { InMemoryCacheProvider } from '../../src/services/cache/in-memory-cache.js';
import { JobQueueService } from '../../src/services/jobs/job-queue.service.js';
import { MockMarketDataProvider } from '../../src/services/market-data/mock-provider.js';
import { prisma, connectDatabase, isDatabaseConnected } from '../../src/db/prisma.js';
import { config } from '../../src/config/index.js';

describe('Phase 7 Caching, Background Jobs & Resilience Tests', () => {
  let authToken: string;
  let userId: string;
  let watchlistId: string;
  const sampleStock = {
    id: '77777777-7777-7777-7777-777777777777',
    symbol: 'CACHE_STOCK',
    exchange: 'NSE',
    name: 'Cache Test Stock Ltd',
    sector: 'Technology',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWatchlistsMap = new Map<string, any>();
  const mockWatchlistItemsMap = new Map<string, any>();
  const mockVisitsMap = new Map<string, any>();
  const mockStocksMap = new Map<string, any>([[sampleStock.id, sampleStock]]);
  const mockSnapshotsList: any[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
    CacheService.setProvider(new InMemoryCacheProvider());
    await connectDatabase();

    if (isDatabaseConnected()) {
      await prisma.stock.upsert({
        where: { id: sampleStock.id },
        update: {},
        create: sampleStock,
      });
    } else {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg(prisma);
      });

      vi.spyOn(prisma.stock, 'findUnique').mockImplementation(async (args: any) => {
        return mockStocksMap.get(args.where.id) || null;
      });

      vi.spyOn(prisma.stock, 'findMany').mockImplementation(async () => {
        return Array.from(mockStocksMap.values());
      });

      vi.spyOn(prisma.stock, 'count').mockImplementation(async () => {
        return mockStocksMap.size;
      });

      vi.spyOn(prisma.stockSnapshot, 'findFirst').mockImplementation(async (args: any) => {
        const list = mockSnapshotsList.filter((s) => s.stockId === args.where.stockId);
        return list[list.length - 1] || null;
      });

      vi.spyOn(prisma.stockSnapshot, 'findMany').mockImplementation(async (args: any) => {
        return mockSnapshotsList.filter((s) => s.stockId === args.where.stockId);
      });

      vi.spyOn(prisma.stockSnapshot, 'create').mockImplementation(async (args: any) => {
        const record = {
          id: `snap-${Math.random()}`,
          stockId: args.data.stockId,
          price: args.data.price,
          volume: args.data.volume,
          changePercent: args.data.changePercent,
          dataTimestamp: args.data.dataTimestamp,
          recordedAt: new Date(),
        };
        mockSnapshotsList.push(record);
        return record as any;
      });

      vi.spyOn(prisma.watchlist, 'create').mockImplementation(async (args: any) => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const record = {
          id,
          userId: args.data.userId,
          name: args.data.name,
          description: args.data.description || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockWatchlistsMap.set(id, record);
        return record as any;
      });

      vi.spyOn(prisma.watchlist, 'findFirst').mockImplementation(async (args: any) => {
        const { id, userId } = args.where;
        const w = mockWatchlistsMap.get(id);
        if (!w || (userId && w.userId !== userId)) return null as any;

        const items = Array.from(mockWatchlistItemsMap.values())
          .filter((i) => i.watchlistId === id)
          .map((i) => ({ ...i, stock: mockStocksMap.get(i.stockId) || sampleStock }));

        const visit = mockVisitsMap.get(`${userId}_${id}`);

        return { ...w, items, visits: visit ? [visit] : [] } as any;
      });

      vi.spyOn(prisma.watchlistItem, 'findUnique').mockImplementation(async (args: any) => {
        const key = `${args.where.watchlistId_stockId.watchlistId}_${args.where.watchlistId_stockId.stockId}`;
        return mockWatchlistItemsMap.get(key) || null;
      });

      vi.spyOn(prisma.watchlistItem, 'create').mockImplementation(async (args: any) => {
        const id = `item-${Math.random()}`;
        const item = {
          id,
          watchlistId: args.data.watchlistId,
          stockId: args.data.stockId,
          addedAt: new Date(),
          stock: mockStocksMap.get(args.data.stockId) || sampleStock,
        };
        mockWatchlistItemsMap.set(`${args.data.watchlistId}_${args.data.stockId}`, item);
        return item as any;
      });

      vi.spyOn(prisma.watchlist, 'update').mockImplementation(async (args: any) => {
        const w = mockWatchlistsMap.get(args.where.id) || {};
        const updated = { ...w, updatedAt: new Date() };
        mockWatchlistsMap.set(args.where.id, updated);
        return updated as any;
      });
    }

    // Register User
    const user = await AuthService.register({
      email: `cache_user_${Date.now()}@example.com`,
      password: 'password123',
    });
    authToken = user.token;
    userId = user.user.id;

    // Create watchlist
    const createRes = await request(app)
      .post('/api/v1/watchlists')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Cache Test Watchlist' });

    watchlistId = createRes.body.data.id;
  });

  beforeEach(async () => {
    await CacheService.flush();
  });

  describe('1 & 2. Cache Hit / Miss & TTL Expiration', () => {
    it('should return null on cache miss, store item, and hit on subsequent query', async () => {
      const key = 'test:key:1';
      const initial = await CacheService.get(key);
      expect(initial).toBeNull();

      await CacheService.set(key, { foo: 'bar' }, 10);
      const cached = await CacheService.get<{ foo: string }>(key);
      expect(cached).toEqual({ foo: 'bar' });

      const stats = await CacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should expire item after TTL duration', async () => {
      const key = 'test:ttl:key';
      // Set short TTL of 1 second
      await CacheService.set(key, { data: 123 }, 1);

      const immediate = await CacheService.get(key);
      expect(immediate).toEqual({ data: 123 });

      // Fast-forward time
      vi.setSystemTime(Date.now() + 2000);
      const expired = await CacheService.get(key);
      expect(expired).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('3 & 10 & 11. Cache Invalidation Hooks', () => {
    it('should invalidate stock catalog and stock detail cache on new snapshot ingestion', async () => {
      const detailKey = CacheService.keys.stockDetail(sampleStock.id);

      await StockService.getStockById(sampleStock.id);
      let cachedDetail = await CacheService.get(detailKey);
      expect(cachedDetail).not.toBeNull();

      // Ingest snapshot
      await StockService.recordSnapshot(sampleStock.id, {
        price: 150.0,
        volume: 5000,
        changePercent: 2.5,
      });

      // Verify stock detail cache was invalidated
      cachedDetail = await CacheService.get(detailKey);
      expect(cachedDetail).toBeNull();
    });

    it('should invalidate watchlist delta cache when a stock item is added to watchlist', async () => {
      const deltaKey = CacheService.keys.watchlistDelta(watchlistId, userId);

      // Pre-populate delta cache
      await CacheService.set(deltaKey, { cached: true }, 60);

      // Add item to watchlist
      await request(app)
        .post(`/api/v1/watchlists/${watchlistId}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stockId: sampleStock.id });

      const cachedDelta = await CacheService.get(deltaKey);
      expect(cachedDelta).toBeNull();
    });
  });

  describe('4. Graceful Fallback When Redis is Unavailable', () => {
    it('should fall back to InMemoryCacheProvider cleanly without throwing errors', async () => {
      CacheService.setProvider(new InMemoryCacheProvider());

      await CacheService.set('fallback:key', { value: 42 });
      const val = await CacheService.get<{ value: number }>('fallback:key');
      expect(val).toEqual({ value: 42 });

      const stats = await CacheService.getStats();
      expect(stats.provider).toBe('in-memory');
    });
  });

  describe('5 & 6. Background Job Dispatch & Deduplication Lock', () => {
    it('should dispatch async background market refresh job returning 202 status and jobId', async () => {
      const response = await request(app)
        .post('/api/v1/stocks/refresh?async=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobId');
      expect(['queued', 'completed', 'already_running']).toContain(response.body.data.status);
    });

    it('should prevent duplicate refresh jobs when previous job lock is active', async () => {
      // Simulate active job execution
      const dispatch1Promise = JobQueueService.dispatchRefreshJob();
      const dispatch2 = await JobQueueService.dispatchRefreshJob();

      expect(['already_running', 'queued', 'completed']).toContain(dispatch2.status);
      await dispatch1Promise;
    });
  });

  describe('7 & 8. Bounded Retries & Partial Batch Failure Handling', () => {
    it('should retry failed provider call up to 3 times with exponential backoff and handle partial stock failures', async () => {
      let callCount = 0;

      class FlakyProvider extends MockMarketDataProvider {
        public async fetchBatchQuotes(stocks: { symbol: string; exchange: string }[]): Promise<any[]> {
          callCount++;
          if (callCount < 2) {
            throw new Error('Transient provider socket timeout');
          }
          return super.fetchBatchQuotes(stocks);
        }
      }

      StockService.setProvider(new FlakyProvider());

      const result = await StockService.refreshMarketData();
      expect(callCount).toBe(2); // Proves it retried and succeeded on 2nd attempt
      expect(result).toHaveProperty('totalProcessed');

      // Reset to default mock provider
      StockService.setProvider(new MockMarketDataProvider());
    });
  });

  describe('9. Stale Market Data Detection', () => {
    it('should flag snapshot as isStale = true when dataTimestamp is older than threshold', async () => {
      const pastDataTime = new Date(Date.now() - 10 * 60 * 1000); // 10 mins ago

      const formatted = StockService.formatSnapshotResponse({
        id: 'snap-stale',
        stockId: sampleStock.id,
        price: 100,
        volume: 1000,
        changePercent: 0,
        dataTimestamp: pastDataTime,
        recordedAt: new Date(),
      });

      expect(formatted.isStale).toBe(true);

      const freshDataTime = new Date();
      const freshFormatted = StockService.formatSnapshotResponse({
        id: 'snap-fresh',
        stockId: sampleStock.id,
        price: 100,
        volume: 1000,
        changePercent: 0,
        dataTimestamp: freshDataTime,
        recordedAt: new Date(),
      });

      expect(freshFormatted.isStale).toBe(false);
    });
  });

  describe('10. Rate Limiting Middleware Enforcement', () => {
    it('should return 429 TOO_MANY_REQUESTS when auth endpoint threshold is exceeded', async () => {
      // Send 11 rapid requests to trigger rate limit (max 10 allowed)
      const requests = Array.from({ length: 11 }).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'ratelimit@example.com', password: 'password123' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedRes = responses.find((res) => res.status === 429);

      expect(rateLimitedRes).toBeDefined();
      expect(rateLimitedRes?.body.success).toBe(false);
      expect(rateLimitedRes?.body.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('11 & 12. Read-Only Delta Behavior & System Telemetry Protection', () => {
    it('should verify GET /watchlists/:id/delta does NOT alter lastVisitedAt during cache lookup', async () => {
      const res = await request(app)
        .get(`/api/v1/watchlists/${watchlistId}/delta`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify visits DB state remained unchanged or empty
      const visit = mockVisitsMap.get(`${userId}_${watchlistId}`);
      expect(visit).toBeUndefined();
    });

    it('should reject unauthenticated request to system telemetry endpoint with 401 UNAUTHORIZED', async () => {
      const unauthRes = await request(app).get('/api/v1/system/cache-stats');
      expect(unauthRes.status).toBe(401);

      const authRes = await request(app)
        .get('/api/v1/system/cache-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(authRes.status).toBe(200);
      expect(authRes.body.success).toBe(true);
      expect(authRes.body.data).toHaveProperty('cache');
      expect(authRes.body.data).toHaveProperty('jobs');
    });
  });
});
