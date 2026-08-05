"""Load generated corpus into PostgreSQL + pgvector (scaffold — ingestion slice)."""

from __future__ import annotations

import argparse
from pathlib import Path


def load_corpus(dsn: str, corpus_dir: Path) -> None:
    """Insert chunks, embeddings, and ACL rows into benchmark database.

    TODO (ingestion slice):
    - Connect via psycopg + pgvector
    - Create HNSW index with m=16, ef_construction=128
    - Load ACL fixture (3/20 collections visible)
    - Batch-insert 100k chunk_embeddings rows
    """
    if not corpus_dir.is_dir():
        raise FileNotFoundError(f"corpus directory not found: {corpus_dir}")
    raise NotImplementedError(
        "Corpus loader not implemented — complete during ingestion slice gate work"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Load benchmark corpus into PostgreSQL")
    parser.add_argument("--dsn", required=True, help="PostgreSQL connection string")
    parser.add_argument("--corpus", type=Path, required=True, help="Generated corpus directory")
    args = parser.parse_args()
    load_corpus(args.dsn, args.corpus)


if __name__ == "__main__":
    main()
