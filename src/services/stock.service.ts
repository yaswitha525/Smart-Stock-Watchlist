import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';
import { IMarketDataProvider, MarketQuoteMetadata } from './market-data/provider.interface.js';
import { MarketDataProviderFactory } from './market-data/provider.factory.js';
import { CacheService } from './cache/cache.service.js';
import {
  StockQueryDto,
  SnapshotQueryDto,
  RecordSnapshotDto,
  StockResponse,
  StockSnapshotResponse,
  PaginatedStockResponse,
  BatchRefreshResponse,
} from '../types/stock.js';

export class StockService {
  /**
   * Active Market Data Provider instance. Selected via `MarketDataProviderFactory`.
   * Swappable via `setProvider()`.
   */
  private static provider: IMarketDataProvider = MarketDataProviderFactory.getProvider();

  /**
   * Sets/swaps the active Market Data Provider instance.
   */
  public static setProvider(provider: IMarketDataProvider): void {
    this.provider = provider;
  }

  /**
   * Returns the current Market Data Provider instance.
   */
  public static getProvider(): IMarketDataProvider {
    return this.provider;
  }

  /**
   * Formats a raw Prisma StockSnapshot record into `StockSnapshotResponse`.
   * Safely converts Decimal to number and BigInt volume to number.
   * Evaluates stale/delayed data flag against STALE_DATA_THRESHOLD_MS.
   */
  public static formatSnapshotResponse(snapshot: any): StockSnapshotResponse {
    const dataTime = snapshot.dataTimestamp instanceof Date ? snapshot.dataTimestamp.getTime() : new Date(snapshot.dataTimestamp).getTime();
    const isStale = Date.now() - dataTime > config.marketData.staleThresholdMs;

    return {
      id: snapshot.id,
      stockId: snapshot.stockId,
      price: Number(snapshot.price),
      volume: Number(snapshot.volume),
      changePercent: snapshot.changePercent,
      dataTimestamp: snapshot.dataTimestamp instanceof Date ? snapshot.dataTimestamp.toISOString() : new Date(snapshot.dataTimestamp).toISOString(),
      recordedAt: snapshot.recordedAt instanceof Date ? snapshot.recordedAt.toISOString() : new Date(snapshot.recordedAt).toISOString(),
      isStale,
    };
  }

  /**
   * Formats a raw Prisma Stock record into `StockResponse`.
   */
  public static formatStockResponse(stock: any, latestSnapshot?: any): StockResponse {
    return {
      id: stock.id,
      symbol: stock.symbol,
      exchange: stock.exchange,
      name: stock.name,
      sector: stock.sector,
      isActive: stock.isActive,
      createdAt: stock.createdAt.toISOString(),
      updatedAt: stock.updatedAt.toISOString(),
      latestSnapshot: latestSnapshot ? this.formatSnapshotResponse(latestSnapshot) : null,
    };
  }

  /**
   * Searches and lists stock master catalog with pagination & filters. Cached for performance.
   */
  public static async listStocks(query: StockQueryDto): Promise<PaginatedStockResponse> {
    const queryHash = JSON.stringify(query);
    const cacheKey = CacheService.keys.stockCatalog(Buffer.from(queryHash).toString('base64'));

    const cached = await CacheService.get<PaginatedStockResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const { search, sector, exchange, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isActive: true,
      ...(exchange ? { exchange: exchange.toUpperCase() } : {}),
      ...(sector ? { sector: { contains: sector, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { symbol: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalItems, stocks] = await prisma.$transaction([
      prisma.stock.count({ where: whereClause }),
      prisma.stock.findMany({
        where: whereClause,
        orderBy: { symbol: 'asc' },
        skip,
        take: limit,
        include: {
          snapshots: {
            orderBy: { dataTimestamp: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    const result: PaginatedStockResponse = {
      items: stocks.map((s) => this.formatStockResponse(s, s.snapshots[0] || null)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };

    await CacheService.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Retrieves a single stock master record by ID with its latest price snapshot.
   */
  public static async getStockById(stockId: string): Promise<StockResponse> {
    const cacheKey = CacheService.keys.stockDetail(stockId);
    const cached = await CacheService.get<StockResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
      include: {
        snapshots: {
          orderBy: { dataTimestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    const result = this.formatStockResponse(stock, stock.snapshots?.[0] || null);
    await CacheService.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Retrieves a single stock master record by Symbol & Exchange.
   */
  public static async getStockBySymbol(
    symbol: string,
    exchange = 'NSE'
  ): Promise<StockResponse> {
    const stock = await prisma.stock.findUnique({
      where: {
        symbol_exchange: {
          symbol: symbol.toUpperCase().trim(),
          exchange: exchange.toUpperCase().trim(),
        },
      },
      include: {
        snapshots: {
          orderBy: { dataTimestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    return this.formatStockResponse(stock, stock.snapshots?.[0] || null);
  }

  /**
   * Retrieves historical price snapshots time-series for a stock.
   */
  public static async getSnapshotHistory(
    stockId: string,
    query: SnapshotQueryDto
  ): Promise<StockSnapshotResponse[]> {
    const limit = query.limit || 50;
    const order = query.order || 'desc';
    const cacheKey = `${CacheService.keys.stockHistory(stockId)}:${order}:${limit}`;

    const cached = await CacheService.get<StockSnapshotResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    const snapshots = await prisma.stockSnapshot.findMany({
      where: { stockId },
      orderBy: { dataTimestamp: order },
      take: limit,
    });

    const result = snapshots.map((s) => this.formatSnapshotResponse(s));
    await CacheService.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Manually ingests/records a new market price snapshot for a stock and invalidates caches.
   */
  public static async recordSnapshot(
    stockId: string,
    dto: RecordSnapshotDto
  ): Promise<StockSnapshotResponse> {
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    if (!stock.isActive) {
      throw new BadRequestError('Stock is inactive');
    }

    const dataTimestamp = dto.dataTimestamp ? new Date(dto.dataTimestamp) : new Date();

    const snapshot = await prisma.stockSnapshot.create({
      data: {
        stockId,
        price: dto.price,
        volume: BigInt(dto.volume),
        changePercent: dto.changePercent,
        dataTimestamp,
        recordedAt: new Date(),
      },
    });

    // Invalidate affected stock and delta caches
    await CacheService.del([CacheService.keys.stockDetail(stockId), CacheService.keys.stockHistory(stockId)]);
    await CacheService.delByPattern('stock:catalog:*');
    await CacheService.delByPattern('delta:*');

    return this.formatSnapshotResponse(snapshot);
  }

  /**
   * Triggers a batch refresh of live market data for all active stocks using the active provider.
   * Employs bounded retries with exponential backoff and resilient per-stock error isolation.
   */
  public static async refreshMarketData(): Promise<BatchRefreshResponse> {
    const activeStocks = await prisma.stock.findMany({
      where: { isActive: true },
      select: { id: true, symbol: true, exchange: true },
    });

    if (activeStocks.length === 0) {
      return {
        totalProcessed: 0,
        succeeded: 0,
        failed: 0,
        snapshots: [],
      };
    }

    // Bounded retries (max 3) with exponential backoff for provider quotes
    let quotes: MarketQuoteMetadata[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        quotes = await this.provider.fetchBatchQuotes(
          activeStocks.map((s) => ({ symbol: s.symbol, exchange: s.exchange }))
        );
        break;
      } catch (err) {
        logger.warn({ attempt: attempts, err }, 'Batch quote fetch failed, retrying with exponential backoff...');
        if (attempts >= maxAttempts) {
          logger.error('Max retry attempts reached for market quote fetch.');
          quotes = []; // Fall through with empty quotes to record per-stock partial failure
        } else {
          await new Promise((res) => setTimeout(res, 100 * Math.pow(2, attempts - 1)));
        }
      }
    }

    const quoteMap = new Map<string, MarketQuoteMetadata>();
    for (const q of quotes) {
      quoteMap.set(`${q.exchange}:${q.symbol}`, q);
    }

    let succeeded = 0;
    let failed = 0;
    const createdSnapshots: StockSnapshotResponse[] = [];

    // Resilient snapshot creation per stock (partial success support)
    for (const stock of activeStocks) {
      const quote = quoteMap.get(`${stock.exchange}:${stock.symbol}`);
      if (!quote) {
        failed++;
        continue;
      }

      try {
        const snapshot = await prisma.stockSnapshot.create({
          data: {
            stockId: stock.id,
            price: quote.price,
            volume: BigInt(quote.volume),
            changePercent: quote.changePercent,
            dataTimestamp: quote.dataTimestamp,
            recordedAt: new Date(),
          },
        });

        createdSnapshots.push(this.formatSnapshotResponse(snapshot));
        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    // Invalidate affected caches after batch refresh
    if (succeeded > 0) {
      await CacheService.delByPattern('stock:*');
      await CacheService.delByPattern('delta:*');
    }

    return {
      totalProcessed: activeStocks.length,
      succeeded,
      failed,
      snapshots: createdSnapshots,
    };
  }
}
