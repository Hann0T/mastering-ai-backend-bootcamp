import { eventBus } from '../lib/events';
import { prisma } from '../lib/prisma';

export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth:user-registered',
  USER_LOGGED_IN: 'auth:user-logged-in',
  USER_LOGGED_OUT: 'auth:user-logged-out',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  LOGIN_FAILED: 'auth:login-failed',
} as const;

eventBus.on(AUTH_EVENTS.USER_REGISTERED, async (user: any) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: user.id,
        action: 'signup',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          email: user.email,
          tier: user.tier,
          registeredAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('Error handling USER_REGISTERED event:', error);
  }
});

eventBus.on(AUTH_EVENTS.USER_REGISTERED, async (user: any) => {
  try {
    await prisma.conversation.create({
      data: {
        userId: user.id,
        title: 'Welcome to DocuChat!',
      },
    });
  } catch (error) {
    console.error('Failed to create the welcome conversation:', error);
  }
});

eventBus.on(AUTH_EVENTS.USER_LOGGED_IN, async (data: any) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.userId,
        action: 'login',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          deviceInfo: data.deviceInfo || 'unknown',
          loginAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('Error handling USER_LOGGED_IN event:', error);
  }
});

eventBus.on(AUTH_EVENTS.LOGIN_FAILED, async (data: any) => {
  try {
    console.warn(
      `Failed login attempt for ${data.email} from ${data.deviceInfo}, reason: ${data.reason}`
    );
  } catch (error) {
    console.error('Failed to create the welcome conversation:', error);
  }
});
