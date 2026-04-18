import { prisma } from '../../src/lib/prisma';

export async function resetDatabase() {
  // Delete in order that respects foreign key constraints
  await prisma.usageLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(overrides = {}) {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('TestPassword1!', 4); // Low rounds for speed
  return prisma.user.create({
    data: {
      email: 'test@docuchat.dev',
      passwordHash: hash,
      ...overrides,
    },
  });
}

export async function assingRoles(userId: string, ...roles: string[]) {
  for (const roleName of roles) {
    const role = await prisma.role.findFirst({
      where: { name: roleName }
    });
    if (!role) throw new Error('Role not found');

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: {
        userId,
        roleId: role.id,
        assignedBy: userId,
      },
    });
  }
}
