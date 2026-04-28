import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getRedisClient } from '../lib/cache';

const router = Router();

// Liveness: is the process running?
router.get('/health/live', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness: can the process handle requests?
router.get('/health/ready', async (req, res) => {
  const checks: Record<string, any> = {};

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = {
      status: 'error',
      message: (error as Error).message,
    };
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      checks.redis = { status: 'ok' };
    } else {
      checks.redis = {
        status: 'error',
        message: 'Cache client not initialized'
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'error',
      message: (error as Error).message,
    };
  }

  const allHealthy = Object.values(checks)
    .every(c => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
