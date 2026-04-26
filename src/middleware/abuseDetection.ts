import type { Request, Response, NextFunction } from 'express';
import { cache } from '../lib/cache';

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
      const uniqueDocs = await cache.trackUniqueAccess(key, docId, 300); // 5 minute window
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
