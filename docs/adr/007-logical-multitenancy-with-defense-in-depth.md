# ADR-007: Logical Multitenancy with Defense-in-Depth

## Status
Accepted

## Context
MVP requires shared-schema multitenancy with strict data isolation.

## Decision
- Primary enforcement: application-level tenant/workspace filtering via `policy`.
- CI-enforced single retrieval path and canary chunk checks.
- Physical isolation remains roadmap (schema/db-per-tenant for high-compliance tiers).

## Consequences
- Keeps MVP simple and cost-efficient.
- Preserves migration path for stricter isolation tiers.
