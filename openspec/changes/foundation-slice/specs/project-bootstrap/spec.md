## ADDED Requirements

<!-- trace: FND-1 -->

### Requirement: Single Gradle module with canonical package tree

The project SHALL use one Gradle module with Java package layout matching Module_Boundaries §2, including hard-walled packages (`policy`, `audit`, `search`, `ai.provider`), domain packages, and supporting packages (`web`, `worker.runtime`, `adapters`).

#### Scenario: Package tree matches module map

- **WHEN** the Gradle project is built
- **THEN** source packages exist under the canonical tree defined in Module_Boundaries §2
- **AND** no additional logical modules or separate Gradle subprojects are created

### Requirement: Backend verification is active with project bootstrap

The foundation slice SHALL activate the staged `backend-verify` job in `.github/workflows/ci.yml` in the same change that introduces the Gradle wrapper and required verification tasks. The job MUST run backend lint, dependency vulnerability scanning, tests, coverage threshold verification, production build, and evidence upload. It MUST NOT remain commented or be deferred until domain, persistence, API, or frontend implementation.

#### Scenario: Gradle bootstrap activates backend CI

- **WHEN** the Gradle skeleton is added during foundation-slice implementation
- **THEN** `backend-verify` is an active GitHub Actions job
- **AND** every configured backend verification command executes successfully
- **AND** any failed lint, dependency scan, test, coverage, or build gate blocks merge

### Requirement: Spring Boot profiles api and worker as separate JVMs

The application SHALL support Spring profiles `api` and `worker` as separate JVM processes per ADR-001. Cross-profile communication SHALL use durable PostgreSQL state and object-storage keys only, never in-memory handoff.

#### Scenario: Docker Compose runs two backend JVMs

- **WHEN** Docker Compose starts the local stack
- **THEN** one container runs with `SPRING_PROFILES_ACTIVE=api`
- **AND** a separate container runs with `SPRING_PROFILES_ACTIVE=worker`
- **AND** both use the same application JAR with different profile activation

### Requirement: Docker Compose local development stack

Docker Compose SHALL provide PostgreSQL 16 with pgvector extension, Keycloak, MinIO, backend (`api` + `worker` profiles), and a React frontend shell.

#### Scenario: Full stack starts locally

- **WHEN** developer runs `docker compose up`
- **THEN** PostgreSQL, Keycloak, MinIO, api backend, worker backend, and frontend shell all reach healthy state
- **AND** no MVP-excluded infrastructure (Kafka, Redis, Kubernetes) is included

### Requirement: React frontend shell with OIDC redirect

The frontend SHALL be a React + TypeScript SPA with OIDC redirect login and a post-authentication landing page. UI conventions SHALL follow `docs/Design_System.md`.

#### Scenario: User completes OIDC login

- **WHEN** user navigates to the frontend and initiates login
- **THEN** browser redirects to Keycloak
- **AND** after successful authentication user returns to the SPA with a valid session/token
