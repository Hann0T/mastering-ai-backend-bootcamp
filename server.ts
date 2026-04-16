import 'dotenv/config';
import './src/events/auth.events';
import './src/events/admin.events';

import app from './app';
import { prisma } from './src/lib/prisma';

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
