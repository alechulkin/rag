# Task 2.1 — Gradle build skeleton

Date: 2026-08-14T12:15:00Z  
Branch: `feat/foundation-slice`

## Deliverables

- `settings.gradle.kts` — single module `rag-platform`
- `build.gradle.kts` — Java 21 toolchain, Spring Boot 3.4.4
- Gradle wrapper 8.12.1 (`gradlew`, `gradle/wrapper/`)
- Minimal app: `com.company.rag.RagPlatformApplication`
- Smoke test: `RagPlatformApplicationTest` (autoconfig excluded — no DB yet)

## Dependency set (task 2.1 scope)

| Requirement | Artifact |
|-------------|----------|
| Flyway | `flyway-core`, `flyway-database-postgresql` |
| OAuth2 Resource Server | `spring-boot-starter-oauth2-resource-server` |
| Testcontainers | `testcontainers-junit-jupiter`, `testcontainers-postgresql` (BOM 1.20.6) |
| ArchUnit | `archunit-junit5:1.4.0` (test) |
| pgvector JDBC | `com.pgvector:pgvector:0.1.6` |
| PostgreSQL driver | `org.postgresql:postgresql` (runtime) |

Lint plugins (Checkstyle, SpotBugs, OWASP dependency-check) and JaCoCo thresholds → **task 2.2** / **9.10**.

## Proving command

```bash
./gradlew build --no-daemon
```

```text
BUILD SUCCESSFUL in 8s
7 actionable tasks: 5 executed, 2 up-to-date
```
