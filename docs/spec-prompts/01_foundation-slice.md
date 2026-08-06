# Prompt — Foundation Slice Implementation Spec

Create `docs/specs/01_Foundation_Spec.md` — a detailed implementation
specification for the **foundation slice** (Solution_Architecture.md §8
track 1; Module_Boundaries.md §9 step 1).

Align with the already-proposed OpenSpec change
`openspec/changes/foundation-slice/` (proposal, design, delta specs, tasks).
On conflict between this prompt and the OpenSpec change, **report it** —
OpenSpec + `docs/` win over a stale prompt.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries, ArchUnit walls, or style conventions;
  reference them (`docs/Module_Boundaries.md`, `.claude/rules/`, `.cursor/rules/`).
- Scope: MVP only. No MVP-excluded infrastructure (AGENTS.md exclusion list).
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.
- Trusted loop: never mark OpenSpec tasks complete without focused verification
  (`docs/qa/verification-manifest.json` → `openspecApply`).

## Scope of this slice

Docker Compose local stack, OIDC login, tenant/workspace/role bootstrap,
hard-walled module stubs, **nine** ArchUnit rules (CI-blocking), per-workspace
canary FK chain with persisted deny (resolution **a**, extended — already
decided in OpenSpec design).

## The specification must include

1. **Project skeleton**
   - Single Gradle module layout with package tree per Module_Boundaries §2
   - Spring profiles `api` and `worker` (separate JVMs; ADR-001)
   - Activate `.github/workflows/ci.yml` `backend-verify` in the **same commit**
     as the Gradle wrapper
   - Docker Compose: PostgreSQL 16 + pgvector, Keycloak, MinIO, backend, frontend shell

2. **ArchUnit rules (written first, CI-blocking, non-deferrable) — nine walls**
   1. Provider SDK imports only inside `..ai.provider.adapter..`
   2. Native/pgvector/tsvector queries only inside `..search..`
   3. `documents.mgmt` must not import `documents.pipeline`
   4. No `api`-profile class (`@Profile("api")` OR package in `..web..` /
      `..adapters.identity..`) imports `documents.pipeline`, `evaluation`, or
      `worker.runtime` (Module_Boundaries names — **not** SAD stale
      `worker.pipeline` / `worker.eval`)
   5. `AllowedFilterSet` construction only inside `policy`
   6. `audit_events` writes only inside `audit`
   7. `@Entity` classes referenced only within owning package
   8. `web.dto` never imported by `shared.model` or domain packages
   9. `SearchReader` called only by `rag`; `SearchWriter` only by `documents.pipeline`

3. **Domain model (Database_Schema §9.1 + canary pull-forward)**
   - Java records/classes for foundation tables **plus** canary chain:
     `collections`, `documents`, `document_versions`, `embedding_profiles`,
     `chunks`, `chunk_embeddings`, `access_policies`
   - `tenants.jit_email_domains` column (canonical in Database_Schema)
   - Provider-registry tables are schema-only; functional CRUD → admin slice
   - Enums with exact Database_Schema values
   - Tenancy scoping on every tenant-owned row

4. **Persistence**
   - Flyway V1 matching Database_Schema §9.1 + seven-table canary FK chain
   - INSERT-only DB role for `audit_events` + BEFORE UPDATE/DELETE trigger
   - Monthly partitioning for `audit_events`
   - Seed data: demo tenant, workspace, users per role, full canary + deny rows

5. **Canary — resolved (a), extended** (do not re-open)
   - Per-workspace canary FK chain; forbidden = persisted `access_policies` deny
   - Provisioned atomically with every workspace create
   - Spec documents this; does not choose (b)

6. **Hard-walled module stubs**
   - `policy`: `resolvePermissions()` → `AllowedFilterSet`; `callProvider()`
     fail-closed; cache TTL ≤ 60s + LISTEN/NOTIFY + `perm_cache_version`
   - `audit`: `record(AuditEvent)` in caller transaction (ADR-005/015)
   - `search`: `SearchReader`/`SearchWriter`; AllowedFilterSet on every read;
     canary-check hook
   - `ai.provider`: adapter SPI, one local OpenAI-compatible stub, package-private

7. **API endpoints (openapi/admin.yaml + API_Contracts.md)**
   - OIDC login, JWT validation, JIT via `jit_email_domains`
   - `GET /api/v1/workspaces` + bootstrap admin endpoints
   - Idempotency-Key on writes; ProblemDetails; `X-Request-Id`
   - In-transaction audit on every bootstrap CUD

8. **Security and authorization**
   - Role model ADMIN/CONTRIBUTOR/USER/VIEWER + capability flags
   - Fail-closed defaults everywhere

9. **Test plan**
   - Nine ArchUnit walls — first deliverable; each intentionally violated once
   - Testcontainers migration test vs Database_Schema
   - Integration: OIDC, cache invalidation, audit append-only, atomic canary,
     in-transaction audit
   - Coverage per `docs/qa/coverage-policy.md`
   - Red/green evidence files under `openspec/changes/foundation-slice/evidence/`

Deliverable format: entities → migrations → module stubs → endpoints →
tests, with file-path-level layout proposals.
