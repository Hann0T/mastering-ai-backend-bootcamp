import IORedis from 'ioredis';

const port = process.env.REDIS_PORT || '6379';
const host = process.env.REDIS_HOST || 'localhost';

export const redisConnection = new IORedis(
  parseInt(port),
  host,
  {
    maxRetriesPerRequest: null // required by BullMQ
  }
);
