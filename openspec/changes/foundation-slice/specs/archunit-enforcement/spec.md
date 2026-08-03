## ADDED Requirements

### Requirement: Provider SDK import wall

ArchUnit SHALL enforce that provider SDK classes are imported only inside the `ai.provider.adapter` package. Any import outside that package MUST fail the CI build.

#### Scenario: SDK import outside adapter package fails build

- **WHEN** a class outside `ai.provider.adapter` imports a provider SDK class
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: Search query wall

ArchUnit SHALL enforce that native SQL, pgvector functions, and tsvector functions are used only inside the `search` package.

#### Scenario: Native query outside search fails build

- **WHEN** a class outside `search` uses EntityManager native queries or pgvector/tsvector functions
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: Documents mgmt and pipeline import wall

ArchUnit SHALL enforce that `documents.mgmt` must not import `documents.pipeline`, even before pipeline code exists in slice 2.

#### Scenario: mgmt imports pipeline fails build

- **WHEN** any class in `documents.mgmt` imports a class from `documents.pipeline`
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: Api profile worker-domain import wall with exact matching rule

ArchUnit SHALL enforce that no class activated under the `api` Spring profile imports classes from worker-domain packages. Canonical package names per Module_Boundaries §2 (SAD §9.2 uses stale `worker.pipeline` / `worker.eval` terminology):

- `documents.pipeline` — ingestion worker code
- `evaluation` — evaluation worker code
- `worker.runtime` — job scheduler infrastructure

**Exact matching rule (removes "Spring profile annotation conditions" ambiguity from design.md).** The ArchUnit test combines two concrete, non-overlapping predicates so no class is exempt through ambiguity:

1. **Annotation-based:** any class annotated with `@org.springframework.context.annotation.Profile` whose `value()` array contains `"api"` (matched via ArchUnit's `annotatedWith(Profile.class)` plus a custom `ArchCondition` inspecting the annotation's `value()`).
2. **Package-based (api-only-by-construction):** any class residing in `..web..` or `..adapters.identity..`. These two packages exist solely to serve the `api` profile — `worker` has no HTTP controllers and no direct IdP-facing code — so ArchUnit treats package membership alone as sufficient evidence of api-profile scope, with no need to detect runtime profile activation.

Both predicates independently forbid importing `documents.pipeline`, `evaluation`, or `worker.runtime`. A class satisfying either predicate fails the build if it imports a forbidden package.

#### Scenario: Explicitly api-profiled class imports documents.pipeline fails build

- **WHEN** a class annotated `@Profile("api")` imports from `documents.pipeline`
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

#### Scenario: web package class imports evaluation fails build

- **WHEN** a class in the `web` package imports from `evaluation`
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: AllowedFilterSet filter-forgery wall

ArchUnit SHALL enforce that `AllowedFilterSet` constructor or factory methods are callable only inside the `policy` package (Shared_Abstractions §379, SAD §2.3). No other module may construct or instantiate `AllowedFilterSet`.

#### Scenario: AllowedFilterSet constructed outside policy fails build

- **WHEN** a class outside `policy` calls `AllowedFilterSet` constructor or factory
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: Audit sole-writer wall

ArchUnit SHALL enforce that only the `audit` package may import or reference JPA/repository types that write to `audit_events`. No other module may contain INSERT paths to `audit_events` outside `audit.record()`.

#### Scenario: Non-audit module writes audit_events fails build

- **WHEN** a class outside `audit` references `audit_events` repository or issues INSERT to `audit_events`
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: Entity boundary wall

ArchUnit SHALL enforce that `@Entity`-annotated classes are referenced only within their owning package (Shared_Abstractions §329, §379). Cross-module access MUST use projections or value objects, not JPA entities.

#### Scenario: Entity imported outside owning package fails build

- **WHEN** a class outside an entity's owning package imports or references an `@Entity`-annotated class
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: web.dto dependency wall

ArchUnit SHALL enforce that `shared.model` and all domain packages (`policy`, `audit`, `search`, `ai.provider`, `documents`, `rag`, `chat`, `evaluation`, `admin`) never depend on `web.dto` (Shared_Abstractions §306). DTOs are an outward-facing shaping concern of `web`; a domain class importing a DTO is a dependency-direction violation.

#### Scenario: Domain package imports web.dto fails build

- **WHEN** a class in `shared.model` or any domain package imports a class from `web.dto`
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: SearchReader and SearchWriter caller walls

ArchUnit SHALL enforce the caller restrictions from Shared_Abstractions §390: `SearchReader` may be called only by `rag`; `SearchWriter` may be called only by `documents.pipeline`. This prevents unfiltered reads (bypassing `rag`'s permission resolution) and uncontrolled index writes (bypassing the ingestion pipeline's lifecycle control).

#### Scenario: Non-rag caller of SearchReader fails build

- **WHEN** a class outside `rag` calls a `SearchReader` method
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

#### Scenario: Non-pipeline caller of SearchWriter fails build

- **WHEN** a class outside `documents.pipeline` calls a `SearchWriter` method
- **THEN** the ArchUnit test fails
- **AND** CI blocks merge

### Requirement: ArchUnit tests are first deliverable

All ArchUnit wall tests listed above SHALL be written and passing before any domain or endpoint implementation merges. They MUST be CI-blocking and non-deferrable per Module_Boundaries §9 step 1.

#### Scenario: ArchUnit runs in CI on first commit

- **WHEN** CI pipeline executes on the foundation slice branch
- **THEN** all nine ArchUnit wall tests run
- **AND** build fails if any wall is violated
