## 1. Foundation Spec Document

- [x] 1.1 Write `docs/specs/01_Foundation_Spec.md` synthesizing proposal, design, and delta specs with file-path-level layout (entities → migrations → stubs → endpoints → tests)
- [x] 1.2 Document canary resolution **(a)** with full FK chain: `collections` → `documents` → `document_versions` → `embedding_profiles` → `chunks` → `chunk_embeddings`, plus `access_policies` persisted-deny rows
- [x] 1.3 Document cross-doc resolutions already applied to `docs/Database_Schema.md` in this change: `tenants.jit_email_domains` column, §9.1/§9.2 canary table split; and the SAD §9.2 → Module_Boundaries package name mapping
- [x] 1.4 Cross-check spec against Database_Schema §9.1/§9.2, Module_Boundaries §2/§9, SAD §8 track 1, openapi/admin.yaml — report any remaining conflicts (evidence: `evidence/phase-a-doc-verify.md`; OpenAPI gap → task 7.11)



## 2. Project Skeleton

- [x] 2.1 Create Gradle build (Java 21, Spring Boot) with single module and dependency set (Flyway, Spring Security OAuth2 Resource Server, Testcontainers, ArchUnit, pgvector JDBC) (evidence: `evidence/task-2.1-gradle-build.md`; `./gradlew build` → BUILD SUCCESSFUL)
- [x] 2.2 Activate `.github/workflows/ci.yml` `backend-verify` immediately after the Gradle wrapper and required tasks exist; configure lint, dependency scan, test, JaCoCo coverage per `docs/qa/coverage-policy.md`, build, and evidence commands so this job passes before domain implementation starts (evidence: `evidence/task-2.2-backend-ci.md`; CI + CodeQL green at `0c009df`)
- [ ] 2.3 Scaffold package tree per Module_Boundaries §2: `documents.pipeline`, `evaluation`, `worker.runtime` (NOT `worker.pipeline` / `worker.eval`)
- [ ] 2.4 Configure Spring profiles `api` and `worker` with profile-specific `@Configuration` and component scanning boundaries
- [ ] 2.5 Add `application-api.yml` and `application-worker.yml` with PostgreSQL, Keycloak issuer, MinIO placeholders
- [ ] 2.6 Create Docker Compose: PostgreSQL 16 + pgvector, Keycloak (realm import), MinIO, api service, worker service, frontend shell
- [ ] 2.7 Scaffold React + TypeScript frontend shell with OIDC redirect login per Design_System.md



## 3. Shared Value Objects and Exceptions

- [ ] 3.1 Implement `shared.model.AllowedFilterSet` (tenantId, workspaceId, allowedCollectionIds, explicitDocGrantIds, explicitDocDenyIds, workspaceClassification) with package-private constructor and factory in `policy.access` only (Shared_Abstractions §S01)
- [ ] 3.2 Implement `shared.model.Scope`, `shared.model.ProviderDecision` value objects
- [ ] 3.3 Implement `shared.model.AuditEvent` + `AuditPayload` marker interface for typed per-event-type payloads
- [ ] 3.4 Implement `shared.model.RequestContext` (`@RequestScope`: tenantId, workspaceId, userId), api profile only
- [ ] 3.5 Implement `shared.exception.DomainException` hierarchy
- [ ] 3.6 Verify these VOs compile standalone before any ArchUnit wall test depends on them



## 4. ArchUnit Walls (First Deliverable, Nine Walls)

- [ ] 4.1 Implement ArchUnit test: provider SDK imports only in `..ai.provider.adapter..`
- [ ] 4.2 Implement ArchUnit test: native/pgvector/tsvector queries only in `..search..`
- [ ] 4.3 Implement ArchUnit test: `documents.mgmt` must not import `documents.pipeline`
- [ ] 4.4 Implement ArchUnit test: no `api`-profile class (matched via `@Profile("api")` annotation OR package membership in `..web..`/`..adapters.identity..`) imports `documents.pipeline`, `evaluation`, or `worker.runtime`
- [ ] 4.5 Implement ArchUnit test: `AllowedFilterSet` construction only inside `policy` (filter-forgery wall)
- [ ] 4.6 Implement ArchUnit test: `audit_events` writes only inside `audit` package (audit-writer wall)
- [ ] 4.7 Implement ArchUnit test: `@Entity` classes referenced only within owning package (entity-boundary wall)
- [ ] 4.8 Implement ArchUnit test: `web.dto` never imported by `shared.model` or any domain package
- [ ] 4.9 Implement ArchUnit test: `SearchReader` called only by `rag`; `SearchWriter` called only by `documents.pipeline`
- [ ] 4.10 Verify the active `backend-verify` job runs all nine ArchUnit tests through `./gradlew test`; confirm each intentional wall violation fails the CI build



## 5. Database and Domain Model

- [ ] 5.1 Write Flyway V1: all Database_Schema §9.1 tables including `tenants.jit_email_domains TEXT[] NOT NULL DEFAULT '{}'` (already reflected in `docs/Database_Schema.md`)
- [ ] 5.2 Write Flyway V1: audit INSERT-only role + `BEFORE UPDATE OR DELETE` trigger per Database_Schema §11
- [ ] 5.3 Write Flyway V1: canary FK chain — `collections`, `documents`, `document_versions`, `embedding_profiles`, `chunks`, `chunk_embeddings`, `access_policies` (exact Database_Schema DDL)
- [ ] 5.4 Write Flyway seed: demo tenant (`idp_issuer`, `jit_email_domains`), workspace, four users (ADMIN/CONTRIBUTOR/USER/VIEWER), memberships, full canary chain with one `access_policies` deny row per role
- [ ] 5.5 Create Java enums matching Database_Schema exactly (workspace_role, tenant_classification, approval_status incl. revoked, user_status, membership_status, severity_level, scope_type, subject_type, access_action, etc.)
- [ ] 5.6 Create Java entity records/classes for all §9.1 entities plus canary chain entities, tenant-scoped directly where a `tenant_id` column exists and through the canonical FK chain where it does not
- [ ] 5.7 Create Spring Data JPA repositories with tenant-filtered queries (direct predicate or FK-chain join per table)



## 6. Hard-Walled Module Stubs

- [ ] 6.1 Implement `policy.access`: `resolvePermissions()` returning `AllowedFilterSet`, permission cache (TTL ≤ 60s for `standard` only), cache bypass for `restricted`/`strict`, `perm_cache_version` integration, LISTEN/NOTIFY invalidation, PG-direct fallback
- [ ] 6.2 Implement `policy.providergate`: `callProvider()` signature with fail-closed deny default
- [ ] 6.3 Implement `audit`: `record(AuditEvent)` transactional append to `audit_events`
- [ ] 6.4 Implement `search.SearchReader`: requires `AllowedFilterSet` on every method; canary-check hook on every read path
- [ ] 6.5 Implement `search.SearchWriter`: `insertChunksAndVectors`, `deleteByDocument`, `deleteByProfile`, each requiring `EmbeddingProfile` plus explicit tenant context (`tenantId`, `workspaceId`); no method accepts `AllowedFilterSet`
- [ ] 6.6 Implement `ai.provider`: adapter SPI, one local OpenAI-compatible stub adapter (package-private)



## 7. Security and API

- [ ] 7.1 Configure Spring Security OAuth2 Resource Server with Keycloak JWT validation
- [ ] 7.2 Implement JIT provisioning: issuer in `tenants.idp_issuer` AND domain in `tenants.jit_email_domains`; no memberships on create
- [ ] 7.3 Implement disabled-user denial and fail-closed permission defaults
- [ ] 7.4 Implement role model (ADMIN/CONTRIBUTOR/USER/VIEWER) + capability flags (`platform:admin`, etc.)
- [ ] 7.5 Implement `GET /api/v1/workspaces` with cursor pagination per openapi/admin.yaml
- [ ] 7.6 Implement `POST /api/v1/admin/tenants` with in-transaction `tenant.created` audit event
- [ ] 7.7 Implement `POST /api/v1/admin/tenants/{tenantId}/workspaces` as one transaction: workspace row + full canary chain (collection/document/version/chunk/embedding reusing the workspace's active embedding profile) + one `access_policies` deny row per workspace role + `workspace.created` audit event; any failure rolls back the whole transaction
- [ ] 7.8 Implement `POST /api/v1/workspaces/{workspaceId}/members` and `PUT /api/v1/workspaces/{workspaceId}/members/{userId}/role` with in-transaction audit events; role change additionally increments `perm_cache_version`
- [ ] 7.9 Add Idempotency-Key handling on all bootstrap write endpoints
- [ ] 7.10 Add global `X-Request-Id` filter and RFC 7807 ProblemDetails exception handler
- [ ] 7.11 Update `openapi/admin.yaml` with all bootstrap endpoints, schemas, security, Idempotency-Key parameter



## 8. Frontend Integration

- [ ] 8.1 Implement OIDC redirect login flow against Keycloak
- [ ] 8.2 Implement post-login workspace list page calling `GET /api/v1/workspaces`
- [ ] 8.3 Verify frontend shell runs in Docker Compose against api backend



## 9. Tests

- [ ] 9.1 Testcontainers: Flyway V1 migration test verifying §9.1 + seven-table canary chain + `jit_email_domains`, diffed against `docs/Database_Schema.md`
- [ ] 9.2 Integration: OIDC/JWT validation (valid, invalid, disabled user, JIT domain denial)
- [ ] 9.3 Integration: permission cache NOTIFY invalidation; LISTEN drop PG-direct fallback; restricted workspace cache bypass
- [ ] 9.4 Integration: audit append-only (UPDATE/DELETE rejected for app role)
- [ ] 9.5 Integration: bootstrap API authorization, Idempotency-Key dedup, perm_cache_version increment on role change
- [ ] 9.6 Integration: workspace creation is atomic — forced failure mid-canary-provisioning leaves no orphan workspace row
- [ ] 9.7 Integration: every bootstrap CUD endpoint commits its audit event in the same transaction as its mutation
- [ ] 9.8 Integration: canary chunk seeded with valid FK chain and persisted deny rows, detectable by search canary-check hook
- [ ] 9.9 Docker Compose smoke: full stack healthy, login + workspace list end-to-end
- [ ] 9.10 Configure JaCoCo thresholds per `docs/qa/coverage-policy.md` (70% aggregate, 90% policy/audit/search packages); wire `jacocoTestCoverageVerification` into `./gradlew check`
- [ ] 9.11 Scaffold Playwright E2E project under `frontend/e2e/` with journey #1 (login) per `docs/qa/e2e-journeys.md`



## 10. Verification

- [ ] 10.1 Run full test suite locally (ArchUnit, Testcontainers, integration)
- [ ] 10.2 Validate openapi/admin.yaml parses
- [ ] 10.3 Grep cross-doc consistency (table names, ADR refs, no stale `worker.pipeline`/`worker.eval` terms); **reconcile SAD §9.2 line ~505** (`worker.pipeline`/`worker.eval` → `documents.pipeline`/`evaluation` per spec §2.3) before running grep gate
- [ ] 10.4 Confirm no MVP-excluded infrastructure introduced (Kafka, Redis, K8s, dedicated vector DB)
