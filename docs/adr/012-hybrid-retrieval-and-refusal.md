# ADR-012: Hybrid Retrieval and Refusal Policy

## Status
Accepted

## Decision
- Retrieval mode: dense + FTS fused via RRF (`k=60`) by default.
- Refusal decision uses retrieved evidence thresholds:
  - no permitted chunks, or
  - all dense scores below configured threshold, and
  - insufficient aggregate context tokens.
- Conversational query rewriting is out of MVP scope.
- Retrieval uses latest user question text; prior turns used for generation context only.

## Consequences
- Refusal behavior is deterministic and testable.
- Avoids premature rewriting complexity in MVP.
