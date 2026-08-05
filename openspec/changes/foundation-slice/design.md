## Context

Repository is documentation-only. Foundation slice (SAD §8 track 1, Module_Boundaries §9 step 1) is first implementation pass: runnable local stack, CI-blocking ArchUnit walls, tenancy bootstrap, OIDC login, hard-walled module stubs. All governing docs exist in `docs/` and `openapi/`; this change produces both OpenSpec artifacts and the deliverable `docs/specs/01_Foundation_Spec.md`.

**Cross-doc conflict (canary chunk) — resolved.**
- SAD §2.3 / §8 track 1 and Module_Boundaries §9 step 1 require a per-tenant canary chunk seeded in foundation slice, and its "forbidden" status must be real, not assumed.
- Database_Schema §9.1 originally listed only tenancy/audit/provider tables; canary requires §9.2 ingestion tables **and** `access_policies` to persist a deny.
- **Resolution (a), extended:** pull the full canary FK chain — `collections`, `documents`, `document_versions`, `embedding_profiles`, `chunks`, `chunk_embeddings`, **and `access_policies`** — into Flyway V1. `docs/Database_Schema.md` §9.1/§9.2 have been updated in this same change to reflect this table set; there is no deferred doc-sync step. Every workspace (not just the demo tenant) gets its own canary chain, provisioned atomically with workspace creation.

**Cross-doc conflict (JIT email domain allow-list) — resolved.**
- BA §7.2.a requires a tenant-configured email-domain allow-list for JIT provisioning.
- `docs/Database_Schema.md` §2.1 `tenants` table now defines `jit_email_domains TEXT[] NOT NULL DEFAULT '{}'` alongside `idp_issuer`. This is a canonical schema edit made in this change, not an application-only convention pending future sync.

**Cross-doc conflict (worker package naming) — resolved.**
- SAD §9.2 ArchUnit rule references `worker.pipeline` and `worker.eval`.
- Module_Boundaries §2 (canonical) defines `documents.pipeline` (ingestion worker code) and `evaluation` (eval worker code), plus supporting `worker.runtime`.
- **Resolution:** use Module_Boundaries §2 package names. ArchUnit api-profile wall targets `documents.pipeline`, `evaluation`, and `worker.runtime` — not SAD's stale `worker.*` names. Mapping table below.

## Goals / Non-Goals

**Goals:**

- Single Gradle module with package tree per Module_Boundaries §2.
- Activate `.github/workflows/ci.yml` `backend-verify` with the Gradle skeleton; backend lint, dependency scan, tests, coverage verification, build, and evidence upload must be real CI gates before domain code lands.
- Separate `api` and `worker` JVMs via Spring profiles (ADR-001).
- Docker Compose: PostgreSQL 16 + pgvector, Keycloak, MinIO, backend, frontend shell.
- `shared.model` + `shared.exception` foundation VOs (Shared_Abstractions §398): `AllowedFilterSet`, `Scope`, `AuditEvent` + `AuditPayload`, `RequestContext` (api only), `DomainException` hierarchy — built before the ArchUnit walls that depend on them (filter-forgery, entity boundary).
- Flyway V1 matching Database_Schema §9.1 plus the seven-table canary FK chain with persisted deny.
- Nine ArchUnit rules as first CI deliverable (Shared_Abstractions §379–390 + Module_Boundaries §9).
- Hard-walled stubs: `policy`, `audit`, `search`, `ai.provider`.
- OIDC login, JWT validation, JIT provisioning (BA §7.2.a via canonical `jit_email_domains`), role model, fail-closed defaults.
- Foundation admin API per PRD Admin §8 bootstrap subset with OpenAPI contract, atomic canary provisioning, and in-transaction audit (PRD Admin §9).
- Test suite: ArchUnit, Testcontainers migration, integration tests per spec prompt §9.
- Canonical spec at `docs/specs/01_Foundation_Spec.md`.

**Non-Goals:**

- Document ingestion pipeline jobs (`ingestion_jobs`, `deletion_jobs`, `pending_deletes`) — slice 2. Their supporting tables (`collections`…`access_policies`) already exist from the canary pull-forward; slice 2 adds job plumbing only, not new base tables.
- Full admin CRUD (collections ACL management UI, AI policy UI, four-eyes) — slice 4. Foundation only ever writes the canary's own deny rows to `access_policies`, never user-facing ACL grants.
- Chat/RAG/evaluation modules — slices 3/5 (stub packages only, for ArchUnit targets).
- Provider registry functional CRUD — schema-only in V1; admin slice owns CRUD.
- Redis, Kafka, Kubernetes, dedicated vector DB — MVP excluded per AGENTS.md.
- RLS at DB layer — application-layer enforcement per ADR-016.

## Decisions

### D1 — Canary resolution (a): per-workspace FK chain with persisted deny

Pull exact Database_Schema definitions for: `collections`, `documents`, `document_versions`, `embedding_profiles`, `chunks`, `chunk_embeddings`, `access_policies`. For every workspace, provision one canary collection containing one synthetic document → version → chunk → embedding, using the workspace's default (active) embedding profile — the same profile slice 2's real ingestion will use, not a throwaway duplicate.

**Why per-workspace, not literally one row per tenant:** SAD §2.3 says "per-tenant canary chunk." A tenant always has ≥1 workspace by the time it is usable (bootstrap creates the workspace atomically with or immediately after the tenant). Attaching the canary to every workspace is a strict superset of "one per tenant" — it satisfies the requirement and gives finer-grained detection coverage without inventing a hidden "system workspace" concept absent from Database_Schema.

**Why `access_policies` must be pulled forward too:** "Forbidden collection" is a security claim. Without a persisted deny record, "forbidden" would mean nothing more than "no one happened to grant it yet" — indistinguishable from an oversight, and untestable as a positive fact. Seeding one `access_policies` row per workspace role (`admin`, `contributor`, `user`, `viewer`) with `scope_type='collection'`, `scope_id=<canary_collection_id>`, `action='deny'` makes forbidden-ness a real row that `policy.access` resolution actually consults, and gives the test suite something concrete to assert against. No `allow` row is ever seeded for the canary collection or document, so there is no most-specific-wins conflict to reason about.

Alternative (b) — hook-only, no row — rejected: leaves the P1 detection path untestable until slice 2 and gives "forbidden" no persisted meaning.

### D2 — ArchUnit first, CI-blocking from first commit, nine walls

The existing staged `backend-verify` block in `.github/workflows/ci.yml` is activated in the same commit that introduces the Gradle wrapper and verification tasks. Activation does not wait for domain, persistence, API, or frontend work. Before domain code lands, the job's `test` task includes all nine ArchUnit walls and blocks merge on violations.

Nine rules written before domain code lands (Module_Boundaries §9 step 1 + Shared_Abstractions §379–390):

1. Provider SDK imports only in `..ai.provider.adapter..`
2. Native/pgvector/tsvector queries only in `..search..`
3. `documents.mgmt` must not import `documents.pipeline`
4. No `api`-profile class imports `documents.pipeline`, `evaluation`, or `worker.runtime` (exact matching rule below)
5. `AllowedFilterSet` construction only inside `policy` (filter-forgery wall)
6. `audit_events` writes only inside `audit` package (audit-writer wall)
7. `@Entity` classes referenced only within owning package (entity-boundary wall)
8. `web.dto` never imported by `shared.model` or any domain package (Shared_Abstractions §306)
9. `SearchReader` called only by `rag`; `SearchWriter` called only by `documents.pipeline` (Shared_Abstractions §390)

**Exact matching rule for wall 4 (resolves prior "Spring profile annotation conditions" ambiguity).** ArchUnit cannot observe runtime `SPRING_PROFILES_ACTIVE` — it only sees compiled classes. The rule therefore uses two concrete, testable predicates, either of which is sufficient to place a class "in scope" for this wall:

- **Annotation-based:** class is annotated `@org.springframework.context.annotation.Profile` with `"api"` in its `value()` array — checked via ArchUnit's `annotatedWith(Profile.class)` plus a custom `ArchCondition` that inspects the annotation's `value()` array.
- **Package-based:** class resides in `..web..` or `..adapters.identity..` — these packages are api-profile-only by construction (the worker JVM never exposes HTTP controllers or terminates IdP-facing requests), so package membership alone is sufficient evidence without inspecting annotations.

Both predicates forbid importing `documents.pipeline`, `evaluation`, or `worker.runtime`.

### D3 — Package layout (single Gradle module, Module_Boundaries §2 canonical)

```
src/main/java/com/company/rag/
  shared/
    model/             # AllowedFilterSet, Scope, AuditEvent, AuditPayload, RequestContext
    exception/         # DomainException hierarchy
  policy/              # access + providergate sub-packages
  audit/
  search/
  ai/provider/adapter/
  documents/
    mgmt/              # api profile (ArchUnit target)
    pipeline/          # worker profile ingestion (ArchUnit target)
    connector/         # stub only in foundation
  admin/
  web/
    dto/               # controller-facing DTOs (ArchUnit-walled from domain)
  worker/runtime/      # job scheduler shell (NOT worker.pipeline)
  evaluation/          # stub package for ArchUnit (built in slice 5)
  rag/                 # stub package only
  chat/                # stub package only
  adapters/identity/
  adapters/objectstorage/
  metrics/             # stub only
```

**SAD §9.2 name mapping (stale → canonical):**

| SAD §9.2 reference | Canonical package (Module_Boundaries §2) |
|--------------------|------------------------------------------|
| `worker.pipeline` | `documents.pipeline` |
| `worker.eval` | `evaluation` |

Reference `.claude/rules/` for invariants — do not restate here.

### D4 — Spring profiles as separate JVMs

- `api` profile: REST controllers, OIDC resource server, admin reads, policy/audit/search stubs.
- `worker` profile: `worker.runtime` scheduler shell only in foundation; no pipeline jobs yet.
- Docker Compose runs two backend services from same image with different `SPRING_PROFILES_ACTIVE`.

### D5 — Permission cache: TTL ≤ 60s, LISTEN/NOTIFY, PG-direct fallback, sensitive bypass

`policy.access` caches `AllowedFilterSet` keyed by `(userId, workspaceId)` for `standard`-classified workspaces only. `restricted` and `strict` workspaces bypass cache — PG read every request (SAD §7.8). On cache miss for standard workspaces, compare `perm_cache_version`; stale → re-resolve. On LISTEN/NOTIFY drop, flush cache and resolve from PG directly (degrade, not deny).

### D6 — Audit append-only from day 1, and mandatory for every bootstrap CUD

Flyway V1 creates `audit_events` with monthly partitioning, INSERT-only role, `BEFORE UPDATE OR DELETE` trigger. `audit.record()` runs in caller transaction (ADR-005/015). ArchUnit enforces sole-writer wall. Per PRD Admin §9 ("every CUD operation … audited"), every bootstrap endpoint (tenant create, workspace create, member add, role change) calls `audit.record()` in the same transaction as its mutation — not as a best-effort side effect. A failed audit write rolls back the whole operation.

### D7 — OIDC with Keycloak local

SPA redirect flow; Spring Security OAuth2 Resource Server validates JWT. JIT per BA §7.2.a: issuer in `tenants.idp_issuer` AND email domain in `tenants.jit_email_domains`; otherwise 403. Disabled users denied even with valid JWT.

### D8 — Atomic tenant/workspace/canary provisioning (not demo-only)

Workspace creation — whether the demo seed migration or a live `POST /api/v1/admin/tenants/{tenantId}/workspaces` call — is one database transaction containing: the `workspaces` row, the full canary FK chain (collection → document → version → chunk → embedding, reusing the workspace's active `embedding_profiles` row), the canary's `access_policies` deny rows (one per workspace role), and the `workspace.created` audit event. If any part fails, the whole transaction rolls back; **no workspace can exist without a canary chain**. This generalizes what was previously only a demo-seed behavior into a structural property of workspace creation for the lifetime of the foundation slice and beyond — bootstrap-created tenants get the same guarantee as the seeded demo tenant.

### D9 — API surface (foundation bootstrap subset)

Per PRD Admin §8, defined in `openapi/admin.yaml`:

| Method | Path | Auth | Side effects (same transaction) |
|--------|------|------|----------------------------------|
| `GET` | `/api/v1/workspaces` | Authenticated user | — |
| `POST` | `/api/v1/admin/tenants` | `platform:admin` | `tenant.created` audit event |
| `POST` | `/api/v1/admin/tenants/{tenantId}/workspaces` | `platform:admin` | canary chain + deny rows + `workspace.created` audit event |
| `POST` | `/api/v1/workspaces/{workspaceId}/members` | Workspace `admin` | `membership.created` audit event |
| `PUT` | `/api/v1/workspaces/{workspaceId}/members/{userId}/role` | Workspace `admin` | `perm_cache_version` increment + `membership.role_changed` audit event |

All write endpoints require `Idempotency-Key`. All responses carry `X-Request-Id`; errors are RFC 7807 ProblemDetails.

### D10 — Frontend shell

React + TypeScript SPA: OIDC redirect login, post-login workspace list page calling `GET /api/v1/workspaces`. Design tokens per `docs/Design_System.md` — reference, do not restate.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Canary pull-forward duplicates §9.2 DDL | V1 uses exact Database_Schema DDL; `docs/Database_Schema.md` §9.1/§9.2 updated in this change so there is one source of truth, not two |
| Per-workspace canary chain adds a write to every workspace-creation request | Single extra transaction, no new infrastructure; acceptable latency cost for a correctness-critical control |
| `jit_email_domains` schema change lands with application code | Mitigated: column added to `docs/Database_Schema.md` in this same change, verified by Testcontainers migration test against the doc |
| SAD §9.2 stale package names | Documented mapping table; ArchUnit uses Module_Boundaries names exclusively |
| Keycloak/JIT complexity in local dev | Compose realm + seed users; integration test with mock JWT |
| ArchUnit false positives on test code | Scope rules to `main` sources |
| Worker profile empty in foundation | Intentional; ArchUnit walls exist before pipeline code |

## Migration Plan

1. Land Gradle skeleton and activate `.github/workflows/ci.yml` `backend-verify` with working lint, dependency scan, test, coverage, build, and evidence tasks.
2. Build `shared.model` + `shared.exception` foundation VOs (required by walls 5 and 7).
3. Land all nine ArchUnit tests (must pass on empty stubs plus the shared VOs).
4. Flyway V1 + Testcontainers migration test (§9.1 tables + seven-table canary chain + `jit_email_domains`).
5. Domain entities + repositories.
6. Module stubs + security config.
7. Update `openapi/admin.yaml` with bootstrap endpoints.
8. API endpoints (with atomic canary provisioning + in-transaction audit) + frontend shell.
9. Docker Compose integration smoke.
10. Write `docs/specs/01_Foundation_Spec.md` synthesizing all of the above.

Rollback: drop database volume; no production deployment in this slice.

## Open Questions

1. Keycloak realm export vs programmatic setup in Compose — prefer realm JSON import for reproducibility.
