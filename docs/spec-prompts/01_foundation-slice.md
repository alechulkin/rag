# Prompt — Foundation Slice Implementation Spec

Create `docs/specs/01_Foundation_Spec.md` — a detailed implementation
specification for the **foundation slice** (Solution_Architecture.md §8
track 1; Module_Boundaries.md §9 step 1).

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries, ArchUnit walls, or style conventions;
  reference them (`docs/Module_Boundaries.md`, `.claude/rules/`, `.cursor/rules/`).
- Scope: MVP only. No MVP-excluded infrastructure (AGENTS.md exclusion list).
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

Docker Compose local stack, OIDC login, tenant/workspace/role bootstrap,
hard-walled module stubs, all ArchUnit rules, canary deployment (see
conflict resolution below).

## The specification must include

1. **Project skeleton**
   - Single Gradle module layout with package tree per Module_Boundaries §2
   - Spring profiles `api` and `worker` (separate JVMs; ADR-001)
   - Docker Compose: PostgreSQL 16 + pgvector, Keycloak, MinIO, backend, frontend shell

2. **ArchUnit rules (written first, CI-blocking, non-deferrable)**
   - Provider SDK imports only inside `ai.provider.adapter` (SAD §2.3)
   - Native/pgvector/tsvector queries only inside `search`
   - `documents.mgmt` must not import `documents.pipeline` (SAD §9.2) —
     written now even though `documents` is built in slice 2
   - No `api`-profile class imports `worker.pipeline` / `worker.eval` packages

3. **Domain model (foundation tables only — Database_Schema §9.1)**
   - Java records/classes for: tenants, workspaces, users, memberships,
     membership_capabilities, perm_cache_version, provider_configs,
     workspace_ai_policies, provider_budget_counters, audit_events
   - Provider-registry tables are schema-only in this slice; functional CRUD
     belongs to the admin slice (prompt 04)
   - Enums with exact values from Database_Schema (roles, classification
     tiers, approval_status incl. `revoked`)
   - Tenancy scoping on every tenant-owned row

4. **Persistence**
   - Flyway migration V1 matching Database_Schema §9.1 exactly (do not
     pull §9.2 tables unless canary resolution (a) below is chosen)
   - INSERT-only DB role for `audit_events` + BEFORE UPDATE/DELETE trigger
   - Monthly partitioning for `audit_events`
   - Seed data: demo tenant, workspace, users per role

5. **Known cross-doc conflict — canary chunk (must resolve in spec)**
   - SAD §2.3 / §8 track 1: per-tenant canary chunk in a forbidden
     collection, deployed in foundation (not deferred)
   - Database_Schema §9.1: does **not** create `collections`, `chunks`, or
     `chunk_embeddings` (those are §9.2 ingestion)
   - The generated spec must **choose one resolution and document it**:
     - **(a)** Pull minimum `collections` + `chunks` + `chunk_embeddings`
       into V1; seed canary row; `search` canary-check is live in foundation
     - **(b)** Ship `search` canary-check hook in foundation only; seed the
       actual canary row in ingestion slice V2 (prompt 02)
   - Do not silently assume either option

6. **Hard-walled module stubs**
   - `policy`: `resolvePermissions()` returning `AllowedFilterSet`;
     `callProvider()` signature with fail-closed default; permission cache
     (TTL ≤ 60s, `LISTEN/NOTIFY` invalidation, `perm_cache_version` row)
   - `audit`: `record(AuditEvent)` in caller's transaction (ADR-005/015)
   - `search`: `SearchReader`/`SearchWriter` interfaces requiring
     `AllowedFilterSet` on every read; canary-check hook
   - `ai.provider`: adapter SPI, one local OpenAI-compatible adapter stub,
     package-private adapter classes

7. **API endpoints (from openapi/admin.yaml + API_Contracts.md)**
   - OIDC login flow (SPA redirect, JWT validation, Spring Security OAuth2
     Resource Server)
   - `GET /api/v1/workspaces` (cursor pagination)
   - Bootstrap endpoints needed for tenant/workspace/role setup
   - Java records for request/response; ProblemDetails errors with exact
     status codes; `X-Request-Id` on every response

8. **Security and authorization**
   - JWT validation, JIT provisioning rules (BA §7.2.a), disabled-user denial
   - Role model: ADMIN / CONTRIBUTOR / USER / VIEWER + capability flags
   - Fail-closed defaults everywhere

9. **Test plan**
   - ArchUnit tests (the four walls) — first deliverable
   - Testcontainers: PostgreSQL + pgvector migration test; V1 tables match
     §9.1 (+ any tables pulled forward per canary resolution)
   - Integration: OIDC token validation, permission cache invalidation on
     `LISTEN/NOTIFY` drop (flush + PG-direct fallback), audit append-only
     enforcement (UPDATE/DELETE rejected)
   - Canary: if resolution (a), canary seeded and detectable by
     `search` canary-check; if (b), canary-check hook present but no row
     until ingestion slice

Deliverable format: entities → migrations → module stubs → endpoints →
tests, with file-path-level layout proposals.
