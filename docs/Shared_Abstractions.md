# Shared Abstractions — AI Knowledge Assistant for FinTech Engineering Teams

**Status:** Draft v1.1 (post self-critique)
**Author:** Solution Architect
**Source inputs:** [docs/Module_Boundaries.md](Module_Boundaries.md), [docs/Solution_Architecture.md](Solution_Architecture.md), [docs/prd/](prd/), [docs/BRD.md](BRD.md)
**Date:** 2026-06-19

> **Scope.** This document defines which domain abstractions cross package boundaries (shared) vs stay internal (module-private), their invariants, mapping layers, and naming conventions. Grounded in the 9-package model from [Module_Boundaries.md](Module_Boundaries.md) v2.1. No code exists yet — this is a pre-build abstraction design.

> **Process-boundary rule (critical).** The `api` and `worker` Spring profiles run in **separate JVMs** (SAD §9.2). Any handoff between them is **durable state only**: PostgreSQL rows + object-storage keys. No in-memory object, `Supplier<InputStream>`, or request-scoped `ThreadLocal` crosses that wall. Abstractions marked "in-process only" must not appear on cross-process paths.

---

## 1. Shared Abstractions

These cross at least one package boundary. Shared = imported by 2+ packages. Each is a **value object or read-only interface** — never a mutable JPA entity. **Seven shared VOs** (S01–S07). Expected failures use **exception hierarchy**, not a shared `Result` type.

### v1.1 corrections (from self-critique)

| v1 issue | v1.1 fix |
|---|---|
| `AnswerDiagnostics` shared fat DTO | Private in `rag`; projections `DiagnosticRef`, `RetrievalTrace`, `DiagnosticsView` |
| `DomainResult<T>` undecided | Dropped; `DomainException` hierarchy + `@ExceptionHandler` |
| `TenantContext` ThreadLocal on worker | `RequestContext` api-only; `WorkerJobContext` explicit on worker |
| `DocumentSourceItem` with stream handle | Api in-process only; worker uses `ingestion_jobs` + object-storage key |
| `prompts` as shared package | `PromptRegistry` in `rag` at MVP |
| `SearchReader`/`Writer` sold as bugfix | Reframed as intentional design split |

### S01 — `AllowedFilterSet`

| Aspect | Detail |
|---|---|
| **Purpose** | Encodes the pre-resolved permission filter `(tenantId, workspaceId, allowedCollectionIds, allowedDocumentIds, deniedDocumentIds)` that every retrieval path must use. The structural guarantee against unauthorized chunk access. |
| **Owner** | `policy.access` (produces it). |
| **Consumers** | `rag` (passes to `search`), `search` (interprets into SQL WHERE). |
| **Fields** | `tenantId: UUID`, `workspaceId: UUID`, `allowedCollectionIds: Set<UUID>`, `explicitDocGrantIds: Set<UUID>`, `explicitDocDenyIds: Set<UUID>`, `workspaceClassification: Classification`. Immutable record. |
| **Invariants** | Never empty — at minimum `tenantId` + `workspaceId` are set. `explicitDocDenyIds` takes precedence over `allowedCollectionIds`. No overload of `search` methods may omit this parameter (ArchUnit-enforced, SAD §2.3). |
| **Lifecycle** | Created per-request by `policy.access.resolvePermissions()`. Garbage-collected after request. Never persisted. |
| **Serialization** | None. In-process value object only. Never crosses the wire. |
| **Security sensitivity** | **High.** Defines the security perimeter of a retrieval. A malformed instance = data leak. Must be constructed only by `policy.access` — no public constructor, factory method inside `policy` package only. |
| **Versioning risk** | Low. Schema follows ACL model, which changes rarely. If ABAC is added, fields extend (never remove). |

### S02 — `ProviderDecision`

| Aspect | Detail |
|---|---|
| **Purpose** | Result of pre-call provider validation. Carries allow/deny + reason for fail-closed audit. |
| **Owner** | `policy.providergate` (produces it). |
| **Consumers** | `rag`, `documents.pipeline`, `evaluation` (via `policy.callProvider()`), `audit` (deny reason logged). |
| **Fields** | `allowed: boolean`, `denyReason: String` (null if allowed), `provider: String`, `region: String`, `validatedAt: Instant`. Immutable record. |
| **Invariants** | `allowed == false` ⟹ `denyReason != null`. `allowed == true` ⟹ `denyReason == null`. |
| **Lifecycle** | Created per-AI-call. Garbage-collected. Never persisted (the audit event records the relevant fields). |
| **Serialization** | None. Internal. |
| **Security sensitivity** | Medium. Deny reason may contain policy details — never exposed in API responses, only in audit. |
| **Versioning risk** | Low. Extends if new validation dimensions are added (e.g., content classification). |

### S03 — `EmbeddingProfile`

| Aspect | Detail |
|---|---|
| **Purpose** | Keys an index family: `(provider, model, dimensions, normalization)`. Enables zero-downtime embedding model migration. |
| **Owner** | `ai.provider` (defines the type). |
| **Consumers** | `documents.pipeline` (writes chunks keyed by profile), `search` (queries against active profile), `documents.mgmt` (delete propagation across profiles). |
| **Fields** | `profileId: UUID`, `provider: String`, `model: String`, `dimensions: int`, `normalization: String`, `status: enum(BUILDING, ACTIVE, DEPRECATED)`, `createdAt: Instant`, `activatedAt: Instant?`. |
| **Invariants** | Exactly one profile is `ACTIVE` per `(tenant, workspace)` at any time. `BUILDING` profiles receive writes but not search queries. `dimensions` is immutable after creation. |
| **Lifecycle** | Created on embedding-model change → `BUILDING` → `ACTIVE` on cutover → `DEPRECATED` when replaced. |
| **Serialization** | Persisted as DB row. Referenced by FK on `chunks`, `embeddings`, `vector_index`. |
| **Security sensitivity** | Low. No user data. |
| **Versioning risk** | Medium. Adding a new embedding provider may require new fields (e.g., `maxInputTokens`). Extend-only. |

### S04 — `DocumentSourceItem` (in-process only)

| Aspect | Detail |
|---|---|
| **Purpose** | Normalized ingestion entry **within the `api` JVM** during upload validation. Connectors produce these; `documents.mgmt` consumes them to persist metadata and write bytes to object storage. Decouples source format from upload logic. |
| **Owner** | `documents.connector` (defines the contract). |
| **Consumers** | `documents.mgmt` only (same JVM, upload path). **Not** passed to `documents.pipeline` — the worker reads from object storage + `ingestion_jobs` row instead. |
| **Fields** | `sourceUrl: String?`, `owner: String?`, `lastModified: Instant?`, `versionTag: String?`, `contentHash: String`, `sourceType: enum(UPLOAD, FOLDER_IMPORT, ...)`, `mimeType: String`, `sizeBytes: long`, `bytes: byte[]` or `tempPath: Path` (in-process only — consumed before upload ack returns). |
| **Invariants** | `contentHash` computed before handoff. `mimeType` validated. `sizeBytes > 0`. **No live stream handles** — bytes written to object storage synchronously on the api path; worker never receives this object. |
| **Lifecycle** | Created by connector on api → `documents.mgmt` writes to pending-av object-storage key + inserts `document` + `ingestion_job` rows → discarded. Worker picks up via `ingestion_job_id` + `object_storage_key` from DB. |
| **Serialization** | **Does not cross process boundary.** Cross-process handoff = `IngestionJob` entity fields (`documentId`, `objectStorageKey`, `tenantId`, `workspaceId`). |
| **Security sensitivity** | Medium. File bytes in memory briefly on api. Never logged. |
| **Versioning risk** | Medium. New connectors add `sourceType` enum values. Extend-only. |

### S05 — `RagResult`

| Aspect | Detail |
|---|---|
| **Purpose** | Output of `rag.executeRag()`. Clean interface between `rag` and callers (`chat`, `evaluation`). |
| **Owner** | `rag` (produces it). |
| **Consumers** | `chat` (streaming path), `evaluation` (collect path). |
| **Fields** | Two shapes via factory methods: **`RagResult.streamed`**: `tokenStream: Flux<String>`, `citations`, `diagnosticId: UUID`, `refusal`, `refusalReason`. **`RagResult.completed`**: `fullAnswer: String`, `citations`, `diagnosticId`, `refusal`, `refusalReason`. Both carry `diagnosticId` only — not the full diagnostics record (see §2 `AnswerDiagnostics`). |
| **Invariants** | `refusal == true` ⟹ empty citations, refusal template in stream or `fullAnswer`. `diagnosticId` always present. |
| **Lifecycle** | Created per RAG execution. Stream consumed once (chat). `completed` used by evaluation. Full diagnostics persisted inside `rag` before return. |
| **Serialization** | `streamed` → SSE via `web`. `completed` → in-process only. |
| **Security sensitivity** | High. Answer text + citation metadata. Never logged in full. |
| **Versioning risk** | Medium. New metadata goes on diagnostics record, not on `RagResult` itself. |

### S06 — `AuditEvent`

| Aspect | Detail |
|---|---|
| **Purpose** | Immutable record of a security/compliance-relevant action. Sole write path via `audit` module. |
| **Owner** | `audit` (defines schema, enforces append-only). |
| **Consumers** | Every module (produces events via `audit.record()`), `web` (audit viewer), `admin` (export). |
| **Fields** | `eventId: UUID`, `eventType: String`, `actorUserId: UUID`, `actorRole: String`, `tenantId: UUID`, `workspaceId: UUID`, `subjectType: String`, `subjectId: UUID?`, `payload: AuditPayload` (typed, serializes to JSON), `severity: enum`, `timestamp: Instant`, `ip: String`, `userAgentHash: String`. AI-call payloads add: `provider`, `region`, `model`, `promptVersion`, `chunkIds[]`, `citedChunkIds[]`, `tokenUsage`, `crossBorderFlag`. |
| **Invariants** | `eventId` globally unique. `timestamp` server-generated, never caller-supplied. `payload` content-minimized. INSERT-only — `UPDATE`/`DELETE` rejected by trigger + revoked grants. |
| **Lifecycle** | Created transactionally with the action it records (rolls back together). Immutable. Partitioned monthly. Detached after retention (1 year default). |
| **Serialization** | Persisted as DB row. Exported as NDJSON by Platform Admin. |
| **Security sensitivity** | **Critical.** Compliance trail. |
| **Versioning risk** | Low for structure (`AuditPayload` subtypes absorb new event types). High for `eventType` vocabulary. |

### S07 — `Scope`

| Aspect | Detail |
|---|---|
| **Purpose** | Target boundary for search/chat/eval: workspace-wide, collections, or single document. |
| **Owner** | `shared.model`. |
| **Consumers** | `rag`, `chat`, `evaluation`, `web`, `policy.access`. |
| **Fields** | `workspaceId: UUID`, `collectionIds: Set<UUID>?` (null = workspace-wide), `documentId: UUID?`. |
| **Invariants** | `workspaceId` always set. If `documentId` set, `collectionIds` ignored. Golden questions store scope fields inline; `Scope.of(goldenQuestion)` factory reconstructs at eval time. |
| **Lifecycle** | Per request. Immutable. |
| **Serialization** | Deserialized from REST request body. |
| **Security sensitivity** | Low. IDs only. |
| **Versioning risk** | Low. |

### Expected failures — domain exception hierarchy (MVP, not a shared Result type)

| Aspect | Detail |
|---|---|
| **Decision** | **No `DomainResult<T>` at MVP.** Use checked exception hierarchy for expected failures; unchecked for infrastructure faults. |
| **Owner** | `shared.exception` (base). Subclasses in owning package. |
| **Types** | `DomainException` (abstract: `code`, `message`). `PermissionDeniedException`, `ProviderDeniedException`, `BudgetExhaustedException` (`policy`); `DocumentNotFoundException`, `AvBlockedException` (`documents`); `StaleEvalCaseException` (`evaluation`). |
| **Mapping** | `web.GlobalExceptionHandler` → HTTP status + `ErrorResponse` DTO. |
| **Revisit trigger** | Reconsider result-type if error-as-value dominates service APIs at production scale. |

---

These stay inside one package. Other packages interact with them only through the owning module's public interface. Never imported across a package boundary.

| Abstraction | Owner | Why private |
|---|---|---|
| **`Document`** (JPA entity) | `documents.mgmt` | Mutable, ORM-coupled. Other modules get IDs or read-only projections, never the entity. |
| **`DocumentVersion`** (JPA entity) | `documents.mgmt` | Mutable, version-cutover logic is internal. |
| **`Chunk`** (JPA entity) | `documents.pipeline` / `search` | Written by pipeline, queried by search. Both hard-walled. Other modules reference chunks by `chunkId: UUID` only. |
| **`Embedding`** (JPA entity) | `documents.pipeline` / `search` | Same as Chunk. Vector data never leaves `search`/`pipeline`. |
| **`VectorIndexEntry`** (JPA entity) | `search` | Internal index structure. |
| **`IngestionJob`** (JPA entity) | `documents.pipeline` + `worker.runtime` | Mutable job state. Other modules see job status via `documents.mgmt` read-only projection. |
| **`ChatConversation`** (JPA entity) | `chat` | Mutable conversation state. `rag` has no concept of conversations. |
| **`ChatMessage`** (JPA entity) | `chat` | Mutable (content retention purge). |
| **`Feedback`** (JPA entity) | `chat` | 24h lock lifecycle is internal. `evaluation` sees feedback via a read-only projection for promotion. |
| **`GoldenQuestion`** (JPA entity) | `evaluation` | Stale/disabled lifecycle is internal. |
| **`EvaluationSuite`** / `EvalRun` / `EvalResult` | `evaluation` | Internal domain model. Other modules don't need these. |
| **`Tenant`** / `Workspace`/ `User` / `Membership` (JPA entities) | `admin` | Mutable CRUD entities. Other modules read via `policy` (permissions) or via read-only projections. |
| **`AccessPolicy`** (JPA entity) | `admin` (stored), `policy.access` (read for resolution) | Written by `admin`, read by `policy`. Policy reads via a repository interface, not by importing the entity directly. `policy` gets `AccessPolicyRow` projections. |
| **`WorkspaceAIPolicy`** (JPA entity) | `admin` | Mutable config. `policy.providergate` reads via projection. |
| **`ProviderConfig`** (JPA entity) | `admin` | Mutable registry. `ai.provider` reads via projection. |
| **Provider SDK response objects** | `ai.provider` (package-private adapters) | SDK-specific. Normalized to `EmbeddingResult` / `ChatCompletionChunk` internal types before leaving the adapter. Never leak outside `ai.provider`. |
| **`ParsedDocument`** (internal) | `documents.pipeline` | Intermediate parse result. Contains extracted text, page boundaries, headings. Consumed by chunker. Never crosses package boundary. |
| **`ChunkingResult`** (internal) | `documents.pipeline` | List of raw chunk texts + metadata before embedding. Internal to pipeline. |
| **`BudgetCounter`** (internal) | `policy.providergate` | Mutable per-`(tenant, period)` token counter. Written after each provider call. Other modules never see it. |
| **`PermissionCacheEntry`** (internal) | `policy.access` | TTL-cached resolved permissions. Internal cache structure. |
| **`NotificationDelivery`** (JPA entity) | `admin` (NotificationService) | Retry/delivery state. Internal. |
| **`AnswerDiagnostics`** (entity / full record) | `rag` | **Private.** 15+ fields, high churn. Other modules use narrow projections (below), not the full record. |
| **`DiagnosticsView`** (projection) | `rag` (produces), `web` (consumes) | Read API for "Why this answer?" — latency, model, prompt version, chunk IDs. Mapped from entity inside `rag`. |
| **`RetrievalTrace`** (projection) | `rag` (produces), `evaluation` (consumes) | `retrievedChunkIds`, `citedChunkIds`, `refusal` — oracle input only. |
| **`DiagnosticRef`** (projection) | `rag` (produces), `chat` (consumes) | `diagnosticId: UUID` only — `chat` links message → diagnostics row. |
| **`PromptTemplate`** (internal) | `prompts` or `rag` | Loaded from classpath at MVP. **Not a shared cross-package type** — `rag` and `evaluation` call `PromptRegistry.get(family, version)` and receive `String` template body + version string. Extract `prompts` package when template count > 3 or runtime editing lands. |
| **`MetricAggregate`** (internal) | `metrics` | Rolling aggregation buckets. Internal to metrics infra. |
| **`WorkerJobContext`** (value object) | `worker.runtime` | `tenantId`, `workspaceId`, `jobId`, `jobType` — **explicit** on every worker dispatch. Never implicit ThreadLocal. |

**Boundary rules:**

1. **JPA entities** stay private to owning package. Cross-module = IDs, projections, or shared VOs (§1).
2. **Prefer projections** over sharing fat records (`AnswerDiagnostics` → `DiagnosticRef` / `RetrievalTrace` / `DiagnosticsView`).
3. **Exception — stable read-only reference data:** immutable records like `ProviderCapabilities` may be returned without a separate mapper if 1:1 snapshot and entity never mutated after load. Still no `@Entity` import outside owning package.
4. **Api ↔ worker handoff** = DB row + object-storage key only (see process-boundary rule at top).
5. **Tenant identity:** **api** = optional `RequestContext` (`@RequestScope`: `tenantId`, `workspaceId`, `userId`) set by auth filter. **worker** = `tenantId`/`workspaceId` from `WorkerJobContext` / job row every time — no request scope, no ThreadLocal.

---

## 3. Invariants Table

| Abstraction | Invariant | Enforcement |
|---|---|---|
| `AllowedFilterSet` | Never constructed outside `policy` | Package-private constructor; factory in `policy.access` |
| `AllowedFilterSet` | `tenantId` + `workspaceId` always non-null | Constructor validation (`Objects.requireNonNull`) |
| `AllowedFilterSet` | Deny takes precedence over allow | Encoded in `search` SQL generation: `AND doc_id NOT IN (denySet)` |
| `ProviderDecision` | `denied ⟹ reason ≠ null` | Constructor validation |
| `EmbeddingProfile` | Exactly one ACTIVE per (tenant, workspace) | DB unique constraint on `(tenant_id, workspace_id)` where `status = 'ACTIVE'` |
| `EmbeddingProfile` | `dimensions` immutable | No setter; DB trigger or app check on UPDATE |
| `DocumentSourceItem` | Never crosses api→worker JVM | No stream/handle fields; worker reads `objectStorageKey` from job row |
| `DocumentSourceItem` | `contentHash` computed before persist | Factory on api path |
| `RagResult` | `diagnosticId` always present | Factory methods enforce |
| `RagResult` | `refusal ⟹ empty citations` | Factory enforces |
| `AnswerDiagnostics` (private) | Always created, even on error | `rag` in finally-equivalent block |
| `AnswerDiagnostics` (private) | `promptVersion` matches registry | Read at call time from `PromptRegistry` |
| `AuditEvent` | INSERT-only | DB role grants + trigger |
| `AuditEvent` | Txn-coupled with action | `audit.record()` in same `@Transactional` scope |
| `AuditEvent` | `payload` content-minimized | `AuditPayload` validation before INSERT |
| `Scope` | `workspaceId` non-null | Constructor |
| `DomainException` | `code` namespaced by module | Convention + test |
| `WorkerJobContext` | `tenantId` + `workspaceId` on every worker job | Scheduler reads from job row; never ThreadLocal |
| `BudgetCounter` | Only written by `policy.providergate` | Package-private |
| `Chunk` (entity) | Never searchable until version cutover | `search` queries filter by `version.active = true` |
| `IngestionJob` | `dead_letter ⟹ dead_letter_reason ≠ null` | DB constraint `CHECK (NOT dead_letter OR dead_letter_reason IS NOT NULL)` |

---

## 4. Abstraction Critique

### S01 `AllowedFilterSet` — justified?

**Why exist?** Prevents every retrieval caller from building their own SQL WHERE clauses with different filter logic. One object, one interpretation in `search`. Structural bypass prevention.

**Hiding complexity?** Yes, intentionally. Hides ACL resolution (most-specific-wins, deny-beats-allow). Good — callers should not know ACL internals.

**God DTO risk?** Low. Fixed fields that mirror the permission model. Won't grow unbounded.

**Leaking DB?** No. Contains UUIDs and a classification enum. `search` translates to SQL — the abstraction does not know SQL.

**Stable?** Yes for MVP. ABAC would add fields but not change shape.

### S02 `ProviderDecision` — justified?

**Why exist?** Fail-closed needs a carrier for deny reason (for audit). Without it, denials are bare exceptions and lose the structured reason.

**Just renaming?** Slightly. Could be a boolean + string. But making it a type enables compile-time enforcement: methods that need a validated provider take `ProviderDecision.allowed()` as proof.

**Stable?** Yes. Extends if validation dimensions grow.

### S03 `EmbeddingProfile` — justified?

**Why exist?** Keys index families for zero-downtime migration. Without it, embedding model changes require downtime + full reindex.

**Premature at MVP?** Yes — one profile at MVP. But the schema is cheap (one row), and retrofitting `embedding_profile_id` FK onto chunks/embeddings later = painful migration. Keep.

**God DTO risk?** Low. Fixed fields dictated by the embedding model.

### S04 `DocumentSourceItem` — justified?

**Why exist?** Normalizes connector output on the **api upload path** only. Decouples upload validation from connector specifics.

**Process-boundary fix (v1.1).** v1 wrongly put `Supplier<InputStream>` on a "shared" handoff to worker. Worker runs separate JVM — handoff is `ingestion_jobs` + object-storage key, not this object. `DocumentSourceItem` is in-process api-only.

**Premature as cross-module abstraction?** Partially — only `documents.connector` → `documents.mgmt` need it. Still worth keeping as connector contract.

### S05 `RagResult` — justified?

**Why exist?** Clean seam between `rag` and callers. Dual factories: `streamed` (chat) and `completed` (evaluation) — evaluation must not subscribe to `Flux`.

**God DTO risk?** Low after v1.1 — carries `diagnosticId` + answer shape only. Fat metadata stays on private `AnswerDiagnostics`.

### S06 `AuditEvent` — justified?

**Why exist?** Hard requirement (BRD §2.5). Single write path enforces append-only.

**Payload typing.** Use `AuditPayload` subtypes (compile-time), not raw `JsonNode` in the write API.

### S07 `Scope` — justified?

**Why exist?** Three callers need same scope concept. `Scope.of(goldenQuestion)` avoids drift vs persisted eval scope fields.

### Expected failures — exceptions, not `DomainResult`

**v1 mistake.** Proposed `DomainResult<T>` without committing. **MVP decision: exception hierarchy.** Spring `@ExceptionHandler` maps 6+ denial modes mechanically. Revisit result-type only if error-as-value dominates at scale.

---

## 5. Mapping Layers

Three mapping boundaries exist. Each has one clear rule.

### 5.1 DB Entity → Domain Model

**Where:** Inside the owning module, at the repository boundary.

**Rule:** JPA entities never cross package boundaries. Repositories return **projections** or **immutable snapshots** to external callers. Prefer explicit projection records; allow 1:1 immutable snapshot for stable reference data (e.g. `ProviderCapabilities`) without a separate mapper when entity is read-only after load.

| Example | Entity (private) | Projection / VO (shared) | Where mapped |
|---|---|---|---|
| Permission data | `AccessPolicy` (entity in `admin`) | `AccessPolicyRow` (record) | `AccessPolicyRepository` returns projections; `policy.access` consumes them |
| Document metadata | `Document` (entity in `documents.mgmt`) | `DocumentInfo` (record: id, name, status, version, collection) | `DocumentRepository` returns projections; `web` controllers consume them |
| Provider config | `ProviderConfig` (entity in `admin`) | `ProviderCapabilities` (record) | `ProviderConfigRepository`; consumed by `ai.provider` + `policy.providergate` |
| Ingestion job status | `IngestionJob` (entity in `documents.pipeline`) | `JobStatus` (record: id, stage, retryCount, deadLetter, reason) | `IngestionJobRepository`; consumed by `web` controllers for admin monitor |
| Chat message | `ChatMessage` (entity in `chat`) | `MessageSummary` (record: id, role, timestamp, hasFeedback) | `ChatRepository`; consumed by `web` for conversation list |

**Anti-pattern to block:** Entity used as API return type. Entity annotations (`@Column`, `@ManyToOne`) in a class imported by controllers = leak. ArchUnit can enforce: no `@Entity`-annotated class outside its owning package.

### 5.2 Domain Model → API DTO

**Where:** In `web` controllers. Domain model in, DTO out.

**Rule:** Controllers map domain results / projections to REST DTOs (annotated with Jackson / OpenAPI annotations). DTOs live in `web.dto` sub-packages. Domain modules never import `web.dto`.

| Direction | Source | Target | Mapper location |
|---|---|---|---|
| Response | `DocumentInfo` (domain projection) | `DocumentResponse` (DTO) | `web.documents.DocumentMapper` |
| Response | `RagResult` (domain) | SSE event stream | `web.chat.ChatSseHandler` |
| Response | `DiagnosticsView` (projection from `rag`) | `DiagnosticsResponse` (DTO) | `web.chat.DiagnosticsMapper` |
| Response | `DomainException` | `ErrorResponse` (DTO) | `web.GlobalExceptionHandler` |
| Request | `ChatRequest` (DTO) | `Scope` (domain) + question string | `web.chat.ChatController` |
| Request | `SearchRequest` (DTO) | `Scope` (domain) + query string + filters | `web.search.SearchController` |
| Request | `UploadRequest` (multipart DTO) | `DocumentSourceItem` (domain) | `web.documents.UploadController` via `documents.connector.adaptUpload()` |

**Anti-pattern to block:** Domain module importing a DTO class. ArchUnit rule: `shared.model` and domain packages must not depend on `web.dto`.

### 5.3 Provider Response → Internal Model

**Where:** Inside `ai.provider` adapter classes (package-private).

**Rule:** Provider SDK response classes never escape the `ai.provider.adapter` package. Adapters normalize to internal types: `EmbeddingResult`, `ChatCompletionChunk`, `ProviderUsage`. These internal types are returned to `policy.providergate` → callers.

| Provider SDK type (private) | Internal type (shared within `ai.provider`, returned to callers) |
|---|---|
| Azure `ChatCompletions` | `ChatCompletionChunk(content: String, finishReason: String?)` |
| Azure `EmbeddingItem` | `EmbeddingResult(vector: float[], dimensions: int, tokenUsage: int)` |
| OpenAI-compat JSON response | Same `ChatCompletionChunk` / `EmbeddingResult` |
| Any provider usage metadata | `ProviderUsage(promptTokens: int, completionTokens: int, totalTokens: int)` |

**Anti-pattern to block:** Caller accessing `com.azure.ai.openai.models.*` directly. Already ArchUnit-blocked (SAD §2.3).

---

## 6. Anti-Patterns Detected (in current spec design)

| # | Anti-pattern | Where | Risk | Fix |
|---|---|---|---|---|
| 1 | **Entity as API type.** SAD ERD entities (`Document`, `ChatMessage`, etc.) are referenced throughout the spec as if they are passed between modules. | Whole spec | JPA coupling leaks into domain interfaces, controllers see `@Entity` annotations, lazy-loading traps. | Enforce: entities private to owning module. Cross-module = projections/VOs. ArchUnit rule: `@Entity` classes only inside their owning package. |
| 2 | **`payload: JsonNode` on `AuditEvent` is untyped.** Any module can dump anything into the audit payload. No compile-time schema per event type. | `audit` | Payload drift: inconsistent field names across event types, hard to query, hard to export to SIEM. | Define per-event-type payload records (e.g., `DocumentUploadedPayload`, `ProviderCallPayload`) that serialize to JSON. `audit.record()` accepts a `AuditPayload` marker interface; each event type implements it. Still stored as JSON, but validated at compile time. |
| 3 | **`SearchReader` / `SearchWriter` split.** Design choice for clarity — read path requires `AllowedFilterSet`, write path requires `EmbeddingProfile` + tenant. Not fixing a spec bug; separates two different security contexts. | `search` | Cleaner API than one interface with optional filter param. | `SearchReader` + `SearchWriter` in `search` package. ArchUnit: only `rag` → reader, only `documents.pipeline` → writer. |
| 4 | **`RagResult` reactive coupling.** | `rag` → `evaluation` | Eval forced to block on `Flux`. | `RagResult.completed()` + `executeAndCollect()` for evaluation path. |
| 5 | **`Scope` dual representation.** | `evaluation`, `web` | Drift vs golden-question stored fields. | `Scope.of(goldenQuestion)` factory. |
| 6 | **Implicit tenant on worker threads.** | `worker.runtime`, all worker jobs | ThreadLocal / request scope wrong for background JVM — cross-tenant bug risk. | **`WorkerJobContext`** with explicit `tenantId`/`workspaceId` from job row. Optional `RequestContext` (`@RequestScope`) on **api only** — never on worker. |
| 7 | **`DocumentSourceItem` with stream handle.** (v1 — fixed) | `documents` | Cannot cross api→worker JVM. | Api-only; worker uses `objectStorageKey` from `ingestion_jobs`. |

---

## 7. Recommended Package Structure and Naming

```
com.company.knowledgeassistant
├── shared
│   ├── model/                           (7 shared VOs — §1)
│   └── exception/                       (DomainException hierarchy — MVP)
├── policy/ (access, providergate)
├── audit/
├── search/ (SearchReader, SearchWriter)
├── ai/provider/
├── documents/ (mgmt, pipeline, connector)
├── rag/                                 (orchestrator + private diagnostics + projections + PromptRegistry)
├── chat/
├── evaluation/
├── admin/
├── metrics/
├── worker/runtime/ (JobScheduler, WorkerJobContext)
├── web/ (dto, controllers, GlobalExceptionHandler)
└── adapters/ (objectstorage, identity)
```

Key moves vs v1:
- **No `prompts/` package at MVP** — `PromptRegistry` lives in `rag`; `evaluation` injects it.
- **No `DomainResult` / `TenantContext`** — exceptions + `RequestContext` (api only) + `WorkerJobContext` (worker only).
- **`AnswerDiagnostics` private in `rag`** — cross-module via `DiagnosticRef`, `RetrievalTrace`, `DiagnosticsView`.

### Naming conventions

| Concept | Convention | Example |
|---|---|---|
| Shared value objects | Noun, immutable `record` | `AllowedFilterSet`, `Scope`, `ProviderDecision` |
| JPA entities | `*Entity`, private to package | `DocumentEntity`, `ConversationEntity` |
| Read-only projections | `*Info` or `*Summary` or `*Row` | `DocumentInfo`, `MessageSummary`, `AccessPolicyRow` |
| API DTOs | `*Request` / `*Response` | `ChatRequest`, `DocumentResponse` |
| Domain services | `*Service` or semantic name | `ChatService`, `RagOrchestrator`, `AuthzResolver` |
| Error codes | `module.UPPER_SNAKE` | `"policy.BUDGET_EXHAUSTED"`, `"documents.AV_BLOCKED"` |
| Audit event types | `subject.verb.detail` (lowercase dot-separated) | `document.uploaded`, `provider.call.denied` |
| Prompt families | Lowercase noun | `"answer"`, `"judge-rubric"` |

### ArchUnit enforcement summary

| Rule | Blocks |
|---|---|
| `@Entity` classes only referenced within their owning package | Entity leak across modules |
| `web.dto` not imported by domain/shared packages | DTO leak into domain |
| Provider SDK classes only inside `ai.provider.adapter` | SDK leak (SAD §2.3) |
| Native SQL / pgvector / tsvector only inside `search` | Search bypass (SAD §2.3) |
| `documents.mgmt` ⊥ `documents.pipeline` | Process isolation bypass (SAD §9.2) |
| `AllowedFilterSet` constructor not called outside `policy` | Filter forgery |
| `SearchWriter` called only by `documents.pipeline` | Uncontrolled index writes |
| `SearchReader` called only by `rag` | Unfiltered reads |

---

## 8. Refactoring Priorities (implementation-time guidance)

Since no code exists, these are "implement in this order" priorities, not refactoring of existing code.

1. **Foundation slice — `shared.model` + `shared.exception`.** `AllowedFilterSet`, `Scope`, `AuditEvent` + `AuditPayload`, `RequestContext` (api only), `DomainException` hierarchy. ArchUnit from commit one.
2. **`search` reader/writer split.** Interfaces before ingestion slice.
3. **`audit` typed payloads.** First 5 event payload records with `AuditModule`.
4. **Entity privacy + projection discipline.** ArchUnit: `@Entity` in owning package only. `AnswerDiagnostics` stays in `rag` with narrow projections outward.
5. **`PromptRegistry` in `rag`.** Two template families at MVP. Extract `prompts/` package when template count > 3.
6. **`RequestContext` on api; `WorkerJobContext` on worker.** Never ThreadLocal tenant on worker. Job row is source of truth.
7. **`RagResult` dual-mode from day one.** `streamed` for chat; `completed` / `executeAndCollect()` for evaluation.
