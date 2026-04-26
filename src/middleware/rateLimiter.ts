import rateLimit, {ipKeyGenerator} from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../lib/cache';
import type { Request } from 'express';

function createLimiter(options: {
  windowMs: number,
  max: number | ((req: Request) => number),
  message: string,
  keyGenerator?: (req: Request) => string
}) {
  const config = {
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: options.message
      }
    },
    keyGenerator: options.keyGenerator
      || ((req: Request) => (req as any).user?.id || `ip:${ipKeyGenerator(req.ip!)}` || 'anonymous')
  };
  let store = {}
  const redisClient = getRedisClient();
  if (redisClient) {
    store = {
      store: new RedisStore({
        sendCommand: (...args: string[]) => (redisClient as any)?.call(...args),
      }),
    }
  } else {
    console.log('Runnig on test env');
  }

  return rateLimit({
    ...config, ...store
  });
}

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many request. Please try again later.',
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip!)}` || 'anonymous'
});

// General API: tier based
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const tier = (req as any).user?.tier || 'free';
    const limits: Record<string, number> = {
      free: 100,
      pro: 500,
      enterprise: 2000,
    };

    return limits[tier] || 100;
  },
  message: 'Too many request. Please slow down.',
});

export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    const tier = (req as any).user?.tier || 'free';
    const limits: Record<string, number> = {
      free: 5,
      pro: 50,
      enterprise: 500,
    };

    return limits[tier] || 5;
  },
  message: 'Upload limit reached. Please try again later.',
});

export const chatLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => {
    const tier = (req as any).user?.tier || 'free';
    const limits: Record<string, number> = {
      free: 10,
      pro: 30,
      enterprise: 100,
    };

    return limits[tier] || 10;
  },
  message: 'Too many queries. Please slow down.',
});
