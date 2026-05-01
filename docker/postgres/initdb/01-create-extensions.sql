-- Create the pgvector extension
-- Note: The official Postgres image runs init scripts against POSTGRES_DB by default
CREATE EXTENSION IF NOT EXISTS vector;
