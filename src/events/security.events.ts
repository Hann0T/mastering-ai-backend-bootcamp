import { eventBus } from '../lib/events';
import { cacheRedis } from '../lib/cache';

export const SECURITY_EVENTS = {
  LOGIN_FAILED: 'auth:login-failed',
} as const;

eventBus.on(SECURITY_EVENTS.LOGIN_FAILED, async (data: any) => {
  try {
    const key = `login-failures-${data.deviceInfo}`;
    const failures = await cacheRedis.incr(key);

    // set expire on first failure
    if (failures === 1) {
      await cacheRedis.expire(key, 900); // 15 minutes
    }

    if (failures >= 5) {
      // TODO: block, limit even more, something
      console.warn(
        `Security: ${failures} failed logins from ${data.deviceInfo} for ${data.email}`
      );
    }
  } catch (error) {
    console.error('Failed to track login failure:', error);
  }
});
