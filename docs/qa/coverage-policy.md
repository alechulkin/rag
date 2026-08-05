# Coverage Policy — MVP Thresholds

Source: NFR §7.2, `docs/mvp-capability-plan.md` §5 (Definition of Done item 5).
JaCoCo configuration lands in the **foundation slice** Gradle build.

## Backend (Java)

| Scope | MVP line coverage | Production launch |
|-------|-------------------|-------------------|
| All backend modules (aggregate) | ≥ **70%** | ≥ **80%** |
| `policy` (permission engine) | ≥ **90%** | ≥ **90%** |
| `audit` (audit writer) | ≥ **90%** | ≥ **90%** |
| `search` (PermissionAwareSearchRepository) | ≥ **90%** | ≥ **90%** |
| Retention enforcement (`documents`, `chat`, `audit` purge paths) | ≥ **90%** | ≥ **90%** |

## Frontend (TypeScript)

| Scope | MVP | Production launch |
|-------|-----|-------------------|
| Shared UI components | ≥ **60%** | ≥ **70%** |
| State / services layer | ≥ **80%** | ≥ **85%** |

## Ratchet rule

- Coverage thresholds in `build.gradle.kts` / frontend config **never decrease**.
- When actual coverage exceeds threshold by **≥ 5 pp** for two consecutive main-branch builds, raise the threshold in the same PR that benefits from the headroom.
- PR comment (via `madrapps/jacoco-report` GitHub Action) flags **changed-file regression** below module floor.

## JaCoCo snippet (paste into `build.gradle.kts` — foundation slice)

```kotlin
tasks.jacocoTestCoverageVerification {
    dependsOn(tasks.test)
    violationRules {
        rule {
            limit {
                minimum = "0.70".toBigDecimal() // aggregate MVP floor
            }
        }
        rule {
            element = "PACKAGE"
            includes = listOf(
                "com.rag.policy.*",
                "com.rag.audit.*",
                "com.rag.search.*",
            )
            limit {
                counter = "LINE"
                minimum = "0.90".toBigDecimal()
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}
```

Adjust package prefix (`com.rag`) to match the Gradle `group` chosen in foundation slice.

## CI integration

- `backend-verify` job runs `./gradlew jacocoTestCoverageVerification` after `./gradlew test`.
- Coverage reports uploaded as artifacts (`build/reports/jacoco/`).
- PR comment step uses `madrapps/jacoco-report@v1` (configured in commented CI job).

## Frontend coverage (foundation slice)

- Vitest + `@vitest/coverage-v8` in `frontend/package.json`.
- Thresholds enforced in `vitest.config.ts` `coverage.thresholds` matching the table above.
- Staged in commented `frontend-verify` CI job.

## Exclusions

- Generated code (Flyway, OpenAPI generators if any)
- `main` application entrypoints and `@Configuration` boilerplate (documented in `build.gradle.kts` jacoco exclusion list)
- ArchUnit test classes (count toward test pass, not coverage numerator)
