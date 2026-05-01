# Use official Postgres image and install build deps for pgvector
FROM postgres:15

# Install build dependencies, build pgvector, then clean up to keep image small
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    ca-certificates \
    postgresql-server-dev-15 \
  && git clone --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && cd /tmp/pgvector \
  && make && make install \
  && rm -rf /tmp/pgvector \
  && apt-get remove -y git build-essential postgresql-server-dev-15 \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 5432

CMD ["docker-entrypoint.sh", "postgres"]
