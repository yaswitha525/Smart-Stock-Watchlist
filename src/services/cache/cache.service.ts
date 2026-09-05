import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { ICacheProvider, CacheStats } from './cache.interface.js';
import { InMemoryCacheProvider } from './in-memory-cache.js';
import { RedisCacheProvider } from './redis-cache.js';

/**
 * Cache Singleton Service managing provider selection, fallbacks, and keyspaces.
 */
export class CacheService {
  private static instance: ICacheProvider | null = null;
  private static fallbackInstance: InMemoryCacheProvider = new InMemoryCacheProvider();

  public static getProvider(): ICacheProvider {
    if (!this.instance) {
      if (config.redis.isConfigured && config.redis.url) {
        logger.info('Initializing Redis cache provider...');
        this.instance = new RedisCacheProvider(config.redis.url);
      } else {
        logger.info('Using InMemory cache provider (Redis URL not set).');
        this.instance = this.fallbackInstance;
      }
    }
    return this.instance;
  }

  /**
   * For testing or forced provider switching.
   */
  public static setProvider(provider: ICacheProvider | null): void {
    this.instance = provider;
  }

  public static async get<T>(key: string): Promise<T | null> {
    try {
      return await this.getProvider().get<T>(key);
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache GET failed, falling back to null');
      return null;
    }
  }

  public static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ?? config.cache.defaultTtlSeconds;
      await this.getProvider().set<T>(key, value, ttl);
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache SET failed, continuing without cache');
    }
  }

  public static async del(key: string | string[]): Promise<void> {
    try {
      await this.getProvider().del(key);
    } catch (error) {
      logger.warn({ err: error }, 'Cache DEL failed');
    }
  }

  public static async delByPattern(pattern: string): Promise<void> {
    try {
      await this.getProvider().delByPattern(pattern);
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Cache delByPattern failed');
    }
  }

  public static async flush(): Promise<void> {
    try {
      await this.getProvider().flush();
    } catch (error) {
      logger.warn({ err: error }, 'Cache FLUSH failed');
    }
  }

  public static async getStats(): Promise<CacheStats> {
    try {
      return await this.getProvider().getStats();
    } catch (error) {
      return {
        provider: 'in-memory',
        hits: 0,
        misses: 0,
        keysCount: 0,
        connected: false,
      };
    }
  }

  // Key generator helper utilities
  public static keys = {
    stockCatalog: (queryHash: string) => `stock:catalog:${queryHash}`,
    stockDetail: (stockId: string) => `stock:detail:${stockId}`,
    stockHistory: (stockId: string) => `stock:history:${stockId}`,
    stockDelta: (stockId: string, refTime: string) => `delta:stock:${stockId}:${refTime}`,
    watchlistDelta: (watchlistId: string, userId: string) => `delta:watchlist:${watchlistId}:${userId}`,
    watchlistDeltaPattern: (watchlistId: string) => `delta:watchlist:${watchlistId}:*`,
  };
}
