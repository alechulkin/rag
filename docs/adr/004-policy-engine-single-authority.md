# ADR-004: Policy Engine Is Single Authority

## Status
Accepted

## Context
Permission-aware retrieval and provider validation are hard requirements.

## Decision
- `AllowedFilterSet` is produced only by `policy.access`.
- Every search read path requires `AllowedFilterSet`.
- Every provider call goes through `policy.callProvider(...)`.
- Direct provider SDK and direct pgvector/FTS access outside owning packages is CI-blocked.

## Consequences
- Eliminates bypass class of security failures.
- Central place for residency, budget, and authorization checks.
