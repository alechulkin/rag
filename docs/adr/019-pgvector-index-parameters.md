# pgvector Index Parameters — Proposed

**Status:** Proposed (awaiting first benchmark run at ingestion-slice gate)  
**Date:** 2026-08-05  
**Source:** SAD §9.1, PRD §02 §5.3, Database_Schema §3.3

## Context

The ingestion slice must not merge until a synthetic benchmark on a 100k-chunk
single-tenant corpus demonstrates acceptable filtered hybrid search performance
and recall. This ADR records the parameters chosen and the measured results.

## Decision (defaults — pre-benchmark)

- **Index type:** HNSW (IVFFlat deferred unless corpus exceeds 2M chunks per tenant)
- **Parameters:** `m = 16`, `ef_construction = 128`, `ef_search = 64`
- **Fusion:** RRF with `k = 60`
- **Embedding model (benchmark harness):** local `sentence-transformers/all-MiniLM-L6-v2` (384 dims, offline, deterministic for CI)

## Pass criteria (mandatory)

On 100k-chunk corpus with ACL selectivity “user sees 3 of 20 collections”:

| Metric | Threshold |
|--------|-----------|
| recall@8 | ≥ 0.85 |
| p95 filtered hybrid latency | ≤ 1.0 s |

## Benchmark run results

> **Not yet run.** Fill this section after `tools/benchmark/run_benchmark.py`
> executes against a loaded corpus (ingestion slice gate).

| Metric | Measured | Pass |
|--------|----------|------|
| recall@8 | _TBD_ | _TBD_ |
| p50 latency | _TBD_ | — |
| p95 latency | _TBD_ | _TBD_ |
| Questions evaluated | 50 (from `docs/eval/golden-seed.yaml` benchmark section) | — |

## Escalation levers (if pass criteria not met)

1. Increase `ef_search` (first lever)
2. Partial indexes per collection
3. Re-evaluate IVFFlat for large corpora

## Consequences

- Parameters become the documented baseline for production HNSW indexes.
- Failed gate blocks ingestion-slice merge until criteria met or ADR updated with accepted trade-off (requires product + tech lead sign-off).
