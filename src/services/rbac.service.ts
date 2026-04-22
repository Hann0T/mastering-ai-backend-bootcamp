import { CACHE_TTL, cacheGetOrSet } from '../lib/cache';
import { prisma } from '../lib/prisma';

export async function getUserPermissions(
  userId: string
): Promise<Set<string>> {
  const permissions: any = await cacheGetOrSet(
    `permissions:${userId}`,
    CACHE_TTL.PERMISSIONS,
    async () => {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      const permissions = new Set<string>();
      userRoles.forEach(userRole => userRole.role.permissions.forEach(rolePermission => {
        permissions.add(rolePermission.permission.name);
      }));
      return [...permissions]; // array for serialization, there should be a better way than this
    }
  );

  return new Set(permissions);
}
