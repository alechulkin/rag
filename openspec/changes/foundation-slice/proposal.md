## Why

Repository is documentation-only today. Foundation slice is track 1 (SAD §8, Module_Boundaries §9 step 1): first runnable vertical slice that establishes CI-blocking ArchUnit walls, tenancy bootstrap, OIDC login, and hard-walled module stubs before ingestion or chat land. Without it, later slices cannot enforce permission isolation or canary detection from day one.

## What Changes

- Add single Gradle module with package tree per Module_Boundaries §2; Spring Boot profiles `api` and `worker` as separate JVMs (ADR-001); activate the staged `backend-verify` CI job as soon as the Gradle wrapper and required verification tasks exist.
- Add Docker Compose stack: PostgreSQL 16 + pgvector, Keycloak, MinIO, backend (`api` + `worker`), frontend shell.
- Update `docs/Database_Schema.md` §2.1/§9.1/§9.2 directly (canonical edit, not a deferred sync) to add `tenants.jit_email_domains` and to move the canary FK chain into the foundation-slice migration list.
- Add Flyway V1 for Database_Schema §9.1 foundation tables plus the seven-table canary FK chain, including `access_policies` deny rows so "forbidden collection" is a persisted fact (resolution **a**, extended — see design).
- Add `shared.model` + `shared.exception` foundation value objects (`AllowedFilterSet`, `Scope`, `AuditEvent`/`AuditPayload`, `RequestContext`, `DomainException` hierarchy) ahead of the ArchUnit walls that depend on them.
- Add Java domain model, repositories, and seed data (demo tenant, workspace, users per role); every workspace's canary chain is provisioned atomically with the workspace, not only for the demo seed.
- Add hard-walled module stubs: `policy`, `audit`, `search`, `ai.provider` with public interfaces and fail-closed defaults.
- Add nine ArchUnit rules (CI-blocking, first deliverable): provider-SDK wall, search wall, `documents.mgmt` ⊥ `documents.pipeline`, api-profile ⊥ worker-domain packages (exact annotation/package matching rule), AllowedFilterSet filter-forgery wall, audit sole-writer wall, entity boundary wall, `web.dto` dependency wall, SearchReader/SearchWriter caller walls.
- Add OIDC login flow, JWT validation, JIT provisioning rules (BA §7.2.a via canonical `tenants.jit_email_domains` column), and foundation bootstrap API per PRD Admin §8 with OpenAPI contract, atomic canary provisioning, and in-transaction audit (PRD Admin §9).
- Add React SPA shell with OIDC redirect login.
- Add test suite: ArchUnit, Testcontainers migration, OIDC integration, permission-cache invalidation, audit append-only, atomic-provisioning rollback, in-transaction audit, canary detection.
- Produce `docs/specs/01_Foundation_Spec.md` as the canonical implementation specification.

## Capabilities

### New Capabilities

- `project-bootstrap`: Gradle skeleton, package layout, Spring profiles, Docker Compose local stack, frontend shell, `shared.model`/`shared.exception` foundation VOs.
- `archunit-enforcement`: Nine CI-blocking ArchUnit walls written before any domain code, with an exact annotation/package matching rule for the api-profile wall.
- `foundation-persistence`: Domain model for §9.1 tables, Flyway V1, canonical `jit_email_domains` column (Database_Schema.md updated in this change), audit INSERT-only role/trigger, monthly partitioning, seed data, seven-table canary FK chain with persisted `access_policies` deny rows (resolution a, extended).
- `module-stubs`: Hard-walled stubs for `policy`, `audit`, `search`, `ai.provider` with documented public interfaces, including the SearchWriter EmbeddingProfile+tenant-context contract.
- `foundation-auth-api`: OIDC/JWT security, role model, JIT provisioning, fail-closed defaults, foundation admin HTTP endpoints with atomic canary provisioning and in-transaction audit.
- `foundation-testing`: ArchUnit, Testcontainers, integration, atomic-provisioning, and canary test requirements.

### Modified Capabilities

- _(none — no existing specs in `openspec/specs/`)_

## Impact

- **New code**: entire backend (`src/main/java/...`), frontend shell, Flyway migrations, Docker Compose, Gradle build, and active backend CI verification.
- **New spec doc**: `docs/specs/01_Foundation_Spec.md`.
- **Existing docs edited in this change**: `docs/Database_Schema.md` §2.1 (`tenants.jit_email_domains`), §9.1/§9.2 (canary table set moved into foundation slice).
- **APIs**: `GET /api/v1/workspaces` plus four bootstrap endpoints per PRD Admin §8; all in `openapi/admin.yaml` with Idempotency-Key on writes and in-transaction audit per PRD Admin §9.
- **Database**: V1 migration — §9.1 tables plus seven-table canary FK chain (`collections`, `documents`, `document_versions`, `embedding_profiles`, `chunks`, `chunk_embeddings`, `access_policies`) and `tenants.jit_email_domains` column, all now canonical in `docs/Database_Schema.md`.
- **Dependencies**: Java 21, Spring Boot, Spring Security OAuth2 Resource Server, Flyway, Testcontainers, ArchUnit, pgvector extension, Keycloak, MinIO.
- **Systems**: local dev stack only; no MVP-excluded infra (Kafka, Redis, K8s, dedicated vector DB).
