# Task 2.2 — Active backend CI verification

Date: 2026-08-14T21:31:13Z  
Branch: `feat/foundation-slice`  
Verified commit: `0c009dfaf3d2293bcd2f1e715afb8590ca66a04e`  
Pull request: [#5](https://github.com/alechulkin/rag/pull/5)

## GitHub Actions evidence

| Gate | Result | Evidence |
|------|--------|----------|
| CI workflow | Success | [run 31842310262](https://github.com/alechulkin/rag/actions/runs/31842310262) |
| `docs-verify` | Success | [job 94901609767](https://github.com/alechulkin/rag/actions/runs/31842310262/job/94901609767) |
| `dependency-check-data` | Success | [job 94901609787](https://github.com/alechulkin/rag/actions/runs/31842310262/job/94901609787) |
| `backend-verify` | Success | [job 94901672860](https://github.com/alechulkin/rag/actions/runs/31842310262/job/94901672860) |
| CodeQL | Success | [run 31842310077](https://github.com/alechulkin/rag/actions/runs/31842310077) |

The successful `backend-verify` job ran Error Prone compilation, Checkstyle,
SpotBugs, Dependency-Check (fail on CVSS >= 7), tests, JaCoCo thresholds,
the Node 24 PR coverage comment, CycloneDX SBOM generation, the production
build, and backend evidence upload. Artifact `backend-evidence` was uploaded
as artifact ID `9234764616` (598,503 bytes).

Dependency-Check restored the warmed cache
`dependency-check-Linux-12.2.2-31834740106` (118,678,703 bytes). The local
report contains two findings below the blocking threshold (maximum CVSS 5.3)
and no finding at or above CVSS 7.

## Local proving command

```bash
set -a
source .env
set +a
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build --no-daemon
```

```text
BUILD SUCCESSFUL in 3s
15 actionable tasks: 15 up-to-date
```

## Non-blocking follow-up

GitHub emitted deprecation warnings for pinned first-party actions that still
declare Node 20 (`checkout`, `setup-java`, `setup-gradle`, and
`upload-artifact`) while force-running them on Node 24. This did not bypass or
fail a configured gate; update those pins separately before GitHub removes
Node 20 compatibility.
