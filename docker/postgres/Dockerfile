# Production PostgreSQL with pgBackRest, which must run where the server writes its WAL (RNF-12)
FROM postgres:17

RUN apt-get update \
  && apt-get install -y --no-install-recommends pgbackrest \
  && rm -rf /var/lib/apt/lists/*
