import { eventBus } from '../lib/events';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

export const ADMIN_EVENTS = {
  ROLE_ASSIGNED: 'admin:role-assigned',
  ROLE_REVOKED: 'admin:role-revoked',
} as const;

eventBus.on(ADMIN_EVENTS.ROLE_ASSIGNED, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.assignedBy,
        action: 'role_assigned',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          targetUserId: data.targetUserId,
          roleName: data.roleName,
          assignedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error: any) {
    logger.error(`Failed to log role assignment`, {
      assignedBy: data.assignedBy,
      targetUserId: data.targetUserId,
      message: error.message
    });
  }
});

eventBus.on(ADMIN_EVENTS.ROLE_REVOKED, async (data) => {
  try {
    await prisma.usageLog.create({
      data: {
        userId: data.revokedBy,
        action: 'role_revoked',
        tokens: 0,
        costUsd: 0,
        metadata: JSON.stringify({
          targetUserId: data.targetUserId,
          roleName: data.roleName,
          assignedAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error: any) {
    logger.error(`Failed to log role revocation`, {
      revokedBy: data.revokedBy,
      targetUserId: data.targetUserId,
      message: error.message
    });
  }
});
