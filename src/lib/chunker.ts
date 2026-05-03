interface ChunkerOptions {
  maxTokens?: number;
  overlapTokens?: number;
  minChunkTokens?: number;
}

interface Chunk {
  text: string;
  index: number;
  tokenEstimate: number;
  metadata: {
    startChar: number;
    endChar: number;
  }
}

const SEPARATORS = [
  '\n\n', // paragraphs
  '\n',   // lines
  '. ',   // sentences
  '? ',   // questions
  '! ',   //exclamations
  ' ',    // words (last resort)
];

export function chunkDocument(
  text: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const {
    maxTokens = 500,
    overlapTokens = 50,
    minChunkTokens = 50
  } = options;

  const rawChunks: Chunk[] = recursiveSplit(text, SEPARATORS, maxTokens);
  const withOverlap: Chunk[] = addOverlap(rawChunks, overlapTokens);

  return withOverlap
    .filter(chunk => estimateTokens(chunk.text) >= minChunkTokens)
    .map((chunk, index) => ({
      ...chunk,
      index,
      tokenEstimate: estimateTokens(chunk.text)
    }));
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // Rough estimate: 1 token ~ 4 characters
}

function recursiveSplit(
  text: string,
  separators: string[],
  maxTokens: number
): Chunk[] {
  if (estimateTokens(text) <= maxTokens) { // shouldn't be minTokens?
    return [{
      text,
      index: 0,
      tokenEstimate: estimateTokens(text),
      metadata: {
        startChar: 0,
        endChar: text.length
      }
    }];
  }

  for (const sep of separators) {
    const parts = text.split(sep).filter(part => part.trim().length > 0);
    if (parts.length <= 1) continue; // No effective split, try next separator

    // the idea with this is to not have too many small chunks
    const chunks: { text: string, startChar: number }[] = [];
    let current = '';
    let charOffset = 0;
    let chunkStart = 0;

    // this code is very confusing
    // I think it would be easier to use the next part instead of the last part to determine if we need to split, but I need to test it
    // the first iteration will always add an empty chunk
    for (const part of parts) {
      const combined = current ? `${current}${sep}${part}` : part;
      if (estimateTokens(combined) > maxTokens) {
        chunks.push({ text: current.trim(), startChar: chunkStart });
        current = part;
        chunkStart = charOffset;
      } else {
        if (!current) chunkStart = charOffset; // Mark the start of the chunk

        current = combined;
      }

      charOffset += part.length + sep.length;
    }

    // this will add the last chunk
    // if we were to use the next part instead of the last part, we wouldn't need this
    if (current.trim()) {
      chunks.push({ text: current.trim(), startChar: chunkStart });
    }

    return chunks.flatMap((chunk) => {
      if (estimateTokens(chunk.text) > maxTokens) {
        // we can try to find the next separator to split on
        const remaining = separators.slice(separators.indexOf(sep) + 1);
        // if there are more separators to try, we can recursively split the chunk
        if (remaining.length > 0) {
          return recursiveSplit(chunk.text, remaining, maxTokens);
        }
      }

      return [chunk]; // because we are using flatMap, we can return an array here and it will be flattened in the final result
    });
  }

  // If no separator worked, return the text as a single chunk (even if it exceeds maxTokens)
  // or maybe we can split it into smaller pieces based on the maxTokens limit?
  return [{
    text,
    index: 0,
    tokenEstimate: estimateTokens(text),
    metadata: { startChar: 0, endChar: text.length }
  }];
}

function addOverlap(
  chunks: Chunk[],
  overlapTokens: number
): Chunk[] {
  if (overlapTokens <= 0 || chunks.length <= 1) return chunks;

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk; // No overlap for the first chunk

    const prevChunk = chunks[index - 1];
    if (!prevChunk) return chunk; // Guard against empty previous chunk
    const overlapText = getLastNTokens(prevChunk.text, overlapTokens);

    return {
      ...chunk,
      text: `${overlapText}\n${chunk.text}`,
      metadata: {
        ...chunk.metadata,
        startChar: chunk.metadata.startChar, // where is startChar going to be used?
        // startChar: chunk.metadata.startChar - overlapText.length,
      }
    };
  });
}

function getLastNTokens(text: string, n: number): string {
  const words = text.split(/\s+/);
  const wordsNeeded = Math.ceil(n / 1.3); // Adjust for token estimation
  return words.slice(-wordsNeeded).join(' ');
}
