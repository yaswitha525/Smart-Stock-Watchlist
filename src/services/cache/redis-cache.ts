import { Redis } from 'ioredis';
import { ICacheProvider, CacheStats } from './cache.interface.js';
import { logger } from '../../config/logger.js';

/**
 * Redis Cache Provider using ioredis.
 * Includes error handling and fallback logic if Redis becomes unreachable.
 */
export class RedisCacheProvider implements ICacheProvider {
  private client: Redis | null = null;
  private isConnected = false;
  private hits = 0;
  private misses = 0;

  constructor(redisUrl: string) {
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis cache connected successfully');
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        logger.warn({ err: err.message }, '⚠️ Redis connection error. Cache operations will fall back safely.');
      });
    } catch (error) {
      this.isConnected = false;
      logger.warn({ err: error }, '⚠️ Failed to initialize Redis client.');
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      this.misses++;
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) {
        this.misses++;
        return null;
      }
      this.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn({ err: error, key }, 'Redis GET error, falling back.');
      this.misses++;
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
    } catch (error) {
      logger.warn({ err: error, key }, 'Redis SET error, ignoring.');
    }
  }

  public async del(key: string | string[]): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.warn({ err: error }, 'Redis DEL error, ignoring.');
    }
  }

  public async delByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = this.client?.pipeline();
          keys.forEach((k) => pipeline?.del(k));
          pipeline?.exec();
        }
      });
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Redis SCAN/DEL error, ignoring.');
    }
  }

  public async flush(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.flushdb();
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      logger.warn({ err: error }, 'Redis FLUSH error, ignoring.');
    }
  }

  public async getStats(): Promise<CacheStats> {
    let keysCount = 0;
    if (this.client && this.isConnected) {
      try {
        keysCount = await this.client.dbsize();
      } catch (error) {
        keysCount = 0;
      }
    }

    return {
      provider: 'redis',
      hits: this.hits,
      misses: this.misses,
      keysCount,
      connected: this.isConnected,
    };
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (e) {
        // ignore
      }
      this.isConnected = false;
    }
  }
}
