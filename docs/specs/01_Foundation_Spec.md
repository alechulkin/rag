# Foundation Slice — Implementation Specification

**Slice:** `foundation-slice` (SAD §8 track 1; Module_Boundaries §9 step 1)  
**OpenSpec:** `openspec/changes/foundation-slice/`  
**Matrix rows:** FND-1..FND-8; OBS-AC1, OBS-AC7, OBS-AC8 (via audit)  
**Status:** Phase A spec — no implementation code in this document

Authoritative sources: `docs/Database_Schema.md`, `docs/Module_Boundaries.md`,
`docs/Shared_Abstractions.md`, `openapi/admin.yaml`, accepted ADRs. On conflict,
report — do not silently pick.

---

## 1. Purpose and scope

First runnable vertical slice: local Docker Compose stack, CI-blocking ArchUnit
walls, tenancy bootstrap, OIDC login, hard-walled module stubs. Ingestion,
chat, full admin CRUD, and evaluation are **out of scope** (later slices).

**In scope**

- Single Gradle module, Spring profiles `api` + `worker` as separate JVMs (ADR-001)
- Flyway V1: Database_Schema §9.1 tables + seven-table canary FK pull-forward
- Nine ArchUnit walls (written before domain code)
- Hard-walled stubs: `policy`, `audit`, `search`, `ai.provider`
- Foundation bootstrap API + React OIDC shell
- Test suite: ArchUnit, Testcontainers, integration, Playwright journey #1

**Out of scope**

- `ingestion_jobs`, `deletion_jobs`, `pending_deletes` (ingestion slice)
- Full admin CRUD, four-eyes, provider registry HTTP (admin slice)
- Chat/RAG/evaluation functional code (stub packages only for ArchUnit targets)
- Kafka, Redis-as-correctness, Kubernetes, dedicated vector DB

---

## 2. Cross-doc resolutions (already applied)

These conflicts were resolved in OpenSpec design and canonical doc edits. This
spec records them; do not re-open.

### 2.1 Canary chunk — resolution **(a), extended**

**Problem:** SAD §2.3 / §8 track 1 and Module_Boundaries §9 step 1 require a
per-tenant canary chunk with real forbidden status. Database_Schema §9.1
originally listed only tenancy/audit/provider tables.

**Resolution:** Pull minimum §9.2 tables into Flyway V1 so forbidden status is a
**persisted deny**, not absence of grants.

**FK chain (per workspace):**

```
collections
  └── documents (collection_id, workspace_id)
        └── document_versions (active version)
              └── embedding_profiles (workspace default active profile)
                    └── chunks (document_version_id, embedding_profile_id)
                          └── chunk_embeddings (1:1, HNSW-indexed)
access_policies (deny rows: scope_type=collection, action=deny, one per role)
```

**Persisted deny:** For each workspace role (`admin`, `contributor`, `user`,
`viewer`), seed one `access_policies` row: `scope_type='collection'`,
`scope_id=<canary_collection_id>`, `subject_type='role'`,
`subject_id=<role>`, `action='deny'`. No allow row for canary collection or
document. Per Database_Schema §2.4 most-specific-wins, collection-scope deny
outranks coarser workspace allows.

**Per-workspace, not per-tenant only:** Bootstrap always creates ≥1 workspace;
canary attaches to every workspace (strict superset of SAD "per-tenant").

**Atomic provisioning:** Workspace create (seed or
`POST /api/v1/admin/tenants/{tenantId}/workspaces`) is one transaction:
workspace row + full canary chain + deny rows + `workspace.created` audit.
Failure rolls back entire transaction — no workspace without canary.

Alternative **(b)** hook-only without deny rows — **rejected** (untestable,
"forbidden" not persisted).

### 2.2 JIT email domain allow-list

**Problem:** BA §7.2.a requires tenant-configured email-domain allow-list for JIT.

**Resolution:** Canonical column in `docs/Database_Schema.md` §2.1:

```sql
jit_email_domains TEXT[] NOT NULL DEFAULT '{}'
```

JIT allowed only when JWT issuer ∈ `tenants.idp_issuer` **and** email domain ∈
`tenants.jit_email_domains`. New user gets no workspace memberships until admin
grants.

### 2.3 Worker package naming (SAD §9.2 stale)

**Problem:** SAD §9.2 ArchUnit rule references `worker.pipeline` and
`worker.eval`. Module_Boundaries §2 is canonical.

**Resolution:** Use Module_Boundaries names exclusively in code and ArchUnit:

| SAD §9.2 (stale) | Canonical (Module_Boundaries §2) |
|------------------|----------------------------------|
| `worker.pipeline` | `documents.pipeline` |
| `worker.eval` | `evaluation` |

Api-profile import wall targets `documents.pipeline`, `evaluation`,
`worker.runtime` — never `worker.pipeline` / `worker.eval`.

### 2.4 Database_Schema §9.1 / §9.2 split

**Already applied in `docs/Database_Schema.md`:**

- §9.1 Foundation: §9.1 core tables **plus** canary pull-forward
  (`collections` … `access_policies`)
- §9.2 Ingestion: job plumbing only (`pending_deletes`, `ingestion_jobs`,
  `deletion_jobs`) — base document/ACL tables already exist from §9.1

---

## 3. Cross-check report (Phase A)

| Source | Check | Result |
|--------|-------|--------|
| Database_Schema §9.1 | V1 table list matches spec | **Aligned** — includes canary pull-forward + `jit_email_domains` |
| Database_Schema §9.2 | No duplicate base tables in slice 2 | **Aligned** — job tables only |
| Module_Boundaries §2 | Package tree | **Aligned** — see §4 |
| Module_Boundaries §9 step 1 | ArchUnit first, canary seed, Compose | **Aligned** |
| SAD §8 track 1 | Foundation deliverables | **Aligned** |
| SAD §9.2 line 505 | Stale `worker.pipeline`/`worker.eval` in ArchUnit rule text | **Leftover conflict** — doc not updated; implementation uses MB §2 names per §2.3 above |
| SAD §2.3 | "Per-tenant" canary wording | **Narrow interpretation** — per-workspace canary is strict superset; no doc edit required |
| openapi/admin.yaml | Bootstrap endpoints | **Gap** — only `GET /workspaces` defined; tasks 7.11 add four POST/PUT bootstrap paths (During phase) |

No silent doc patches in Phase A. SAD §9.2 stale package names and incomplete
OpenAPI are recorded for During-phase implementation.

---

## 4. Project skeleton

<!-- trace: FND-1 -->

### 4.1 Repository layout

```
build.gradle.kts
settings.gradle.kts
gradle/wrapper/
src/main/java/com/company/rag/
src/main/resources/db/migration/
src/test/java/com/company/rag/
frontend/
docker-compose.yml
```

### 4.2 Package tree (Module_Boundaries §2)

```
com.company.rag/
  shared/
    model/              # AllowedFilterSet, Scope, ProviderDecision, AuditEvent, RequestContext
    exception/          # DomainException hierarchy
  policy/
    access/             # resolvePermissions, AllowedFilterSet factory
    providergate/       # callProvider
  audit/
  search/
  ai/provider/adapter/  # package-private SDK adapters
  documents/
    mgmt/               # api profile (ArchUnit target)
    pipeline/           # worker profile (ArchUnit target; stub in foundation)
    connector/          # stub only
  admin/
  web/
    dto/                # outward DTOs — walled from domain
    controllers/        # REST controllers
  worker/runtime/       # job scheduler shell (NOT worker.pipeline)
  evaluation/           # stub for ArchUnit
  rag/                  # stub for ArchUnit
  chat/                 # stub for ArchUnit
  adapters/
    identity/
    objectstorage/      # stub only
  metrics/              # stub only
```

Reference `.claude/rules/` for invariants — not restated here.

### 4.3 Spring profiles (ADR-001)

| Profile | JVM | Scope in foundation |
|---------|-----|---------------------|
| `api` | Container 1 | REST, OAuth2 resource server, admin bootstrap, stubs |
| `worker` | Container 2 | `worker.runtime` scheduler shell only |

Cross-profile handoff: PostgreSQL job rows + object-storage keys only — never
in-memory or synchronous API→worker calls.

**Files:**

- `src/main/resources/application-api.yml`
- `src/main/resources/application-worker.yml`
- `src/main/java/com/company/rag/config/ApiProfileConfiguration.java` — `@Profile("api")`
- `src/main/java/com/company/rag/config/WorkerProfileConfiguration.java` — `@Profile("worker")`

### 4.4 Gradle and CI

**Dependencies (MVP):** Java 21, Spring Boot, Flyway, Spring Security OAuth2
Resource Server, Testcontainers, ArchUnit, pgvector JDBC.

**Same commit as Gradle wrapper:** uncomment `backend-verify` in
`.github/workflows/ci.yml`. Job runs checkstyle, SpotBugs, dependency scan,
test (incl. ArchUnit), JaCoCo verification, build.

**Same commit as `frontend/package-lock.json`:** uncomment `frontend-verify`.

### 4.5 Docker Compose

Services: PostgreSQL 16 + pgvector, Keycloak (realm JSON import), MinIO,
backend-api (`SPRING_PROFILES_ACTIVE=api`), backend-worker
(`SPRING_PROFILES_ACTIVE=worker`), frontend shell.

---

## 5. Shared value objects

Built **before** ArchUnit walls 5 and 7 depend on them (Shared_Abstractions
§398).

| VO | File | Notes |
|----|------|-------|
| `AllowedFilterSet` | `shared/model/AllowedFilterSet.java` | Package-private ctor; factory **only** in `policy.access` |
| `Scope` | `shared/model/Scope.java` | |
| `ProviderDecision` | `shared/model/ProviderDecision.java` | |
| `AuditEvent` + `AuditPayload` | `shared/model/AuditEvent.java`, `AuditPayload.java` | Typed per-event payloads |
| `RequestContext` | `shared/model/RequestContext.java` | `@RequestScope`, **api profile only** |
| `DomainException` hierarchy | `shared/exception/*.java` | |

---

## 6. ArchUnit walls (first deliverable)

<!-- trace: FND-2 -->

Nine CI-blocking rules in `src/test/java/com/company/rag/architecture/` — each
must fail on intentional violation, pass on clean tree.

| # | Test class (proposed) | Rule |
|---|----------------------|------|
| 1 | `ProviderSdkImportWallTest` | SDK imports only in `..ai.provider.adapter..` |
| 2 | `SearchQueryWallTest` | Native/pgvector/tsvector only in `..search..` |
| 3 | `DocumentsMgmtPipelineWallTest` | `documents.mgmt` must not import `documents.pipeline` |
| 4 | `ApiProfileWorkerDomainWallTest` | No api-scoped class imports `documents.pipeline`, `evaluation`, `worker.runtime`. Scope: `@Profile("api")` **or** package `..web..` / `..adapters.identity..` |
| 5 | `AllowedFilterSetForgeryWallTest` | `AllowedFilterSet` construction only in `..policy..` |
| 6 | `AuditSoleWriterWallTest` | `audit_events` writes only in `..audit..` |
| 7 | `EntityBoundaryWallTest` | `@Entity` referenced only within owning package |
| 8 | `WebDtoDependencyWallTest` | `web.dto` never imported by `shared.model` or domain packages |
| 9 | `SearchCallerWallTest` | `SearchReader` callers ⊆ `rag`; `SearchWriter` callers ⊆ `documents.pipeline` |

Scope rules to `main` sources. `./gradlew test` runs all nine via active
`backend-verify`.

---

## 7. Persistence

<!-- trace: FND-4 FND-6 FND-7 OBS-AC1 OBS-AC7 OBS-AC8 -->

### 7.1 Flyway V1 — §9.1 core tables

**File:** `src/main/resources/db/migration/V1__foundation.sql`

| Table | Schema ref |
|-------|------------|
| `tenants` | §2.1 incl. `jit_email_domains TEXT[] NOT NULL DEFAULT '{}'` |
| `workspaces` | §2.1 |
| `users` | §2.1 |
| `memberships` | §2.1 |
| `membership_capabilities` | §2.1 |
| `perm_cache_version` | §2.1 |
| `provider_configs` | §2.8 — schema only, no HTTP CRUD |
| `workspace_ai_policies` | §2.8 — schema only |
| `provider_budget_counters` | §2.8 — schema only |
| `audit_events` | §2.9 — monthly partitions |

**Audit hardening (§11 appendix):** INSERT-only role; `BEFORE UPDATE OR DELETE`
trigger on `audit_events`.

### 7.2 Flyway V1 — canary pull-forward (seven tables)

Exact DDL from Database_Schema §2.2–§2.4:

| Table | Role in chain |
|-------|---------------|
| `collections` | Canary collection per workspace |
| `documents` | Synthetic canary document |
| `document_versions` | Active version |
| `embedding_profiles` | Workspace default active profile (reused by ingestion slice) |
| `chunks` | Canary chunk content |
| `chunk_embeddings` | HNSW vector row |
| `access_policies` | Deny rows per workspace role |

**Not in V1:** `ingestion_jobs`, `deletion_jobs`, `pending_deletes`.

### 7.3 Seed data

**File:** `src/main/resources/db/migration/V2__seed_demo.sql` (or repeatable)

- Demo tenant: `idp_issuer`, `jit_email_domains`
- One workspace
- Four users: ADMIN, CONTRIBUTOR, USER, VIEWER memberships
- Full canary FK chain + one deny row per role for canary collection

### 7.4 Java domain model

**Package:** entity-per-owning-module pattern (ArchUnit wall 7)

| Entity | Package | Tenant scope |
|--------|---------|--------------|
| `TenantEntity` | `admin` | direct `tenant_id` |
| `WorkspaceEntity` | `admin` | direct |
| `UserEntity` | `admin` | via membership chain |
| `MembershipEntity` | `admin` | FK chain |
| `AuditEventEntity` | `audit` | direct |
| `CollectionEntity` | `documents.mgmt` | via workspace |
| `DocumentEntity` | `documents.mgmt` | via workspace |
| `DocumentVersionEntity` | `documents.mgmt` | via document |
| `EmbeddingProfileEntity` | `documents.mgmt` | via workspace |
| `ChunkEntity` | `search` | via document_version → document → workspace |
| `ChunkEmbeddingEntity` | `search` | via chunk |
| `AccessPolicyEntity` | `policy.access` | via workspace |

**Enums:** `src/main/java/com/company/rag/shared/model/enums/` — exact
Database_Schema values (`workspace_role`, `tenant_classification`,
`approval_status` incl. `revoked`, `user_status`, etc.).

**Repositories:** Spring Data JPA with tenant filter — direct `tenant_id`
predicate or FK-chain join per table conventions.

---

## 8. Module stubs

<!-- trace: FND-5 FND-6 FND-7 FND-8 -->

### 8.1 `policy`

| File | Interface |
|------|-----------|
| `policy/access/PermissionResolver.java` | `AllowedFilterSet resolvePermissions(userId, workspaceId, scope)` |
| `policy/access/AllowedFilterSetFactory.java` | sole constructor/factory for `AllowedFilterSet` |
| `policy/providergate/PolicyEngine.java` | `ProviderDecision callProvider(ProviderRequest)` — fail-closed default |

Cache: TTL ≤ 60s for `standard` workspaces; `restricted`/`strict` bypass
cache (PG every request). `perm_cache_version` + LISTEN/NOTIFY invalidation;
LISTEN drop → flush + PG-direct (degrade, not deny).

### 8.2 `audit`

| File | Interface |
|------|-----------|
| `audit/AuditService.java` | `void record(AuditEvent event)` — same transaction as caller |

### 8.3 `search`

| File | Interface |
|------|-----------|
| `search/SearchReader.java` | All reads require `AllowedFilterSet`; canary-check hook on every path |
| `search/SearchWriter.java` | `insertChunksAndVectors`, `deleteByDocument`, `deleteByProfile` — each requires `EmbeddingProfile` + `tenantId` + `workspaceId`; **no** `AllowedFilterSet` |

### 8.4 `ai.provider`

| File | Interface |
|------|-----------|
| `ai/provider/ProviderAdapter.java` | SPI |
| `ai/provider/adapter/LocalOpenAiCompatibleAdapter.java` | package-private stub |

Sole AI entry: `PolicyEngine.callProvider()`.

---

## 9. Security and API

<!-- trace: FND-3 FND-4 -->

### 9.1 OIDC / JWT

- Spring Security OAuth2 Resource Server (Keycloak JWT)
- Missing/invalid token → 401 RFC 7807 ProblemDetails
- JIT: issuer + domain check (§2.2)
- Disabled user → 403 even with valid JWT
- Fail-closed on ambiguous permission resolution

**Files:**

- `adapters/identity/KeycloakJwtAuthenticationConverter.java`
- `adapters/identity/JitProvisioningService.java`
- `config/SecurityConfiguration.java`

### 9.2 Bootstrap endpoints

Contract: `openapi/admin.yaml` (tasks 7.11 extend during implementation).

| Method | Path | Auth | Same-transaction side effects |
|--------|------|------|-------------------------------|
| `GET` | `/api/v1/workspaces` | Authenticated | — |
| `POST` | `/api/v1/admin/tenants` | `platform:admin` | `tenant.created` audit |
| `POST` | `/api/v1/admin/tenants/{tenantId}/workspaces` | `platform:admin` | canary chain + deny rows + `workspace.created` audit |
| `POST` | `/api/v1/workspaces/{workspaceId}/members` | workspace `admin` | `membership.created` audit |
| `PUT` | `/api/v1/workspaces/{workspaceId}/members/{userId}/role` | workspace `admin` | `perm_cache_version` increment + `membership.role_changed` audit |

All writes: `Idempotency-Key` required. All responses: `X-Request-Id`.
Errors: RFC 7807 ProblemDetails.

**Controller files (proposed):**

- `web/controllers/WorkspaceController.java` — `GET /workspaces`
- `web/controllers/admin/TenantAdminController.java` — tenant + workspace create
- `web/controllers/admin/MembershipController.java` — member add + role change

### 9.3 Frontend shell

```
frontend/
  src/
    auth/oidc.ts
    pages/LoginRedirect.tsx
    pages/WorkspaceList.tsx
  e2e/journey-01-login.spec.ts
```

OIDC redirect login; post-auth workspace list via `GET /api/v1/workspaces`.
Design tokens per `docs/Design_System.md`.

---

## 10. Test plan

<!-- trace: FND-2 FND-3 FND-5 FND-6 FND-7 OBS-AC1 OBS-AC7 OBS-AC8 -->

### 10.1 ArchUnit (§6)

Each wall: introduce violation → `./gradlew test` fails → revert → green.

### 10.2 Testcontainers migration

**File:** `src/test/java/com/company/rag/persistence/FlywayV1MigrationTest.java`

- PostgreSQL 16 + pgvector container
- Run Flyway V1+V2
- Assert §9.1 tables + seven canary tables + `jit_email_domains` match
  `docs/Database_Schema.md`
- Assert canary FK chain + deny rows per role

### 10.3 Integration tests

| Test class | Covers |
|------------|--------|
| `OidcIntegrationTest` | valid JWT, invalid JWT, disabled user, JIT domain denial |
| `PermissionCacheIntegrationTest` | NOTIFY invalidation, LISTEN drop PG fallback, restricted bypass |
| `AuditAppendOnlyIntegrationTest` | UPDATE/DELETE rejected on `audit_events` |
| `BootstrapApiIntegrationTest` | authz, Idempotency-Key, atomic canary rollback, in-transaction audit, perm_cache_version on role change |
| `CanaryDetectionIntegrationTest` | seeded canary detectable via SearchReader canary-check hook |

### 10.4 Coverage

Per `docs/qa/coverage-policy.md`: 70% aggregate; 90% for `policy`, `audit`,
`search`. Wire `jacocoTestCoverageVerification` into `./gradlew check`.

### 10.5 E2E

Playwright journey #1 (login) under `frontend/e2e/` per
`docs/qa/e2e-journeys.md`.

### 10.6 Red/green evidence (During phase)

`openspec/changes/foundation-slice/evidence/red-run.json` and
`green-run.json` — authored in Phase C, not Phase A.

---

## 11. Implementation sequence

Maps to `openspec/changes/foundation-slice/tasks.md`:

1. **This spec** (tasks 1.1–1.4) — Phase A
2. Gradle skeleton + CI activation (2.1–2.2)
3. Package tree + profiles + Compose + frontend shell (2.3–2.7)
4. Shared VOs (3.1–3.6)
5. Nine ArchUnit walls (4.1–4.10) — red/green each
6. Flyway V1 + domain + repositories (5.1–5.7)
7. Module stubs (6.1–6.6)
8. Security + bootstrap API + OpenAPI update (7.1–7.11)
9. Frontend integration (8.1–8.3)
10. Tests + verification (9.1–9.11, 10.1–10.4)

Rollback: drop database volume; no production deployment in this slice.

---

## 12. Traceability matrix (closing rows)

| Row | Spec section | Verification (During) |
|-----|--------------|----------------------|
| FND-1 | §4 | Compose smoke; `./gradlew build` |
| FND-2 | §6 | Nine ArchUnit tests red→green |
| FND-3 | §9.1 | OIDC integration tests |
| FND-4 | §7, §9.2 | Migration test + bootstrap API |
| FND-5 | §8.1 | Permission cache integration tests |
| FND-6 | §7.1, §8.2 | Audit append-only + rollback test |
| FND-7 | §2.1, §8.3 | Canary detection integration test |
| FND-8 | §8.4 | Provider SDK ArchUnit wall |
| OBS-AC1 | §7.1 | Audit INSERT-only role/trigger test |
| OBS-AC7 | §7.1 | Audit transactional coupling test |
| OBS-AC8 | §7.1 | Monthly partition existence in migration test |
