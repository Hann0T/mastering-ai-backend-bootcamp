import { cache, CACHE_TTL } from "../lib/cache";
import { openaiBreaker } from "../lib/http/openai.breaker";
import { logger } from "../lib/logger";
import { embeddingCacheHitRate } from "../lib/metrics";
import { prisma } from "../lib/prisma";
import crypto from 'crypto';

// TODO: track the usage, tokens used, etc

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function generateEmbeddingWithCache(
  text: string
): Promise<number[]> {
  const hash = contentHash(text);
  const cacheKey = `embedding:${hash}`;

  const cached = await cache.get<number[]>(cacheKey);
  if (cached) {
    logger.debug('Embedding retrieved from cache', {
      model: EMBEDDING_MODEL,
      inputLength: text.length,
      dimensions: cached.length,
    });

    embeddingCacheHitRate.inc();

    return cached;
  }

  const embedding = await generateEmbedding(text);

  // TODO: log usage?

  await cache.set(cacheKey, embedding, CACHE_TTL.EMBEDDING);

  logger.debug('Embedding stored in cache', {
    model: EMBEDDING_MODEL,
    hash: hash.substring(0, 8), // log first 8 chars of hash for traceability
  });

  return embedding;
}

export async function generateEmbeddingsBatchWithCache(
  texts: string[]
): Promise<number[][]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const unCached: { index: number, text: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue; // skip empty strings
    const hash = contentHash(text);
    const cached = await cache.get<number[]>(`embedding:${hash}`);

    if (cached) {
      results[i] = cached;

      logger.debug('Embedding retrieved from cache', {
        model: EMBEDDING_MODEL,
        hash: hash.substring(0, 8), // log first 8 chars of hash for traceability
      });

      embeddingCacheHitRate.inc();
    } else {
      unCached.push({ index: i, text });
    }
  }

  logger.info('Batch embedding cache check completed', {
    total: texts.length,
    cacheHits: texts.length - unCached.length,
    cacheMisses: unCached.length,
  });

  if (unCached.length > 0) {
    const newEmbeddings = await generateEmbeddings(unCached.map(u => u.text));

    for (let i = 0; i < unCached.length; i++) {
      const chunk = unCached[i];
      if(!chunk) continue;

      const newChunkEmbedding = newEmbeddings[i];
      if(!newChunkEmbedding) continue;

      const hash = contentHash(chunk.text);
      await cache.set(`embedding:${hash}`, newChunkEmbedding, CACHE_TTL.EMBEDDING);

      results[chunk.index] = newChunkEmbedding;
    }
  }

  return results as number[][];
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const startTime = Date.now();

  const response = await openaiBreaker.fire('/embeddings', {
    input: text,
    model: EMBEDDING_MODEL,
  });

  const embedding = response.data.data?.[0]?.embedding;

  const duration = Date.now() - startTime;

  logger.info('Embedding generated', {
    model: EMBEDDING_MODEL,
    inputLength: text.length,
    dimensions: embedding?.length,
    durationMs: duration,
    tokensUsed: response.data.usage?.total_tokens,
  });

  return embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const startTime = Date.now();
  const BATCH_SIZE = 100; // OpenAI allows up to 2048, but we use smaller for better latency and error handling
  const embeddings: number[][] = [];
  let usageTokens = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openaiBreaker.fire('/embeddings', {
      input: batch,
      model: EMBEDDING_MODEL,
    });

    // order is not guaranteed in batch response
    // so we sort by index to ensure correct order
    const sorted = response.data.data?.sort(
      (a: any, b: any) => a.index - b.index
    );

    for (const item of sorted) {
      embeddings.push(item.embedding);
    }

    logger.info('Embedding batch processed', {
      model: EMBEDDING_MODEL,
      batchIndex: Math.floor(i / BATCH_SIZE),
      inputPreview: batch[0]?.slice(0, 50), // log first 50 chars in batch for traceability
      batchSize: batch.length,
      totalTexts: texts.length,
      tokensUsed: response.data.usage?.total_tokens,
    });

    usageTokens += response.data.usage?.total_tokens || 0;
  }

  const duration = Date.now() - startTime;

  logger.info('Embeddings generated', {
    model: EMBEDDING_MODEL,
    inputCount: texts.length,
    dimensions: embeddings?.[0]?.length,
    durationMs: duration,
    tokensUsed: usageTokens,
  });

  return embeddings;
}

export async function storeEmbeddingInChunk(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`; // Store as string for now

  await prisma.$executeRaw`
    UPDATE "Chunk"
    SET embedding = ${vectorStr}::vector
    WHERE id = ${chunkId}
  `;
}

export async function storeEmbeddingsInChunks(
  chunk: { id: string, embedding: number[] }[]
): Promise<void> {
  await prisma.$transaction(async () => {
    chunk.map(({ id, embedding }) => {
      const vectorStr = `[${embedding.join(',')}]`; // Store as string for now

      prisma.$executeRaw`
        UPDATE "Chunk"
        SET embedding = ${vectorStr}::vector
        WHERE id = ${id}
      `;
    });
  });
}
