## ADDED Requirements

### Requirement: Policy module stub with resolvePermissions and callProvider

The `policy` module SHALL expose `resolvePermissions(userId, workspaceId, scope)` returning `AllowedFilterSet` and `callProvider(ProviderRequest)` with fail-closed default (deny when validation or budget store unavailable). Permission cache TTL MUST be ≤ 60 seconds with `LISTEN/NOTIFY` invalidation via `perm_cache_version` row.

#### Scenario: Permission cache invalidates on NOTIFY

- **WHEN** `perm_cache_version` is incremented and NOTIFY is received
- **THEN** cached `AllowedFilterSet` entries are flushed
- **AND** next resolve reads fresh permissions from PostgreSQL

#### Scenario: LISTEN drop falls back to PG-direct

- **WHEN** LISTEN/NOTIFY connection drops
- **THEN** policy flushes cache and resolves permissions directly from PostgreSQL without denying legitimately permitted requests

#### Scenario: Provider gate fails closed

- **WHEN** provider validation fails or budget store is unreachable
- **THEN** `callProvider` returns deny without invoking the adapter

### Requirement: Sensitive workspace cache bypass

Workspaces with classification `restricted` or `strict` MUST bypass the permission cache and resolve permissions from PostgreSQL on every request (SAD §7.8 Concern 1, BA §7.6.d). Only `standard`-classified workspaces use the ≤ 60 s TTL cache with LISTEN/NOTIFY invalidation.

#### Scenario: Restricted workspace bypasses cache

- **WHEN** `resolvePermissions` is called for a workspace with classification `restricted` or `strict`
- **THEN** permissions are read from PostgreSQL directly
- **AND** no cached `AllowedFilterSet` is returned without fresh PG read

#### Scenario: Standard workspace uses cache

- **WHEN** `resolvePermissions` is called for a workspace with classification `standard` and cache entry is fresh
- **THEN** cached `AllowedFilterSet` may be returned without PG read

### Requirement: Audit module stub with transactional record

The `audit` module SHALL expose `record(AuditEvent)` that inserts into `audit_events` within the caller's database transaction per ADR-005 and ADR-015.

#### Scenario: Audit rolls back with parent transaction

- **WHEN** caller transaction rolls back after `record()` was invoked
- **THEN** the audit row is not persisted

### Requirement: Search module stub with AllowedFilterSet on reads

The `search` module SHALL expose a `SearchReader` interface. Every read method MUST require `AllowedFilterSet`; no overload without it. A canary-check hook MUST run on every read path. `SearchReader` methods are callable only from `rag` (ArchUnit-enforced — see archunit-enforcement spec).

#### Scenario: Read without AllowedFilterSet is structurally impossible

- **WHEN** `SearchReader` public interface is inspected
- **THEN** every read method accepts `AllowedFilterSet` as a required parameter

#### Scenario: Canary detected in results triggers alert hook

- **WHEN** canary chunk appears in search results for a tenant
- **THEN** canary-check hook fires P1 alert signal

### Requirement: Search module stub with EmbeddingProfile and tenant context on writes

The `search` module SHALL expose a `SearchWriter` interface with methods `insertChunksAndVectors`, `deleteByDocument`, `deleteByProfile`. Every `SearchWriter` method MUST require both an `EmbeddingProfile` and an explicit tenant context (`tenantId` + `workspaceId`) as parameters; no overload may omit either. `SearchWriter` deliberately does **not** accept `AllowedFilterSet` — writes are a different security context from reads (Shared_Abstractions §331): write authorization comes from the caller being the ingestion pipeline operating on a specific tenant/profile, not from a resolved read-permission filter. `SearchWriter` methods are callable only from `documents.pipeline` (ArchUnit-enforced — see archunit-enforcement spec).

#### Scenario: Write without EmbeddingProfile and tenant context is structurally impossible

- **WHEN** `SearchWriter` public interface is inspected
- **THEN** every method accepts `EmbeddingProfile` and explicit tenant context (`tenantId`, `workspaceId`) as required parameters
- **AND** no method accepts `AllowedFilterSet`

#### Scenario: insertChunksAndVectors requires profile and tenant context

- **WHEN** `insertChunksAndVectors` is called
- **THEN** the call fails to compile without both `EmbeddingProfile` and tenant context arguments

### Requirement: AI provider module stub with package-private adapter

The `ai.provider` module SHALL define adapter SPI with one local OpenAI-compatible adapter stub. Adapter implementation classes MUST be package-private. Sole entry point for AI calls is `PolicyEngine.callProvider()`.

#### Scenario: Adapter class is package-private

- **WHEN** adapter implementation is compiled
- **THEN** class visibility is package-private (not public)
- **AND** no class outside `ai.provider.adapter` references the adapter directly
