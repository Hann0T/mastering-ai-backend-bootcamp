import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';
import bycrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

const SALT = 12;

async function main() {
  console.log('Seeding database...');

  const adminHash = await bycrypt.hash('admin123', SALT);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@docuchat.dev' },
    update: {},
    create: {
      email: 'admin@docuchat.dev',
      passwordHash: adminHash,
      tier: 'enterprise',
      tokenLimit: 1000000,
    }
  });

  const userHash = await bycrypt.hash('user123', SALT);
  const user = await prisma.user.upsert({
    where: { email: 'test@docuchat.dev' },
    update: {},
    create: {
      email: 'test@docuchat.dev',
      passwordHash: userHash,
    }
  });

  await prisma.document.create({
    data: {
      userId: user.id,
      title: 'Getting started with DocuChat',
      filename: 'getting-started.txt',
      content: 'Welcome to DocuChat! This is a sample document.',
      status: 'ready',
      chunkCount: 1
    }
  });

  console.log(`Done | admin: ${admin.email} | user: ${user.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
