import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { prisma } from '../lib/prisma';
import { eventBus } from '../lib/events';
import { splitIntoChunks } from '../lib/chunker';
import { deadLetterQueue } from './dead-letter.queue';

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, userId } = job.data;
    console.log(`Processing document: ${documentId} (attempt ${job.attemptsMade + 1})`);

    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });
    if (!doc) { throw new Error("Document not found") }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'processing'
      }
    });

    try {
      await job.updateProgress(10);

      const chunks = splitIntoChunks(doc.content, 500);
      await job.updateProgress(40);

      await prisma.$transaction(async (tx) => {
        // in case of retry
        await tx.chunk.deleteMany({ where: { documentId } });

        await tx.chunk.createMany({
          data: chunks.map((text, index) => ({
            documentId,
            index,
            content: text,
            // tokenCount: estimateTokens(text)
            tokenCount: 0,
          }))
        });

        await tx.document.update({
          where: { id: documentId },
          data: { status: 'ready', chunkCount: chunks.length }
        });

        await job.updateProgress(100);

        eventBus.emit('doc:processed', {
          documentId,
          userId,
          chunkCount: chunks.length,
        });

        return { success: true, chunks: chunks.length };
      });
    } catch (error) {
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'failed', error: (error as Error).message }
        });
      }

      throw error; // for BullMQ retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 3
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed: ${job.returnvalue?.chunks} chunks`);
});

worker.on('failed', async (job, error) => {
  if(!job) {
    console.log(`Why I'm getting empty jobs?`);
    return;
  }

  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    console.error(`Job ${job.id} permanently failed. Moving to DLQ.`);

    await deadLetterQueue.add('failed-document', {
      originalJobId: job.id,
      originalQueue: 'document-processing',
      data: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    });
  }
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

export { worker };
