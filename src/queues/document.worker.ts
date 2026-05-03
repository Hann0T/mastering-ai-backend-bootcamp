import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { prisma } from '../lib/prisma';
import { eventBus } from '../lib/events';
import { chunkDocument } from '../lib/chunker';
import { deadLetterQueue } from './dead-letter.queue';
import { logger } from '../lib/logger';
import { detectDocumentType, extractTextFromDocument } from '../lib/documentExtractors';
import { generateEmbeddingsBatchWithCache, storeEmbeddingsInChunks } from '../services/embedding.service';
import { chunksPerDocument, ingestionDuration } from '../lib/metrics';

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, userId, correlationId } = job.data;
    const startTime = Date.now();

    logger.info('Processing document', {
      documentId,
      userId,
      attempts: job.attemptsMade + 1,
      correlationId,
    });

    try {
      // Get document
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

      await job.updateProgress(5);

      // 1. Extract text
      const format = detectDocumentType(doc.filename);
      const { text, pageCount } = await extractTextFromDocument(doc.content, format);
      await job.updateProgress(15);

      logger.info('Text extracted', {
        documentId, userId, correlationId, format,
        textLength: text.length, pageCount
      });

      // 2. Chunk document
      const chunks = chunkDocument(doc.content, {
        maxTokens: 500,
        overlapTokens: 50,
        minChunkTokens: 50
      });
      await job.updateProgress(30);

      logger.info('Document chunked', {
        documentId, userId, correlationId,
        chunkCount: chunks.length,
        avgTokens: Math.round(
          chunks.reduce((sum, c) => sum + c.tokenEstimate, 0) / chunks.length
        )
      });

      // 3. Store chunks in DB
      await prisma.$transaction(async (tx) => {
        // in case of retry, idempotency is important
        await tx.chunk.deleteMany({ where: { documentId } });
        await tx.chunk.createMany({
          data: chunks.map((chunk) => ({
            documentId,
            index: chunk.index,
            content: chunk.text,
            tokenCount: chunk.tokenEstimate,
          }))
        });
      });
      await job.updateProgress(50);

      // 4. Generate embeddings
      const chunkTexts = chunks.map(c => c.text);
      const embdeddings = await generateEmbeddingsBatchWithCache(chunkTexts);
      await job.updateProgress(85);

      // 5. Store embeddings in DB
      const storedChunks = await prisma.chunk.findMany({
        where: { documentId },
        orderBy: { index: 'asc' },
        select: { id: true }
      });

      await storeEmbeddingsInChunks(
        storedChunks.map((chunk, i) => ({
          id: chunk.id,
          embedding: embdeddings[i] || [],
        }))
      );
      await job.updateProgress(95);

      // 6. Mark document as ready
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready', chunkCount: chunks.length }
      });
      await job.updateProgress(100);

      const duration = Date.now() - startTime;

      eventBus.emit('doc:processed', {
        documentId,
        userId,
        correlationId,
        chunkCount: chunks.length,
        durationMs: duration,
        format, pageCount
      });

      logger.info('Document processing complete', {
        documentId, userId, correlationId,
        chunkCount: chunks.length, durationMs: duration
      });

      // Update Prometheus metrics
      ingestionDuration.observe({ format }, duration / 1000); // Convert ms to seconds for Prometheus
      chunksPerDocument.observe(chunks.length);

      return { success: true, chunks: chunks.length, durationMs: duration };
    } catch (error) {
      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'failed', error: (error as Error).message }
        });
      }

      logger.info('Document processing failed', {
        documentId, userId, correlationId,
        error: (error as Error).message,
        attempt: job.attemptsMade + 1,
      });

      throw error; // for BullMQ retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 3
  }
);

worker.on('completed', (job) => {
  logger.info('Processing document completed', {
    jobId: job.id,
    chunks: job.returnvalue?.chunks,
    correlationId: job.data?.correlationId,
  });
});

worker.on('failed', async (job, error) => {
  if (!job) {
    return;
  }

  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    logger.error('Processing document failed, moving to DLQ', {
      jobId: job.id,
      correlationId: job.data?.correlationId,
    });

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
  logger.error('Processing document failed, worker error', {
    error
  });
});

export { worker };
