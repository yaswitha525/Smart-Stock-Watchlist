export interface CacheStats {
  provider: 'redis' | 'in-memory';
  hits: number;
  misses: number;
  keysCount: number;
  connected: boolean;
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
  flush(): Promise<void>;
  getStats(): Promise<CacheStats>;
}
