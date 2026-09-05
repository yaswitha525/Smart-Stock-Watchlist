import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { AuthService } from '../../src/services/auth.service.js';
import { WatchlistService } from '../../src/services/watchlist.service.js';
import { StockService } from '../../src/services/stock.service.js';
import { DeltaService } from '../../src/services/delta.service.js';
import { prisma, connectDatabase, isDatabaseConnected } from '../../src/db/prisma.js';

describe('Phase 6 Meaningful-Change Detection Algorithm Tests', () => {
  let tokenUserA: string;
  let userIdA: string;
  let tokenUserB: string;
  let userIdB: string;
  let watchlistIdA: string;

  const mockStockGain = {
    id: '11111111-1111-1111-1111-111111111111',
    symbol: 'GAIN_STOCK',
    exchange: 'NSE',
    name: 'Gain Stock Ltd',
    sector: 'IT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStockDrop = {
    id: '22222222-2222-2222-2222-222222222222',
    symbol: 'DROP_STOCK',
    exchange: 'NSE',
    name: 'Drop Stock Ltd',
    sector: 'Finance',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStockSurge = {
    id: '33333333-3333-3333-3333-333333333333',
    symbol: 'SURGE_STOCK',
    exchange: 'NSE',
    name: 'Surge Stock Ltd',
    sector: 'Pharma',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStockNeutral = {
    id: '44444444-4444-4444-4444-444444444444',
    symbol: 'NEUTRAL_STOCK',
    exchange: 'NSE',
    name: 'Neutral Stock Ltd',
    sector: 'Energy',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const refTime = new Date('2026-09-05T00:00:00.000Z');
  const pastTime = new Date('2026-09-04T00:00:00.000Z');
  const currentTime = new Date('2026-09-05T12:00:00.000Z');

  const mockSnapshotsDB: any[] = [
    // GAIN_STOCK: 100 -> 105 (+5% gain)
    { id: 's1', stockId: mockStockGain.id, price: 100, volume: 1000000, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
    { id: 's2', stockId: mockStockGain.id, price: 105, volume: 1000000, changePercent: 5, dataTimestamp: currentTime, recordedAt: currentTime },

    // DROP_STOCK: 100 -> 95 (-5% drop)
    { id: 's3', stockId: mockStockDrop.id, price: 100, volume: 1000000, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
    { id: 's4', stockId: mockStockDrop.id, price: 95, volume: 1000000, changePercent: -5, dataTimestamp: currentTime, recordedAt: currentTime },

    // SURGE_STOCK: 100 -> 100 (0% price), volume 1M -> 1.8M (+80% volume surge)
    { id: 's5', stockId: mockStockSurge.id, price: 100, volume: 1000000, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
    { id: 's6', stockId: mockStockSurge.id, price: 100, volume: 1800000, changePercent: 0, dataTimestamp: currentTime, recordedAt: currentTime },

    // NEUTRAL_STOCK: 100 -> 100.5 (+0.5% price), volume 1M -> 1.05M (+5% volume)
    { id: 's7', stockId: mockStockNeutral.id, price: 100, volume: 1000000, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
    { id: 's8', stockId: mockStockNeutral.id, price: 100.5, volume: 1050000, changePercent: 0.5, dataTimestamp: currentTime, recordedAt: currentTime },
  ];

  const mockWatchlistsDB = new Map<string, any>();
  const mockWatchlistItemsDB = new Map<string, any>();
  const mockVisitsDB = new Map<string, any>();
  const mockStocksMap = new Map<string, any>([
    [mockStockGain.id, mockStockGain],
    [mockStockDrop.id, mockStockDrop],
    [mockStockSurge.id, mockStockSurge],
    [mockStockNeutral.id, mockStockNeutral],
  ]);

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_groww_code_2026';
    await connectDatabase();

    // Prisma mocks if DB is offline in runner
    if (!isDatabaseConnected()) {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(prisma);
      });

      vi.spyOn(prisma.watchlist, 'create').mockImplementation(async (args: any) => {
        const id = '123e4567-e89b-12d3-a456-426614174000';
        const record = {
          id,
          userId: args.data.userId,
          name: args.data.name,
          description: args.data.description || null,
          createdAt: refTime,
          updatedAt: refTime,
        };
        mockWatchlistsDB.set(id, record);
        return record as any;
      });

      vi.spyOn(prisma.watchlist, 'findFirst').mockImplementation(async (args: any) => {
        const { id, userId } = args.where;
        const w = mockWatchlistsDB.get(id);
        if (!w || (userId && w.userId !== userId)) return null as any;

        const items = Array.from(mockWatchlistItemsDB.values())
          .filter((i) => i.watchlistId === id)
          .map((i) => {
            return { ...i, stock: mockStocksMap.get(i.stockId) || mockStockGain };
          });

        const visit = mockVisitsDB.get(`${userId}_${id}`);

        return {
          ...w,
          items,
          visits: visit ? [visit] : [],
        } as any;
      });

      vi.spyOn(prisma.watchlist, 'update').mockImplementation(async (args: any) => {
        const id = args.where.id;
        const existing = mockWatchlistsDB.get(id) || {};
        const updated = {
          ...existing,
          ...(args.data.name ? { name: args.data.name } : {}),
          ...(args.data.description !== undefined ? { description: args.data.description } : {}),
          updatedAt: new Date(),
        };
        mockWatchlistsDB.set(id, updated);
        return updated as any;
      });

      vi.spyOn(prisma.stock, 'findUnique').mockImplementation(async (args: any) => {
        return mockStocksMap.get(args.where.id) || null;
      });

      vi.spyOn(prisma.stockSnapshot, 'findFirst').mockImplementation(async (args: any) => {
        const stockId = args.where.stockId;
        let list = mockSnapshotsDB.filter((s) => s.stockId === stockId);

        if (args.where.dataTimestamp?.lte) {
          const lteTime = new Date(args.where.dataTimestamp.lte).getTime();
          list = list.filter((s) => s.dataTimestamp.getTime() <= lteTime);
        } else if (args.where.dataTimestamp?.gt) {
          const gtTime = new Date(args.where.dataTimestamp.gt).getTime();
          list = list.filter((s) => s.dataTimestamp.getTime() > gtTime);
        }

        if (args.orderBy?.dataTimestamp === 'desc') {
          list.sort((a, b) => b.dataTimestamp.getTime() - a.dataTimestamp.getTime());
        } else if (args.orderBy?.dataTimestamp === 'asc') {
          list.sort((a, b) => a.dataTimestamp.getTime() - b.dataTimestamp.getTime());
        }

        return list[0] || null;
      });

      vi.spyOn(prisma.watchlistItem, 'findUnique').mockImplementation(async (args: any) => {
        const key = `${args.where.watchlistId_stockId.watchlistId}_${args.where.watchlistId_stockId.stockId}`;
        return mockWatchlistItemsDB.get(key) || null;
      });

      vi.spyOn(prisma.watchlistItem, 'create').mockImplementation(async (args: any) => {
        const id = `item-${Math.random().toString(36).substring(2, 7)}`;
        const stockMap: Record<string, any> = {
          [mockStockGain.id]: mockStockGain,
          [mockStockDrop.id]: mockStockDrop,
          [mockStockSurge.id]: mockStockSurge,
          [mockStockNeutral.id]: mockStockNeutral,
        };
        const item = {
          id,
          watchlistId: args.data.watchlistId,
          stockId: args.data.stockId,
          addedAt: new Date(),
          stock: stockMap[args.data.stockId] || mockStockGain,
        };
        mockWatchlistItemsDB.set(`${args.data.watchlistId}_${args.data.stockId}`, item);
        return item as any;
      });

      vi.spyOn(prisma.userWatchlistVisit, 'findUnique').mockImplementation(async (args: any) => {
        const key = `${args.where.userId_watchlistId.userId}_${args.where.userId_watchlistId.watchlistId}`;
        return mockVisitsDB.get(key) || null;
      });

      vi.spyOn(prisma.userWatchlistVisit, 'upsert').mockImplementation(async (args: any) => {
        const key = `${args.create.userId}_${args.create.watchlistId}`;
        const visit = {
          id: 'v1',
          userId: args.create.userId,
          watchlistId: args.create.watchlistId,
          lastVisitedAt: currentTime,
        };
        mockVisitsDB.set(key, visit);
        return visit as any;
      });
    }

    // Register Users
    const userA = await AuthService.register({
      email: `delta_user_a_${Date.now()}@example.com`,
      password: 'password123',
    });
    tokenUserA = userA.token;
    userIdA = userA.user.id;

    const userB = await AuthService.register({
      email: `delta_user_b_${Date.now()}@example.com`,
      password: 'password123',
    });
    tokenUserB = userB.token;
    userIdB = userB.user.id;

    // Setup watchlist for User A with 4 test stocks
    const createRes = await request(app)
      .post('/api/v1/watchlists')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ name: 'Delta Test Watchlist' });

    watchlistIdA = createRes.body.data.id;

    // Add stocks to watchlist
    await WatchlistService.addStockToWatchlist(userIdA, watchlistIdA, { stockId: mockStockGain.id });
    await WatchlistService.addStockToWatchlist(userIdA, watchlistIdA, { stockId: mockStockDrop.id });
    await WatchlistService.addStockToWatchlist(userIdA, watchlistIdA, { stockId: mockStockSurge.id });
    await WatchlistService.addStockToWatchlist(userIdA, watchlistIdA, { stockId: mockStockNeutral.id });
  });

  describe('Algorithmic Rule-Based Classification Unit Tests', () => {
    it('1. SIGNIFICANT_GAIN classification (price +5.0% >= 2.0%)', async () => {
      const delta = await DeltaService.calculateStockDelta(mockStockGain.id, refTime);

      expect(delta.priceChangePercent).toBe(5);
      expect(delta.signals).toContain('SIGNIFICANT_GAIN');
      expect(delta.isMeaningful).toBe(true);
      expect(delta.insight).toContain('GAIN_STOCK rose +5.00%');
    });

    it('2. SIGNIFICANT_DROP classification (price -5.0% <= -2.0%)', async () => {
      const delta = await DeltaService.calculateStockDelta(mockStockDrop.id, refTime);

      expect(delta.priceChangePercent).toBe(-5);
      expect(delta.signals).toContain('SIGNIFICANT_DROP');
      expect(delta.isMeaningful).toBe(true);
      expect(delta.insight).toContain('DROP_STOCK dropped -5.00%');
    });

    it('3. VOLUME_SURGE classification (volume +80% >= 50%)', async () => {
      const delta = await DeltaService.calculateStockDelta(mockStockSurge.id, refTime);

      expect(delta.volumeChangePercent).toBe(80);
      expect(delta.signals).toContain('VOLUME_SURGE');
      expect(delta.isMeaningful).toBe(true);
      expect(delta.insight.toLowerCase()).toContain('volume surge');
    });

    it('4. NEUTRAL classification (price +0.5%, volume +5.0%)', async () => {
      const delta = await DeltaService.calculateStockDelta(mockStockNeutral.id, refTime);

      expect(delta.signals).toEqual(['NEUTRAL']);
      expect(delta.isMeaningful).toBe(false);
      expect(delta.insight).toContain('remained stable');
    });

    it('5. Simultaneous SIGNIFICANT_GAIN + VOLUME_SURGE signals support', async () => {
      // Simulate stock with +5% price AND +80% volume
      const mockStockBoth = 'both-stock-id';
      if (!isDatabaseConnected()) {
        mockSnapshotsDB.push(
          { id: 'sb1', stockId: mockStockBoth, price: 100, volume: 1000000, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
          { id: 'sb2', stockId: mockStockBoth, price: 110, volume: 2000000, changePercent: 10, dataTimestamp: currentTime, recordedAt: currentTime }
        );
        mockStocksMap.set(mockStockBoth, { id: mockStockBoth, symbol: 'BOTH_STOCK', exchange: 'NSE', name: 'Both Stock', sector: 'IT', isActive: true });
      }

      const delta = await DeltaService.calculateStockDelta(mockStockBoth, refTime);
      expect(delta.signals).toContain('SIGNIFICANT_GAIN');
      expect(delta.signals).toContain('VOLUME_SURGE');
      expect(delta.isMeaningful).toBe(true);
      expect(delta.insight).toContain('rose +10.00%');
      expect(delta.insight).toContain('experienced a +100.00% volume surge');
    });

    it('6. Zero baseline volume division-by-zero protection (returns volumeChangePercent: null)', async () => {
      const zeroVolStockId = 'zero-vol-stock-id';
      if (!isDatabaseConnected()) {
        mockSnapshotsDB.push(
          { id: 'zv1', stockId: zeroVolStockId, price: 100, volume: 0, changePercent: 0, dataTimestamp: pastTime, recordedAt: pastTime },
          { id: 'zv2', stockId: zeroVolStockId, price: 100, volume: 500000, changePercent: 0, dataTimestamp: currentTime, recordedAt: currentTime }
        );
        mockStocksMap.set(zeroVolStockId, { id: zeroVolStockId, symbol: 'ZERO_VOL', exchange: 'NSE', name: 'Zero Vol', sector: 'IT', isActive: true });
      }

      const delta = await DeltaService.calculateStockDelta(zeroVolStockId, refTime);
      expect(delta.volumeChangePercent).toBeNull();
      expect(isNaN(delta.priceChangePercent)).toBe(false);
    });

    it('7. Missing baseline snapshot graceful handling (no NaN/Infinity)', async () => {
      const noBaseStockId = 'no-base-stock-id';
      if (!isDatabaseConnected()) {
        mockSnapshotsDB.push(
          { id: 'nb1', stockId: noBaseStockId, price: 200, volume: 50000, changePercent: 0, dataTimestamp: currentTime, recordedAt: currentTime }
        );
        mockStocksMap.set(noBaseStockId, { id: noBaseStockId, symbol: 'NO_BASE', exchange: 'NSE', name: 'No Base', sector: 'IT', isActive: true });
      }

      const delta = await DeltaService.calculateStockDelta(noBaseStockId, refTime);
      expect(delta.baselinePrice).toBeNull();
      expect(delta.priceDelta).toBe(0);
      expect(isNaN(delta.priceChangePercent)).toBe(false);
      expect(delta.insight).toContain('No earlier snapshot available');
    });

    it('8. Custom Threshold Query Parameters (priceThreshold=10.0%)', async () => {
      // Stock has +5% gain, but priceThreshold is set to 10%, so it becomes NEUTRAL
      const delta = await DeltaService.calculateStockDelta(mockStockGain.id, refTime, {
        priceThreshold: 10.0,
      });

      expect(delta.signals).toEqual(['NEUTRAL']);
      expect(delta.isMeaningful).toBe(false);
    });
  });

  describe('GET /api/v1/watchlists/:id/delta (Watchlist Delta API & Read-Only Semantics)', () => {
    it('9. First-time visitor baseline evaluation (hasPreviousVisit = false)', async () => {
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}/delta`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.watchlistId).toBe(watchlistIdA);
      expect(response.body.data.hasPreviousVisit).toBe(false);
      expect(response.body.data).toHaveProperty('summaryInsight');
      expect(response.body.data.summaryInsight).toContain('Initial baseline view');
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('10. READ-ONLY DELTA SEMANTICS - calling GET delta does NOT alter lastVisitedAt', async () => {
      const res1 = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}/delta`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      const res2 = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}/delta`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res1.body.data.hasPreviousVisit).toBe(false);
      expect(res2.body.data.hasPreviousVisit).toBe(false);
    });

    it('11. Previous visit baseline evaluation (hasPreviousVisit = true)', async () => {
      // Explicitly update visit timestamp via POST /visit
      await request(app)
        .post(`/api/v1/watchlists/${watchlistIdA}/visit`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      // Now query GET /delta
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}/delta`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hasPreviousVisit).toBe(true);
      expect(response.body.data.summaryInsight).toContain('Since your last visit on');
    });

    it('12. STRICT OWNERSHIP ISOLATION - User B receives 404 NOT_FOUND for User A watchlist delta', async () => {
      const response = await request(app)
        .get(`/api/v1/watchlists/${watchlistIdA}/delta`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/stocks/:id/delta (Single Stock Delta API)', () => {
    it('should calculate single stock delta against reference timestamp', async () => {
      const response = await request(app).get(`/api/v1/stocks/${mockStockGain.id}/delta`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stockId).toBe(mockStockGain.id);
      expect(response.body.data.signals).toContain('SIGNIFICANT_GAIN');
      expect(response.body.data).toHaveProperty('insight');
    });
  });
});
