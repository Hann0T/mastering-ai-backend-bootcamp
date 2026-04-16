import { prisma } from '../lib/prisma';

export async function getUserPermissions(
  userId: string
): Promise<Set<string>> {
  // should be cached
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

  return permissions;
}
