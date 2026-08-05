# E2E User Journeys — Top 10 (NFR §7.2)

Playwright is the chosen E2E framework: React SPA, SSE streaming assertions,
and cross-browser support. The full suite must be green at the **hardening
slice gate** (`docs/mvp-capability-plan.md` §5).

## Tooling

| Item | Decision |
|------|----------|
| Framework | [Playwright](https://playwright.dev/) |
| Location | `frontend/e2e/` (created in foundation slice) |
| CI | Commented `frontend-verify` job in `.github/workflows/ci.yml` |
| Auth | Keycloak test realm + seeded demo users per role |

## Journey map

| # | Journey | Earliest slice | Matrix rows | Preconditions |
|---|---------|--------------|-------------|---------------|
| 1 | **Login** — OIDC redirect, JWT session, workspace list | foundation | FND-3, FND-4 | Keycloak demo realm; seeded tenant/workspace/users |
| 2 | **Upload** — drag-and-drop PDF/MD/TXT, ack + job status | ingestion | ING-AC1, ING-AC10 | CONTRIBUTOR role; collection exists |
| 3 | **Search** — hybrid query, permission-filtered results | chat | SRCH-AC1, SRCH-AC4 | Indexed document in accessible collection |
| 4 | **Chat** — ask question, streaming SSE tokens | chat | CHAT-AC3, CHAT-AC4 | Indexed corpus; USER role |
| 5 | **Citation click** — inline citation opens source chunk | chat | CHAT-AC4, CHAT-AC7 | Chat answer with ≥1 citation |
| 6 | **Role change** — ADMIN assigns role, access updates ≤60s | admin | ADM-AC1, ADM-AC2, CHAT-AC6 | Two users; ADMIN + target USER |
| 7 | **Deletion** — soft delete, search zero hits, restore window | ingestion + admin | ING-AC4, ADM-AC3 | CONTRIBUTOR/ADMIN; indexed document |
| 8 | **Evaluation run** — trigger suite, view pass/fail results | evaluation | EVAL-AC1, EVAL-AC2, SRCH-AC3, CHAT-AC2 | Golden seed imported; CONTRIBUTOR role |
| 9 | **Audit view** — filter audit log, read-only | admin | ADM-AC5 (partial), OBS-AC2 | ADMIN or VIEWER with `audit:read` |
| 10 | **Admin reindex** — bulk reindex single workspace | admin + ingestion | ING-AC2, ADM-AC4 | ADMIN; failed or stale ingestion job |

## Staging rule

| Slice | Journeys added |
|-------|----------------|
| foundation | #1 Login (scaffold `frontend/e2e/`, smoke only) |
| ingestion | #2 Upload, #7 Deletion (partial — soft delete only) |
| chat | #3 Search, #4 Chat, #5 Citation click |
| admin | #6 Role change, #9 Audit view, #7 Deletion (restore/four-eyes) |
| evaluation | #8 Evaluation run |
| hardening | All 10 green in CI; #10 Admin reindex |

## Playwright conventions (when implemented)

- Page objects under `frontend/e2e/pages/`.
- SSE chat tests use `page.waitForResponse` + event stream parsing or API-level setup with UI assertion on rendered tokens.
- No secrets in test fixtures; use Docker Compose seed credentials only.
- Trace on first retry; HTML report uploaded as CI artifact.

## Out of scope for E2E (MVP)

- Cross-browser matrix beyond Chromium in CI (Firefox/WebKit optional locally).
- Load/stress testing (covered by benchmark harness + NFR capacity targets).
- Mobile viewport journeys (NFR §10.3 responsive — manual or visual regression later).
