import type { Cache } from './cache.interface';

type Entry = {
  value: any;
};

export class Memory implements Cache {
  private store = new Map<string, Entry>();          // key-value cache
  private sets = new Map<string, Set<string>>();     // for unique tracking
  private counters = new Map<string, number>();      // for increments
  private expirations = new Map<string, number>();   // shared TTLs

  private isExpired(key: string): boolean {
    const exp = this.expirations.get(key);
    if (!exp) return false;

    if (Date.now() > exp) {
      this.store.delete(key);
      this.sets.delete(key);
      this.counters.delete(key);
      this.expirations.delete(key);
      return true;
    }

    return false;
  }

  async incrementLoginFailures(key: string, ttlSeconds: number): Promise<number> {
    this.isExpired(key);

    const current = this.counters.get(key) ?? 0;
    const next = current + 1;

    this.counters.set(key, next);

    // only set TTL on first increment (matches Redis behavior)
    if (next === 1) {
      this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    }

    return next;
  }

  async trackUniqueAccess(
    key: string,
    value: string,
    ttlSeconds: number
  ): Promise<number> {
    this.isExpired(key);

    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }

    this.sets.get(key)!.add(value);

    // refresh TTL on every access (matches Redis behavior)
    this.expirations.set(key, Date.now() + ttlSeconds * 1000);

    return this.sets.get(key)!.size;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isExpired(key)) {
      return null;
    }

    const entry = this.store.get(key);
    if (!entry) return null;

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value });

    if (ttlSeconds) {
      this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.expirations.delete(key);
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const existing = await this.get<T>(key);

    if (existing !== null) {
      return existing;
    }

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);

    return value;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.sets.delete(key);
    this.counters.delete(key);
    this.expirations.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') +
      '$'
    );

    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.del(key);
      }
    }

    // also check keys that might only exist in sets/counters
    for (const key of Array.from(this.sets.keys())) {
      if (regex.test(key)) {
        this.del(key);
      }
    }

    for (const key of Array.from(this.counters.keys())) {
      if (regex.test(key)) {
        this.del(key);
      }
    }
  }
}
