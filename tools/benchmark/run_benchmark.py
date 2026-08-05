"""Run pgvector benchmark gate (scaffold — ingestion slice)."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BenchmarkResult:
    recall_at_8: float
    latency_p50_ms: float
    latency_p95_ms: float
    questions_evaluated: int

    @property
    def passed(self) -> bool:
        return self.recall_at_8 >= 0.85 and self.latency_p95_ms <= 1000.0


def run_benchmark(dsn: str, seed_yaml: Path) -> BenchmarkResult:
    """Execute hybrid search for each benchmark question and compute metrics.

    TODO (ingestion slice):
    - Load questions from docs/eval/golden-seed.yaml benchmark section
    - Call PermissionAwareSearchRepository-equivalent queries with ACL filter
    - Compute recall@8 against expectedSources
    - Measure p50/p95 over filtered hybrid search
    - Write results into docs/adr/019-pgvector-index-parameters.md
    """
    if not seed_yaml.is_file():
        raise FileNotFoundError(f"seed file not found: {seed_yaml}")
    raise NotImplementedError(
        "Benchmark runner not implemented — complete during ingestion slice gate work"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SAD §9.1 pgvector benchmark gate")
    parser.add_argument("--dsn", required=True, help="PostgreSQL connection string")
    parser.add_argument(
        "--seed",
        type=Path,
        default=Path("../../docs/eval/golden-seed.yaml"),
        help="Golden seed YAML path",
    )
    args = parser.parse_args()
    result = run_benchmark(args.dsn, args.seed)
    print(result)
    if not result.passed:
        raise SystemExit("Benchmark gate FAILED")


if __name__ == "__main__":
    main()
