import { eventBus } from '../lib/events';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth:user-registered',
  USER_LOGGED_IN: 'auth:user-logged-in',
  USER_LOGGED_OUT: 'auth:user-logged-out',
  TOKEN_REFRESHED: 'auth:token-refreshed',
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
  } catch (error: any) {
    logger.error(`Failed Handle ${AUTH_EVENTS.USER_REGISTERED} event`, {
      userId: user.id,
      message: error.message
    });
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
  } catch (error: any) {
    logger.error(`Failed to create the welcome conversation`, {
      userId: user.id,
      message: error.message
    });
  }
});

eventBus.on(AUTH_EVENTS.USER_REGISTERED, async (user: { email: string }) => {
  try {
    // Race: either the notification finishes in 3 seconds, or we give up
    // await Promise.race([
    //   notifySlack(`New signup: ${user.email}`),
    //   new Promise((_, reject) =>
    //     setTimeout(() => reject(new Error('Slack timeout')), 3000)
    //   ),
    // ]);
  } catch (error: any) {
    logger.error(`on ${AUTH_EVENTS.USER_REGISTERED} notification failed`, {
      userEmail: user.email,
      message: error.message
    });
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
  } catch (error: any) {
    logger.error(`Failed to handle ${AUTH_EVENTS.USER_LOGGED_IN} event`, {
      userId: data.userId,
      deviceInfo: data.deviceInfo,
      message: error.message
    });
  }
});
