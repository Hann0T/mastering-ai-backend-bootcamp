-- Create HNSW index for cosine similarity on Chunk embeddings
CREATE INDEX "Chunk_embedding_cosine_idx" ON "Chunk"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
