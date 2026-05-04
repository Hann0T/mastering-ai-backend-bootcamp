import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { generateEmbeddingWithCache } from "./embedding.service";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  chunkIndex: number;
  score: number; // cosine similarity score (0 to 1, higher is more similar)
  tokenCount: number;
}

export async function semanticSearch(options: {
  query: string;
  userId: string;
  documentId?: string; // optional filter to search within a specific document
  topK?: number;
  minScore?: number; // optional threshold to filter out low-similarity results
}, correlationId: string = ''): Promise<SearchResult[]> {
  const {
    query,
    userId,
    documentId,
    topK = 10,
    minScore = 0.3
  } = options;

  const startTime = Date.now();

  const queryEmbedding = await generateEmbeddingWithCache(query);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      c.id AS "chunkId",
      c."documentId",
      d.title AS "documentTitle",
      c.content,
      c.index AS "chunkIndex",
      c."tokenCount",
      (1 - (c.embedding <=> ${vectorStr}::vector)) AS score
    FROM "Chunk" c
    JOIN "Document" d ON c."documentId" = d.id
    WHERE d."userId" = ${userId}
      AND d."deletedAt" IS NULL
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
      ${documentId
        ? prisma.$queryRaw`AND d.id = ${documentId}`
        : prisma.$queryRaw``
      }
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;

  const filtered = results.filter(r => r.score >= minScore);

  const duration = Date.now() - startTime;

  logger.info('Semantic search completed', {
    query: query.substring(0, 50), // log first 50 chars of query for traceability
    totalResults: results.length,
    filteredResults: filtered.length,
    topScore: results[0]?.score?.toFixed(4),
    durationMs: duration,
    correlationId
  });

  return filtered;
}
