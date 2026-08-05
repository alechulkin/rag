# Golden Question Seed Set

Authoritative **seed** golden Q&A cases for MVP evaluation and benchmark
work. Runtime cases live in the `golden_questions` table after the evaluation
slice; until then this file is the source of truth for seed content.

## Consumers

| Consumer | Plan row | Purpose |
|----------|----------|---------|
| SAD §9.1 pgvector benchmark | ingestion slice gate | 50 `benchmark` questions over synthetic corpus topics |
| CHAT-AC2 refusal verification | evaluation slice | `refusal` cases — insufficient context must return refusal template |
| EVAL-AC1 negative-ACL parity | evaluation slice | `negativeAcl` cases — forbidden collection must not leak into retrieval |

## Files

- [`golden-seed.yaml`](golden-seed.yaml) — seed cases in three sections:
  `benchmark` (50), `refusal` (10), `negativeAcl` (10).
- Validation: `node scripts/check-golden-seed.mjs` (CI `docs-verify` job).

## Schema (PRD §04 §5.1)

Each case includes:

| Field | Description |
|-------|-------------|
| `id` | Unique seed identifier (stable across imports) |
| `question` | User question text |
| `scope` | `workspace` + `collections[]` (and optional `documentId`) |
| `expectedAnswer` | Reference answer or refusal rationale |
| `expectedSources` | Corpus-relative document IDs (empty for refusal cases) |
| `requiredKeywords` | Deterministic oracle — must appear in answer |
| `forbiddenKeywords` | Deterministic oracle — must not appear |
| `expectedBehavior` | `answer` or `refuse` |
| `tags` | Taxonomy labels |
| `status` | `active`, `stale`, or `disabled` |

## Corpus alignment

`benchmark` cases reference document IDs under three **accessible** collections
(`col-payments-api`, `col-aml`, `col-onboarding`) that match the synthetic
benchmark corpus design in [`tools/benchmark/README.md`](../../tools/benchmark/README.md).

`negativeAcl` cases target **forbidden** collections (security audit, vendors,
disaster recovery, incidents, handbook) that the benchmark ACL fixture hides
from the test user (3 of 20 collections visible).

## Lifecycle

1. **Now (docs phase):** edit `golden-seed.yaml`; CI validates schema.
2. **Evaluation slice:** import seed into `golden_questions` / suite fixtures;
   promotion workflow (PRD §04 §5.4) adds cases from live chat feedback.
3. **Stale handling:** soft-delete of source documents marks dependent cases
   `stale` (EVAL-AC5).
