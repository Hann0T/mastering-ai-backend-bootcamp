import IORedis from 'ioredis';
import type { Cache } from './cache.interface';

export class Redis implements Cache {
  public store: IORedis;

  constructor(host: string, port: string, namespace: string = 'docuchat:') {
    this.store = new IORedis(
      parseInt(port),
      host,
      {
        keyPrefix: namespace
      }
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.store.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    // 1. Try cache
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // 2. Try to acquire lock
    const lockKey = `lock:${key}`;
    const acquired = await this.store.set(
      lockKey, '1', 'EX', 5, 'NX'  // Expires in 5s, only if not exists
    );

    if (acquired) {
      // We got the lock. Fetch and cache.
      try {
        const value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
      } finally {
        await this.store.del(lockKey);
      }
    }

    // 3. Someone else has the lock. Wait briefly, then try cache again.
    await new Promise(resolve => setTimeout(resolve, 100));
    const retried = await this.get<T>(key);
    if (retried !== null) return retried;

    // 4. Lock holder failed or cache still empty. Just fetch directly.
    return fetchFn();
  }

  async del(key: string): Promise<void> {
    await this.store.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Use SCAN, never KEYS (KEYS blocks Redis on large datasets)
    const stream = this.store.scanStream({ match: pattern, count: 100 });
    const pipeline = this.store.pipeline();

    for await (const keys of stream) {
      for (const key of keys) {
        pipeline.del(key);
      }
    }

    await pipeline.exec();
  }

  async incrementLoginFailures(key: string, ttlSeconds: number): Promise<number> {
    const failures = await this.store.incr(key);

    // set expire on first failure
    if (failures === 1) {
      await this.store.expire(key, ttlSeconds); // 15 minutes
    }

    return failures;
  }

  async trackUniqueAccess(key: string, value: string, ttlSeconds: number): Promise<number> {
    await this.store.sadd(key, value);
    await this.store.expire(key, ttlSeconds);

    return await this.store.scard(key);
  }
}
