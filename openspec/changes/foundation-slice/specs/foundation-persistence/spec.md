## ADDED Requirements

<!-- trace: FND-4 FND-6 FND-7 OBS-AC1 OBS-AC7 OBS-AC8 -->

### Requirement: Flyway V1 foundation tables

Flyway migration V1 SHALL create all tables defined in Database_Schema §9.1 exactly: `tenants`, `workspaces`, `users`, `memberships`, `membership_capabilities`, `perm_cache_version`, `provider_configs`, `workspace_ai_policies`, `provider_budget_counters`, `audit_events`.

#### Scenario: V1 migration creates §9.1 tables

- **WHEN** Flyway V1 runs against empty PostgreSQL
- **THEN** all §9.1 tables exist with columns, types, indexes, and constraints matching Database_Schema
- **AND** no §9.2 tables beyond canary pull-forward (see canary requirement) are created

### Requirement: JIT email domain allow-list is a canonical schema column

`docs/Database_Schema.md` §2.1 `tenants` table now defines `jit_email_domains TEXT[] NOT NULL DEFAULT '{}'` alongside `idp_issuer`, added in this same change (not a pending follow-up). Flyway V1 SHALL create `tenants` with this column exactly as documented. JIT provisioning MUST check JWT issuer against `idp_issuer` AND email domain against `jit_email_domains`.

#### Scenario: Canonical schema and migration agree

- **WHEN** Flyway V1's `tenants` DDL is diffed against `docs/Database_Schema.md` §2.1
- **THEN** the `jit_email_domains TEXT[] NOT NULL DEFAULT '{}'` column is present and identical in both
- **AND** no other schema doc references a different JIT allow-list mechanism

#### Scenario: JIT allowed when domain on tenant allow-list

- **WHEN** unknown user authenticates with issuer in `tenants.idp_issuer` and email domain in `tenants.jit_email_domains`
- **THEN** user record is created

#### Scenario: JIT denied when domain not on allow-list

- **WHEN** unknown user authenticates with valid issuer but email domain not in `tenants.jit_email_domains`
- **THEN** provisioning is denied with 403

### Requirement: Canary table pull-forward resolution a with persisted deny

Flyway V1 SHALL pull forward the minimum ingestion and access-control tables required for a seeded, **structurally forbidden** canary chunk. Resolution **(a)** per spec prompt §5, extended to include `access_policies` so "forbidden" is a persisted, testable fact rather than an assumed absence of grants.

**Minimum canary DDL set (exact Database_Schema definitions):**

| Table | FK chain role |
|-------|---------------|
| `collections` | Canary collection, one per workspace |
| `documents` | Synthetic canary document (`collection_id`, `workspace_id`) |
| `document_versions` | Active version row for canary document |
| `embedding_profiles` | Workspace's default active profile (canary chunk's embedding profile; reused by slice 2, not duplicated) |
| `chunks` | Canary chunk content (`document_version_id`, `embedding_profile_id`) |
| `chunk_embeddings` | HNSW-indexed vector row (1:1 with chunk) |
| `access_policies` | Explicit **deny** rows making the canary collection unreachable — the persisted forbidding mechanism |

V1 MUST NOT create other §9.2 tables (`ingestion_jobs`, `deletion_jobs`, `pending_deletes`) in foundation slice.

**Persisted-deny mechanism:** for each workspace role present at seed time (`admin`, `contributor`, `user`, `viewer`), Flyway seed inserts one `access_policies` row: `scope_type='collection'`, `scope_id=<canary_collection_id>`, `subject_type='role'`, `subject_id=<role>`, `action='deny'`. Per Database_Schema §2.4 resolution rule ("most-specific wins; explicit deny beats explicit allow"), this collection-scope deny outranks any coarser workspace-scope allow for every role, and no allow policy referencing the canary collection or its document is ever seeded. `search`'s live canary-check is therefore backed by a real, queryable deny record — not an assumption that absence of a grant equals denial.

#### Scenario: Canary FK chain validates

- **WHEN** Flyway V1 completes
- **THEN** all seven canary tables exist with FK constraints satisfied
- **AND** seed inserts succeed without FK violations

#### Scenario: Canary collection has persisted deny for every role

- **WHEN** the seeded `access_policies` rows for the canary collection are queried
- **THEN** exactly one `deny` row exists per workspace role defined at seed time
- **AND** no `allow` row exists anywhere referencing the canary collection or canary document

#### Scenario: Canary chunk seeded per workspace

- **WHEN** local stack starts with seed data
- **THEN** every workspace has exactly one canary chunk in its own forbidden collection
- **AND** `search` canary-check can detect the chunk if it ever appears in results despite the persisted deny

### Requirement: Domain model for foundation entities

Java records or classes SHALL model all §9.1 entities plus canary-related entities. Enums MUST use exact values from Database_Schema: `workspace_role` (admin, contributor, user, viewer), `tenant_classification` tiers (standard, restricted, strict), `approval_status` including `revoked`, and all other §9.1 enums.

#### Scenario: Enum values match schema

- **WHEN** Java enum definitions are compared to Database_Schema enum types
- **THEN** every enum constant matches exactly with no additions or omissions

### Requirement: Tenancy scoping on tenant-owned rows

Every tenant-owned entity SHALL carry `tenant_id`, either directly as a column or through the canonical FK chain to a row that does (e.g., `chunks` → `document_versions` → `documents` → `workspaces.tenant_id`). Repository queries MUST filter by tenant context using whichever path Database_Schema defines for that table — a direct `tenant_id` predicate where the column exists, or a join through the FK chain where it does not.

#### Scenario: Repository query includes tenant filter

- **WHEN** any repository reads or writes a tenant-owned row
- **THEN** the query includes a tenant isolation predicate, applied directly or through the canonical FK chain, per Database_Schema conventions

### Requirement: Audit append-only enforcement

Flyway V1 SHALL create `audit_events` with monthly partitioning, an INSERT-only DB role (`REVOKE UPDATE, DELETE ON audit_events`), and a `BEFORE UPDATE OR DELETE` trigger rejecting mutations.

#### Scenario: Audit UPDATE rejected at database level

- **WHEN** application role attempts UPDATE or DELETE on `audit_events`
- **THEN** PostgreSQL rejects the operation via role privilege or trigger

### Requirement: Provider registry schema-only

`provider_configs`, `workspace_ai_policies`, and `provider_budget_counters` tables SHALL exist in V1 with schema matching Database_Schema. Functional CRUD for provider registry MUST NOT be implemented in foundation slice; that belongs to admin slice (prompt 04).

#### Scenario: Provider tables exist without CRUD endpoints

- **WHEN** foundation slice is complete
- **THEN** provider registry tables exist in the database
- **AND** no HTTP CRUD endpoints for provider configuration are exposed

### Requirement: Seed data and atomic tenant/workspace canary provisioning

Flyway seed (V1 or repeatable migration) SHALL insert demo tenant (with `idp_issuer` and `jit_email_domains`), workspace, four users (ADMIN/CONTRIBUTOR/USER/VIEWER), active memberships, and the full canary chain including persisted deny rows.

This is a specific instance of a general rule (see `foundation-auth-api` bootstrap requirement): **every** workspace — demo-seeded or created later through the bootstrap API — MUST have its canary chain provisioned atomically, in the same transaction as workspace creation. Canary provisioning is not a one-off demo fixture; it is a structural side effect of workspace creation for the lifetime of the foundation slice and beyond.

#### Scenario: Demo users can authenticate with seeded roles

- **WHEN** local stack starts with seed data
- **THEN** four demo users exist with distinct workspace roles
- **AND** the demo workspace's canary chunk exists with valid FK chain and persisted deny rows

#### Scenario: Every workspace has exactly one canary chain

- **WHEN** any workspace exists in the database, whether seeded or created via the bootstrap API
- **THEN** exactly one canary collection with a full FK chain and persisted deny rows exists for that workspace
