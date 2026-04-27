import { eventBus } from '../lib/events';
import { cache } from '../lib/cache';
import { logger } from '../lib/logger';

export const CACHE_EVENTS = {
  ROLE_ASSIGNED: 'admin:role-assigned',
  ROLE_REVOKED: 'admin:role-revoked',
  DOC_DELETED: 'doc:deleted'
} as const;

eventBus.on(CACHE_EVENTS.ROLE_ASSIGNED, async (data) => {
  try {
    await cache.del(`permissions:${data.targetUserId}`);
    logger.info('Permission assigned', {
      userId: data.targetUserId,
      assignedBy: data.assignedBy,
      role: data.roleName
    });
  } catch (error) {
    console.error('Failed to bust permissions cache:', error);
  }
});

eventBus.on(CACHE_EVENTS.ROLE_REVOKED, async (data) => {
  try {
    await cache.del(`permissions:${data.targetUserId}`);
  } catch (error) {
    console.error('Failed to bust permissions cache:', error);
  }
});

// When a document is updated or deleted, bust its cache
eventBus.on(CACHE_EVENTS.DOC_DELETED, async (data) => {
  try {
    await cache.del(`doc:${data.documentId}`);
  } catch (error) {
    console.error('Failed to bust document cache:', error);
  }
});
