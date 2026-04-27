import { eventBus } from '../lib/events';
import { cache } from '../lib/cache';
import { logger } from '../lib/logger';

export const SECURITY_EVENTS = {
  LOGIN_FAILED: 'auth:login-failed',
} as const;

eventBus.on(SECURITY_EVENTS.LOGIN_FAILED, async (data: any) => {
  try {
    const key = `login-failures-${data.deviceInfo}`;
    const failures = await cache.incrementLoginFailures(key, 900); // 15 minutes

    if (failures >= 5) {
      // TODO: block, limit even more, something
      logger.warn('Too many failed tries', {
        failures,
        deviceInfo: data.deviceInfo,
        email: data.email
      });
    }
  } catch (error) {
    logger.error('Failed to trakc login failure', {
      deviceInfo: data.deviceInfo,
      message: (error as any)?.message
    });
  }
});
