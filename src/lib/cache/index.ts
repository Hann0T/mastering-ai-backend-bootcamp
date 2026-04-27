import crypto from 'crypto';
import type { Cache } from './cache.interface';
import { Memory } from './memory.cache';
import { Redis } from './redis.cache';

const isTest = process.env.NODE_ENV === 'test';

const port = process.env.REDIS_PORT || '6379';
const host = process.env.REDIS_HOST || 'localhost';

export const CACHE_TTL = {
  PERMISSIONS: 300,       // 5 minutes
  DOCUMENT: 600,          // 10 minutes
  CONVERSATION_LIST: 120, // 2 minutes
  EMBEDDING: 604800,      // 7 days
  RAG_RESULT: 3600,       // 1 hour
} as const;

if(isTest) {
  console.log('cache running on tests, using in memory implementation.')
}

export const cache: Cache = isTest
  ? new Memory()
  : new Redis(host, port, 'docuchat:');

export function hashKey(...parts: string[]): string {
  const data = parts.join(':');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function getRedisClient() {
  if (cache instanceof Redis) {
    return cache.store;
  }

  return null;
}
