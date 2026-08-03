## ADDED Requirements

### Requirement: ArchUnit tests as first deliverable

Test suite SHALL include ArchUnit tests covering all nine CI-blocking walls: provider SDK, search query, documents mgmt/pipeline, api-profile worker-domain import, AllowedFilterSet filter-forgery, audit sole-writer, entity boundary, web.dto dependency, and SearchReader/SearchWriter caller restrictions. These tests MUST pass before domain or endpoint code merges.

#### Scenario: CI runs ArchUnit on every build

- **WHEN** CI pipeline executes
- **THEN** all nine ArchUnit wall tests run and block merge on violation

### Requirement: Testcontainers PostgreSQL migration test

Test suite SHALL use Testcontainers with PostgreSQL 16 + pgvector to run Flyway V1 and verify all expected tables exist matching Database_Schema §9.1 plus the seven-table canary pull-forward chain (`collections`, `documents`, `document_versions`, `embedding_profiles`, `chunks`, `chunk_embeddings`, `access_policies`) and the canonical `tenants.jit_email_domains` column.

#### Scenario: Migration test validates table set

- **WHEN** Testcontainers migration test runs Flyway V1
- **THEN** all §9.1 tables and seven canary pull-forward tables exist
- **AND** column types, FK constraints, and `jit_email_domains` match `docs/Database_Schema.md` exactly

#### Scenario: Canary seed satisfies FK chain and persisted deny

- **WHEN** seed migration runs in Testcontainers
- **THEN** canary chunk insert succeeds with valid references through the document chain to the embedding profile
- **AND** one `access_policies` deny row exists per workspace role for the canary collection

### Requirement: OIDC token validation integration test

Integration tests SHALL verify JWT validation end-to-end: valid token accepted, invalid token rejected, disabled user denied, JIT denied for domain not on `jit_email_domains`.

#### Scenario: Integration test with valid JWT

- **WHEN** integration test sends request with valid test JWT
- **THEN** protected endpoint returns success status

#### Scenario: JIT denied for domain not on allow-list

- **WHEN** integration test authenticates unknown user with issuer match but domain not in `jit_email_domains`
- **THEN** response is 403

### Requirement: Permission cache integration tests

Integration tests SHALL verify: (1) NOTIFY invalidation, (2) LISTEN drop PG-direct fallback, (3) restricted/strict workspace cache bypass.

#### Scenario: NOTIFY triggers cache flush

- **WHEN** perm_cache_version increments and NOTIFY fires
- **THEN** subsequent permission resolve for standard workspace reads updated data

#### Scenario: LISTEN drop uses PG-direct fallback

- **WHEN** LISTEN connection drops during test
- **THEN** permissions resolve from PostgreSQL directly
- **AND** legitimately permitted request is not denied due to cache infra failure

#### Scenario: Restricted workspace bypasses cache

- **WHEN** integration test resolves permissions for restricted-classified workspace twice within 60 s
- **THEN** both calls read from PostgreSQL (no stale cache hit)

### Requirement: Audit append-only integration test

Integration tests SHALL verify UPDATE and DELETE on `audit_events` are rejected at database level for application role.

#### Scenario: Audit UPDATE rejected

- **WHEN** test attempts UPDATE on audit_events as app role
- **THEN** PostgreSQL rejects the operation

### Requirement: Bootstrap API integration tests including atomic canary and in-transaction audit

Integration tests SHALL verify bootstrap endpoints: authorization enforcement, Idempotency-Key deduplication, `perm_cache_version` increment on role change, atomic canary-chain provisioning on workspace creation, and in-transaction audit recording for every bootstrap CUD operation.

#### Scenario: Idempotent tenant creation

- **WHEN** same Idempotency-Key sent twice to POST /api/v1/admin/tenants
- **THEN** only one tenant row exists

#### Scenario: Role change invalidates permission cache

- **WHEN** PUT /api/v1/workspaces/{workspaceId}/members/{userId}/role succeeds
- **THEN** perm_cache_version increments

#### Scenario: Workspace creation without canary chain is impossible

- **WHEN** integration test forces canary-provisioning failure mid-transaction during POST /api/v1/admin/tenants/{tenantId}/workspaces
- **THEN** the entire transaction rolls back and no workspace row is left behind

#### Scenario: Bootstrap mutation and audit event commit together

- **WHEN** any bootstrap CUD endpoint succeeds
- **THEN** the corresponding audit event row exists in the same committed transaction as the mutation

### Requirement: Canary detection test resolution a

Because canary resolution **(a)** was chosen, tests SHALL verify canary chunk is seeded with full FK chain and persisted deny rows, and is detectable by `search` canary-check hook.

#### Scenario: Canary chunk seeded and detectable

- **WHEN** foundation test suite runs canary check against seeded data
- **THEN** canary chunk exists in a collection with persisted deny rows for every workspace role
- **AND** search canary-check hook detects it when present in result set

#### Scenario: Canary check hook present on read path

- **WHEN** SearchReader read method executes
- **THEN** canary-check hook runs even when returning empty results
