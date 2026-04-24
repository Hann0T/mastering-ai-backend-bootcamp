import type { Request, Response, NextFunction } from 'express';
import { cacheRedis } from '../lib/cache';

export async function trackSuspiciousActivity(
  req: Request, _: Response, next: NextFunction
) {
  const userId = (req as any).user?.id;
  if (!userId) return next();

  // track unique documents accessed in last 5 minutes
  if(req.path.match(/\/documents\/[\w-]+$/)) {
    const key = `access-pattern:${userId}`;
    const docId: string = (req as any).params.id;

    if(docId) {
      await cacheRedis.sadd(key, docId);
      await cacheRedis.expire(key, 300); // 5 minute window

      const uniqueDocs = await cacheRedis.scard(key);
      if (uniqueDocs >= 50) {
        // TODO: send alert, email, something
        console.warn(
          `Suspicious user: ${userId} accessed ${uniqueDocs} unique documents in 5 minutes`
        );
      }
    }
  }

  next();
}
