import { Worker } from 'bullmq';
import { redisConnection } from './connection';
import { openaiBreaker } from '../lib/http/openai.breaker';

const worker = new Worker(
  'embedding-generation',
  async (job) => {
    return openaiBreaker.fire('/embeddings', {
      input: job.data.text,
      model: 'text-embedding-3-small',
    });
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 100,       // max 100 jobs
      duration: 60000 // per 60s
    }
  }
);

export { worker };
