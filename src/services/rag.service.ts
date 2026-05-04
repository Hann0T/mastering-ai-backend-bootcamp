import { RAG_SYSTEM_PROMPT } from '../config/prompts';
import { eventBus } from '../lib/events';
import { openaiBreaker } from '../lib/http/openai.breaker';
import { logger } from '../lib/logger';
import type { SearchResult } from './search.service';

interface Citation {
  index: number;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  score: number;
}

interface AssembledContext {
  chunks: SearchResult[];
  contextText: string;
  totalTokens: number;
  citations: Citation[];
}

interface RAGResponse {
  answer: string;
  citations: Citation[];
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd: number;
  model: string;
}

const CHAT_MODEL = 'gpt-4o';
const CONTEXT_TOKEN_BUDGET = 3500;

export async function generateRAGResponse(options: {
  question: string;
  context: AssembledContext;
  conversationHistory?: { role: string; content: string }[];
  userId: string;
  conversationId: string;
  correlationId: string;
}): Promise<RAGResponse> {
  const {
    question, context, conversationHistory = [],
    userId, conversationId, correlationId
  } = options;

  const messages: any[] = [
    { role: 'system', content: RAG_SYSTEM_PROMPT }
  ];

  // we could create a summary of the conversation history to save tokens
  // and preserve important context, but that adds complexity and latency
  // but for now we'll just include the most recent exchanges
  if (conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-10); // last 5 QA pairs
    messages.push(...recent);
  }

  if (context.chunks.length > 0) {
    messages.push({
      role: 'user',
      content: [
        'Here is the relevant information from my documents:',
        '',
        context.contextText,
        '',
        '----',
        '',
        `My question: ${question}`,
      ].join('\n'),
    });
  } else {
    messages.push({
      role: 'user',
      content: [
        'No relevant context was found in my documents for this question.',
        '',
        `My question: ${question}`,
      ].join('\n'),
    });
  }

  const startTime = Date.now();

  const response = await openaiBreaker.fire({
    model: CHAT_MODEL,
    messages,
    max_tokens: 1500,
    temperature: 0.1, // lower temperature for more factual responses
  });

  const result = response.data;
  const answer = result.choices[0].message.content;
  const usage = result.usage;

  const duration = Date.now() - startTime;

  // should centralize this logic with the rest of the OpenAI calls to avoid duplication
  const costUsd = (
    (usage.prompt_tokens / 1_000_000) * 2.50         // input
    + (usage.completion_tokens / 1_000_000) * 10.00  // output
  );

  logger.info('Generated RAG response', {
    userId,
    conversationId,
    correlationId,
    model: CHAT_MODEL,
    contextChunks: context.chunks.length,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    costUsd: costUsd.toFixed(6),
    durationMs: duration
  });

  eventBus.emit('ai:chat-completed', {
    userId,
    conversationId,
    correlationId,
    model: CHAT_MODEL,
    contextChunks: context.chunks.length,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    costUsd,
    duration
  });

  return {
    answer,
    citations: context.citations,
    tokensUsed: {
      prompt: usage.prompt_tokens,
      completion: usage.completion_tokens,
      total: usage.total_tokens
    },
    costUsd,
    model: CHAT_MODEL
  };
}

export function assembleContext(
  searchResults: SearchResult[]
): AssembledContext {
  const selected: SearchResult[] = [];
  let totalTokens = 0;

  // results are already sorted by relevance
  // so we just iterate and add until we hit the token budget
  for (const result of searchResults) {
    if (isRedundant(result, selected)) continue;

    if (totalTokens + result.tokenCount > CONTEXT_TOKEN_BUDGET) {
      break;
    }
    selected.push(result);
    totalTokens += result.tokenCount;
  }

  const citations: Citation[] = selected.map((chunk, idx) => ({
    index: idx + 1,
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    chunkIndex: chunk.chunkIndex,
    score: chunk.score
  }));

  const contextText = selected
    .map((chunk, idx) =>
      `[source ${idx + 1}: "${chunk.documentTitle}", section ${chunk.chunkIndex + 1}]\n${chunk.content}`
    )
    .join('\n\n----\n\n');

  return {
    chunks: selected,
    contextText,
    totalTokens,
    citations
  };
}

// If a chunk is adjacent to an already selected chunk from the same document, it's likely redundant
// This is a heuristic to avoid including multiple chunks that contain very similar information
// For example, if chunk 5 from document A is selected, then chunk 4 and chunk 6 from the same document are likely to have overlapping content
// This is not a perfect method, but it helps increase the diversity of the retrieved information within the token budget
function isRedundant(
  candidate: SearchResult,
  selected: SearchResult[]
): boolean {
  return selected.some(chunk =>
    chunk.documentId === candidate.documentId
    && Math.abs(chunk.chunkIndex - candidate.chunkIndex) <= 1
  );
}
