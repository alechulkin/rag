# AGENTS.md

## Project Overview

AI Knowledge Assistant for FinTech Engineering Teams — a multi-tenant,
permission-aware RAG platform: ingest technical/operational/compliance
documents, answer questions with grounded, cited responses.

Internal decision-support tool only. It does not make financial, credit,
AML/KYC, employment, or compliance decisions.

**Repository state:** documentation-first. No implementation code yet.
Specs and contracts in `docs/` and `openapi/` are the deliverable; treat
them as the source for any generated code.

## Sources of Truth (precedence on conflict)

1. `docs/BRD.md` — business scope and hard requirements
2. `docs/NFR.md` — measurable quality and cost constraints
3. `docs/adr/` — accepted architecture decisions (ADR-001..018)
4. `docs/Solution_Architecture.md` — runtime topology, sequences, cross-cutting concerns
5. `docs/Module_Boundaries.md` + `docs/Shared_Abstractions.md` — module map and shared contracts
6. `docs/Database_Schema.md` — canonical data model (DDL-level)
7. `docs/API_Contracts.md` + `openapi/*.yaml` — HTTP/SSE contract surface
8. `docs/Communication_Patterns.md` — sync/async interaction rules
9. `docs/prd/*.md` — feature requirements
10. `docs/Architecture_Options.md` — historical analysis only, not authority

When documents conflict, report the conflict. Do not silently choose one.
When this file conflicts with `docs/`, `docs/` wins — report the drift.

## Technology Stack (MVP, per ADRs)

- **Backend:** Java 21, Spring Boot modular monolith, two profiles: `api` and `worker` (ADR-001). Separate JVMs — cross-profile handoff is durable state only (PostgreSQL rows + object-storage keys), never in-memory objects.
- **Data:** PostgreSQL 16 + pgvector (HNSW) + FTS as the single primary store (ADR-002). DB-backed job queues with lease semantics (ADR-003, ADR-010). Flyway migrations.
- **Frontend:** React + TypeScript SPA. REST + SSE (`token`, `citation`, `heartbeat`, `done`, `error` — ADR-011).
- **Auth:** OIDC/OAuth2 resource-server model. Keycloak local; Entra ID/Okta cloud.
- **Object storage:** MinIO local; S3-compatible / Azure Blob cloud.
- **Python:** dev/CI tooling only, never a runtime service (ADR-017).
- **Excluded from MVP without a new ADR:** Kubernetes, Kafka/brokers (graduation triggers in ADR-006), Redis as a correctness dependency, dedicated vector DBs, managed observability SaaS (ADR-008), Node.js BFF (rejected by default, ADR-018).

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

## API Conventions (canonical: `docs/API_Contracts.md`, ADR-009)

- Base path `/api/v1`; errors are RFC 7807 `ProblemDetails` with `requestId`; `X-Request-Id` on every response.
- Cursor pagination for high-cardinality lists; `Idempotency-Key` on retry-sensitive writes.
- OpenAPI in `openapi/` is the machine-readable contract; update it with any endpoint change.

## Rule Layers (precedence)

Three layers, most authoritative first:

1. `docs/` + `openapi/` — canonical source of truth. On any conflict, docs win.
2. `.claude/rules/` — architecture invariants scoped per module (`paths:` frontmatter). See `.claude/rules/README.md` for the file index.
3. `.cursor/rules/` — language/style conventions, authoritative for style only:
   - `.cursor/rules/java/` — coding style, patterns, security, testing
   - `.cursor/rules/react/` + `.cursor/rules/typescript/` — frontend
   - `.cursor/rules/python/` — tooling scripts
   - `.cursor/rules/common/` — cross-cutting workflow, review, security

Do not restate rules from these layers here or in code comments.
Tool note: Cursor auto-attaches `.cursor/rules/*.mdc`; `.claude/rules/` applies in Claude Code and compatible agents.

## Verification

No build files exist yet. Once implementation starts, the build tool
config in the repository is authoritative (Gradle expected per
Module_Boundaries). Until then, doc changes are verified by:

- OpenAPI parses (`openapi/*.yaml`)
- Cross-doc consistency grep (table names, ADR references, stale terms)
- Mermaid diagrams render

## Workflow for Non-Trivial Changes

For changes touching security, schema, RAG behavior, architecture, or >3 files:

1. Read governing BRD/NFR/PRD/ADR sections first.
2. Plan before editing; state assumptions and open decisions.
3. Implement the smallest coherent vertical slice.
4. Update `openapi/`, ADRs, or architecture docs when contracts or decisions change — new architectural decisions require a new ADR in `docs/adr/`, never silent edits to accepted ones.
5. No opportunistic refactoring of unrelated files.

## Protected Rules

- Never expose data across tenants or workspaces.
- Never bypass pre-retrieval permission filtering.
- Never bypass AI-provider residency/policy validation.
- Never place secrets in source, logs, prompts, or test fixtures.
- Never alter BRD/NFR requirements as part of an implementation task.
- Never introduce MVP-excluded infrastructure without an accepted ADR.
- Never claim successful verification without running the stated checks.

## Domain Terminology

Glossary: see `docs/BA_Analysis.md` + `docs/Database_Schema.md`. Key terms:
chunk, embedding profile, AllowedFilterSet, fail-closed, hybrid search (RRF),
golden question, four-eyes approval, soft delete (7-day grace), classification
tiers (`standard`/`restricted`/`strict`).
