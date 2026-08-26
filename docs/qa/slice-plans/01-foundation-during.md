# During — `foundation-slice`

Phases B–D. This is the `/opsx-apply` implementation phase. Task list stays in
`openspec/changes/foundation-slice/tasks.md` (do not copy every checkbox).
Never `[x]` without a proving command.

1. Start: `/opsx-apply foundation-slice`.
2. PR1 — Gradle + CI (tasks 2.1–2.2), **same commit**: create Gradle wrapper
   (Java 21, Spring Boot, Flyway, OAuth2 resource server, Testcontainers,
   ArchUnit, pgvector JDBC); uncomment `backend-verify` in
   `.github/workflows/ci.yml`. Then:

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
```

3. PR2 — skeleton (tasks 2.3–2.7): package tree (`documents.pipeline`,
   `evaluation`, `worker.runtime` — never `worker.pipeline` / `worker.eval`);
   `api`/`worker` profiles; Compose (PostgreSQL 16 + pgvector, Keycloak,
   MinIO, two JVMs, frontend). Uncomment `frontend-verify` in the **same
   commit** as `frontend/package-lock.json`. Then:

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

4. PR3 — VOs then ArchUnit **before** domain (tasks 3.1–4.10). For each of
   nine walls: intentional violation, `./gradlew test` red, revert, green.
5. PR4 — persistence, stubs, API, UI (tasks 5–8): Flyway V1 + canary FK chain
   + deny rows; fail-closed stubs; bootstrap API + in-transaction audit; OIDC
   login + workspace list.
6. After first failing matrix-row tests, write
   `openspec/changes/foundation-slice/evidence/red-run.json`. After green:
   `green-run.json` (different `gitHead`, later timestamp). Then:

```bash
node scripts/check-red-green-evidence.mjs --slice foundation-slice
```

7. Tests + close-prep (tasks 9–10): `@trace FND-n`; JaCoCo 70% / 90%
   policy/audit/search; Playwright journey #1 under `frontend/e2e/`.
8. Local battery:

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs --slice foundation-slice
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
```

9. After `@trace` tags exist:

```bash
node scripts/check-traceability.mjs --phase full --write
node scripts/check-traceability.mjs --phase full --check-fresh
```
