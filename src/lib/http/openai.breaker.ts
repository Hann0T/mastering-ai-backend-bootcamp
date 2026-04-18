import CircuitBreaker from 'opossum';
import { openaiClient } from './openai.client';
import { withRetry } from './retry';

async function callOpenAI(path: string, body: any) {
  return withRetry(() => openaiClient.post(path, body));
}

export const openaiBreaker = new CircuitBreaker(callOpenAI, {
  timeout: 35000,               // Slightly longer than the client timeout
  errorThresholdPercentage: 50, // Open if 50% of recent requests fail
  resetTimeout: 30000,          // try again after 30s
  rollingCountTimeout: 6000,    // Track failures over a 60s window
  rollingCountBuckets: 10
});

// Fallback when breaker is open
openaiBreaker.fallback(() => {
  throw new Error('OpenAi is temporarily unavailable. Please try again shortly.');
})

// Visibility into state changes
openaiBreaker.on('open', () =>
  console.warn('⚠️  OpenAI circuit breaker OPENED — requests will fail fast'));
openaiBreaker.on('halfOpen', () =>
  console.warn('⚠️  OpenAI circuit breaker HALF-OPEN — testing recovery'));
openaiBreaker.on('close', () =>
  console.log('✅ OpenAI circuit breaker CLOSED — normal operation'));
