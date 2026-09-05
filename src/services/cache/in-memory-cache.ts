import { ICacheProvider, CacheStats } from './cache.interface.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // null means no expiration
}

/**
 * In-Memory Cache Provider with TTL eviction and pattern invalidation.
 * Used for local development and offline Vitest integration test execution.
 */
export class InMemoryCacheProvider implements ICacheProvider {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  public async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      this.cache.delete(k);
    }
  }

  public async delByPattern(pattern: string): Promise<void> {
    // Convert wildcard pattern like "delta:watchlist:123:*" to regex
    const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexPattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  public async flush(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public async getStats(): Promise<CacheStats> {
    // Purge expired entries when stats are requested
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    return {
      provider: 'in-memory',
      hits: this.hits,
      misses: this.misses,
      keysCount: this.cache.size,
      connected: true,
    };
  }
}
