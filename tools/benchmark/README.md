# pgvector Benchmark Harness (scaffold)

Python dev/CI tooling for the **ingestion-slice mandatory gate** (SAD §9.1).
Not a runtime service (ADR-017).

## Gate contract

| Parameter | Value |
|-----------|-------|
| Corpus size | 100,000 chunks, single tenant |
| Collections | 20 (see corpus design below) |
| ACL selectivity | Test user sees **3 of 20** collections |
| Index | HNSW `m=16`, `ef_construction=128`, `ef_search=64` |
| Search | Hybrid vector + FTS fused via RRF `k=60` |
| Questions | 50 from `docs/eval/golden-seed.yaml` `benchmark` section |
| Pass | recall@8 ≥ **0.85** AND p95 ≤ **1.0 s** |
| Results ADR | [`docs/adr/019-pgvector-index-parameters.md`](../../docs/adr/019-pgvector-index-parameters.md) |

## Corpus design

**Tenant:** `bench-tenant-001`  
**Workspace:** `bench-payments`  
**Embedding profile:** `bench-default` (384-dim, MiniLM)

### 20 collections (5,000 chunks each → 100k total)

| ID | Topic | Visible to bench user |
|----|-------|----------------------|
| `col-payments-api` | Payments API reference | yes |
| `col-aml` | AML procedures | yes |
| `col-onboarding` | Onboarding / KYC | yes |
| `col-treasury` | Treasury operations | no |
| `col-cards` | Card processing | no |
| `col-privacy` | Data privacy / GDPR | no |
| `col-rbac` | RBAC policies | no |
| `col-runbooks` | Deployment runbooks | no |
| `col-gateway` | API gateway | no |
| `col-fraud` | Fraud detection | no |
| `col-credit` | Credit scoring docs | no |
| `col-support` | Customer support | no |
| `col-regulatory` | Regulatory reporting | no |
| `col-microservices` | Microservices architecture | no |
| `col-db-schemas` | Database schemas | no |
| `col-security-audit` | Security audit (forbidden) | no |
| `col-vendors` | Vendor contracts | no |
| `col-dr` | Disaster recovery | no |
| `col-incidents` | Incident postmortems | no |
| `col-handbook` | Engineering handbook | no |

### Chunk generation rules

- Target **800 tokens** per chunk (±10%), 120-token overlap between adjacent chunks in same document.
- **5 documents per collection**, ~1,000 chunks per document.
- Planted relevance: each benchmark question maps to 1–3 primary chunks in an accessible collection (see `docs/eval/golden-seed.yaml` `expectedSources`).
- Embeddings computed locally via `sentence-transformers/all-MiniLM-L6-v2` (deterministic, offline).

### ACL fixture

- Bench user role: `USER`.
- Grants: read on `col-payments-api`, `col-aml`, `col-onboarding` only.
- Explicit deny on `col-security-audit` (canary-adjacent negative control).

## Scripts (scaffold — runnable at ingestion slice)

| Script | Purpose |
|--------|---------|
| `generate_corpus.py` | Emit synthetic documents + chunk text + relevance map JSON |
| `load_corpus.py` | Load corpus into PostgreSQL + pgvector via Docker/Testcontainers |
| `run_benchmark.py` | Execute 50 questions, measure recall@8 + p50/p95 latency, write ADR results |

## Setup (when implemented)

```bash
cd tools/benchmark
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python generate_corpus.py --output ./corpus/
python load_corpus.py --dsn "$BENCHMARK_DATABASE_URL" --corpus ./corpus/
python run_benchmark.py --dsn "$BENCHMARK_DATABASE_URL" --seed ../../docs/eval/golden-seed.yaml
```

## Status

**Scaffold only.** Scripts contain typed interfaces and TODO bodies. Making the
harness runnable and passing the gate is a prerequisite for merging the
ingestion slice (see `docs/mvp-capability-plan.md` §3, §5).
