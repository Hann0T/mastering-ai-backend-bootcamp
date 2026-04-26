export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
  getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  trackUniqueAccess(key: string, value: string, ttlSeconds: number): Promise<number>;
  incrementLoginFailures(key: string, ttlSeconds: number): Promise<number>;
}
