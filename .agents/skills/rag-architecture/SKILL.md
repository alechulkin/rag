---
name: rag-architecture
description: Module map and non-negotiable ArchUnit/CI-blocking architecture invariants for the RAG platform backend. Use when implementing or reviewing backend code, deciding module or package placement, writing search/vector/FTS queries, touching permissions, audit, AI provider calls, tenant data, or ingestion pipeline boundaries.
---

# RAG Platform Architecture: Module Map and Invariants

When this skill is active, output 🤖 at the start of the response.

## Module Map (canonical: `docs/Module_Boundaries.md` §2–3)

One Gradle module; logical walls enforced by ArchUnit, not separate jars.

- **Hard-walled (ArchUnit CI-blocking):** `policy`, `audit`, `search`, `ai.provider`
- **Domain:** `documents` (mgmt / pipeline / connector sub-packages), `rag`, `chat`, `evaluation`, `admin`
- **Supporting:** `web` (controllers), `worker.runtime`, `metrics`, `adapters` (objectstorage, identity)

Do not invent additional modules (no separate ingestion, notification,
connector, observability, identity modules — see Module_Boundaries §1 for
why those were collapsed). Do not create global `controller`/`service`/
`repository` layer packages.

## Non-Negotiable Invariants (ArchUnit / CI-blocking)

1. Provider SDK classes only inside `ai.provider.adapter`; sole AI entry point is `PolicyEngine.callProvider()` (SAD §2.3; ADR-004).
2. All vector/FTS queries go through `search` (`PermissionAwareSearchRepository`); every read requires `AllowedFilterSet`; no native/pgvector/tsvector queries elsewhere.
3. `rag` resolves its own permission filter via `policy.access` — callers never supply a hand-built `AllowedFilterSet`.
4. `audit` is the sole writer to `audit_events`, append-only, in the caller's transaction (ADR-005, ADR-015).
5. `documents.mgmt` (api) never imports `documents.pipeline` (worker); communication only via `ingestion_jobs` rows.
6. Fail-closed: permission ambiguity, provider-policy failure, or budget-store unavailability → deny (BRD §2.2, §4.3).
7. Per-tenant canary chunk seeded from foundation slice; canary in any result = P1.
8. Every tenant-owned row carries `tenant_id` (+ `workspace_id` where scoped); deletion propagates to chunks, embeddings, indexes, and object storage across all embedding profiles.

Canonical sources: `docs/Module_Boundaries.md`, `docs/Solution_Architecture.md`, `docs/adr/`. On conflict, docs win — report the drift.
