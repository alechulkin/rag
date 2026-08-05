"""Generate synthetic benchmark corpus (scaffold — ingestion slice)."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CorpusConfig:
    tenant_id: str = "bench-tenant-001"
    workspace_id: str = "bench-payments"
    collections: int = 20
    documents_per_collection: int = 5
    chunks_per_document: int = 1000
    chunk_tokens: int = 800
    overlap_tokens: int = 120
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"


def generate_corpus(output_dir: Path, config: CorpusConfig) -> None:
    """Write synthetic documents, chunks, and planted-relevance map.

    TODO (ingestion slice): implement deterministic text generation per
    collection topic; emit corpus/manifest.json aligned with
    docs/eval/golden-seed.yaml expectedSources IDs.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    raise NotImplementedError(
        "Corpus generator not implemented — complete during ingestion slice gate work"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic pgvector benchmark corpus")
    parser.add_argument("--output", type=Path, required=True, help="Output directory")
    args = parser.parse_args()
    generate_corpus(args.output, CorpusConfig())


if __name__ == "__main__":
    main()
