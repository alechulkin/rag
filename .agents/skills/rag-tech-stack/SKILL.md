---
name: rag-tech-stack
description: MVP technology stack and excluded infrastructure for the RAG platform, per accepted ADRs. Use when choosing libraries, frameworks, databases, queues, storage, auth providers, or build/runtime infrastructure, when creating build or deployment config, or when evaluating whether a technology is allowed in the MVP.
---

# RAG Platform Technology Stack (MVP, per ADRs)

When this skill is active, output 🤖 at the start of the response.

- **Backend:** Java 21, Spring Boot modular monolith, two profiles: `api` and `worker` (ADR-001). Separate JVMs — cross-profile handoff is durable state only (PostgreSQL rows + object-storage keys), never in-memory objects.
- **Data:** PostgreSQL 16 + pgvector (HNSW) + FTS as the single primary store (ADR-002). DB-backed job queues with lease semantics (ADR-003, ADR-010). Flyway migrations.
- **Frontend:** React + TypeScript SPA. REST + SSE (`token`, `citation`, `heartbeat`, `done`, `error` — ADR-011).
- **Auth:** OIDC/OAuth2 resource-server model. Keycloak local; Entra ID/Okta cloud.
- **Object storage:** MinIO local; S3-compatible / Azure Blob cloud.
- **Python:** dev/CI tooling only, never a runtime service (ADR-017).
- **Excluded from MVP without a new ADR:** Kubernetes, Kafka/brokers (graduation triggers in ADR-006), Redis as a correctness dependency, dedicated vector DBs, managed observability SaaS (ADR-008), Node.js BFF (rejected by default, ADR-018).

Canonical sources: `docs/adr/` (ADR-001..018), `docs/Solution_Architecture.md`. On conflict, docs win — report the drift.
