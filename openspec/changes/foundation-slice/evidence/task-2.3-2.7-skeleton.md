# Tasks 2.3–2.7 — Project skeleton (PR2)

Date: 2026-08-27  
Change: `foundation-slice`

## Deliverables

- Package tree under `com.company.rag` per Module_Boundaries §2 / Foundation Spec §4.2
  - Present: `documents.pipeline`, `evaluation`, `worker.runtime`
  - Absent: `worker.pipeline`, `worker.eval`
- `ApiProfileConfiguration` / `WorkerProfileConfiguration` with profile-scoped `@ComponentScan`
- `application-api.yml` / `application-worker.yml` (PostgreSQL, OIDC issuer, MinIO placeholders)
- `docker-compose.yml` + `Dockerfile` + `deploy/keycloak/rag-realm.json` + `frontend/Dockerfile`
- React + TypeScript SPA (`oidc-client-ts` redirect login) + Design_System tokens
- `.github/workflows/ci.yml` `frontend-verify` activated with `frontend/package-lock.json`

## Proving commands

```bash
# 2.3 — required packages present; forbidden absent
test -f src/main/java/com/company/rag/documents/pipeline/package-info.java
test -f src/main/java/com/company/rag/evaluation/package-info.java
test -f src/main/java/com/company/rag/worker/runtime/package-info.java
! find src -path '*worker/pipeline*' -o -path '*worker/eval*' | grep -q .

# 2.4 — profile configs load exclusively
./gradlew test --no-daemon
# → BUILD SUCCESSFUL (ApiProfileConfigurationTest, WorkerProfileConfigurationTest, RagPlatformApplicationTest)

# 2.5
test -f src/main/resources/application-api.yml
test -f src/main/resources/application-worker.yml

# 2.6 — compose file contains required services (Docker CLI not installed on this host)
node -e "const t=require('fs').readFileSync('docker-compose.yml','utf8'); \
  ['pgvector','keycloak','minio','SPRING_PROFILES_ACTIVE','frontend'].forEach(k=>{if(!t.includes(k))process.exit(1)}); \
  console.log('compose_keys=OK')"

# 2.7
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run test:e2e && npm run build
# → lint clean; 4 unit tests passed; 1 e2e passed; vite build OK
rg -n "^  frontend-verify:" .github/workflows/ci.yml
# → 263:  frontend-verify:
```

## Notes

- Full Compose health (`api`/`worker` healthy) deferred until Flyway V1 (task 5.x) — schema validate needs migrations.
- Playwright smoke covers landing CTA only; full Keycloak journey remains task 9.11 / 8.1.
- Keycloak `rag-realm.json` ships realm + `rag-spa` client only (PKCE, redirect URIs). Demo users are **not** seeded in git — no plaintext passwords in source. Provision demo users manually (Keycloak admin / env-driven import) for local OIDC login.
