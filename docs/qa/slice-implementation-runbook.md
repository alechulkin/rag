# Slice Implementation Runbook

Operator guide for implementing MVP delivery slices **1–6** through spec,
bounded implementation, deterministic verification, evidence capture, and
merge-ready PRs.

**Workflow, not requirements.** Subordinate to [AGENTS.md](../../AGENTS.md)
precedence, [mvp-capability-plan.md](../mvp-capability-plan.md) (plan), and
[quality-gates.md](../checklists/quality-gates.md) (G0–G8). On conflict,
report drift — do not silently patch authoritative docs.

**Canonical gate list:** [verification-manifest.json](./verification-manifest.json)  
**CI mirror:** [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

---

## 0. Preconditions (once)

Complete before slice 1 implementation:

1. **Trusted loop on `main`.** G0–G3 passed per [quality-gates.md](../checklists/quality-gates.md).
2. **CODEOWNERS.** Replace `@OWNER` in [.github/CODEOWNERS](../../.github/CODEOWNERS) with a real GitHub user or team.
3. **Branch protection.** Configure per [branch-protection.md](./branch-protection.md):
   - Require status check **`docs-verify`** (always).
   - Require **`backend-verify`** / **`frontend-verify`** after foundation
     uncomments those jobs.
   - Require approvals only when a **non-author** reviewer exists. Solo
     maintainers: document a temporary waiver in [current-state.md](../current-state.md).
4. **Branch discipline.** One slice (or sub-PR) per branch; never implement
   directly on `main`.

---

## 1. Slice order (hard vs soft)

From [mvp-capability-plan.md §2](../mvp-capability-plan.md#2-critical-path-dag):

| # | Slice | OpenSpec change | Spec prompt | Canonical spec doc |
|---|-------|-----------------|-------------|-------------------|
| 1 | Foundation | `foundation-slice` | [01_foundation-slice.md](../spec-prompts/01_foundation-slice.md) | `docs/specs/01_Foundation_Spec.md` |
| 2 | Ingestion | `ingestion-slice` | [02_ingestion-slice.md](../spec-prompts/02_ingestion-slice.md) | `docs/specs/02_Ingestion_Spec.md` |
| 3 | Chat / RAG | `chat-slice` | [03_chat-slice.md](../spec-prompts/03_chat-slice.md) | `docs/specs/03_Chat_Spec.md` |
| 4 | Admin | `admin-slice` | [04_admin-slice.md](../spec-prompts/04_admin-slice.md) | `docs/specs/04_Admin_Spec.md` |
| 5 | Evaluation | `evaluation-slice` | [05_evaluation-slice.md](../spec-prompts/05_evaluation-slice.md) | `docs/specs/05_Evaluation_Spec.md` |
| 6 | Hardening | `hardening-slice` | [06_hardening-slice.md](../spec-prompts/06_hardening-slice.md) | `docs/specs/06_Hardening_Spec.md` |

**Hard dependencies:**

- Everything after **foundation** (Gradle, Compose, Flyway V1, ArchUnit walls).
- **Ingestion before chat** (indexed, permission-scoped content).
- **Chat + admin before evaluation** (live RAG pipeline + notifications).
- **Hardening last** (retention, E2E re-verification, cross-cutting OBS/RET).

**Soft:** admin may overlap ingestion/chat (foundation seeds registry defaults).

---

## 2. Universal loop (every slice)

Repeat phases **A → F** for each slice.

### Phase A — Spec gate (G2) — **before any code**

**Foundation:** OpenSpec change already proposed at
`openspec/changes/foundation-slice/`. Skip propose; complete spec doc tasks
1.1–1.4 in [tasks.md](../../openspec/changes/foundation-slice/tasks.md).

**Slices 2–6:**

1. Branch: `feat/<slice>` (or `feat/<slice>-spec` if spec-only PR).
2. Run `/opsx-propose <slice>` (or [openspec-propose](../../.codex/skills/openspec-propose/SKILL.md))
   with the matching [spec-prompts](../spec-prompts/README.md) pasted into the
   session.
3. Ensure `openspec/changes/<slice>/` contains: `proposal.md`, `design.md`,
   delta `specs/**/spec.md`, `tasks.md`.
4. Cite every plan §1 matrix row whose **acceptance evidence closes** in this
   slice inside delta specs (`<!-- trace: ING-AC1 -->` or inline row IDs).
5. Write `docs/specs/<NN>_<Slice>_Spec.md` from OpenSpec artifacts + prompt.
6. **Report** cross-doc conflicts; never silently resolve (AGENTS.md).

**Blocking commands (all exit 0):**

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-traceability.mjs --slice <slice> --phase docs --write
node scripts/check-traceability.mjs --check-fresh
node scripts/check-doc-links.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
node scripts/check-verification-manifest.mjs
```

Commit the regenerated [traceability-report.md](./traceability-report.md).
CI runs `--check-fresh` **without** `--write` — stale committed report fails.

**Stop if any command is red.** Do not start implementation.

---

### Phase B — Implement (bounded, red-first TDD)

Use `/opsx-apply <slice>` or [openspec-apply-change](../../.codex/skills/openspec-apply-change/SKILL.md).

**Per-task rule** ([verification-manifest.json](./verification-manifest.json) →
`openspecApply`): never mark `- [x]` until focused verification for **that**
task has run and the decisive exit line is recorded (session + PR evidence).

For each pending task in `tasks.md`:

1. State task id and intent.
2. Write or extend tests for matrix rows the task closes (`@trace <row-id>` once
   test code exists).
3. Observe **red** where applicable.
4. Implement minimal code to pass.
5. Run smallest proving command (unit, ArchUnit, integration, OpenAPI lint,
   Compose smoke).
6. Paste decisive output line.
7. Only then: `- [ ]` → `- [x]`.

Constraints:

- Smallest coherent vertical slice; no opportunistic refactors (rag-change-workflow).
- New architectural decisions → new ADR in `docs/adr/`, not silent edits.
- Update `openapi/*.yaml` when HTTP contracts change.

---

### Phase C — Red/green evidence (G4)

Before implementation makes red tests pass, capture failure:

**Path:** `openspec/changes/<slice>/evidence/red-run.json`

Required fields:

- `exitCode` — non-zero number
- `failingTests` — non-empty string array
- `gitHead` — 7–40 hex SHA
- `timestamp` — ISO-8601

After slice work is green:

**Path:** `openspec/changes/<slice>/evidence/green-run.json`

- `exitCode` — `0`
- `failingTests` — `[]`
- `gitHead` — **different** SHA from red
- `timestamp` — **later** than red

Validate:

```bash
node scripts/check-red-green-evidence.mjs --slice <slice>
```

CI enforces via `scripts/check-slice-gates.mjs` once evidence files exist.

---

### Phase D — Local full battery (pre-PR)

**Docs / contract (always):**

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs --slice <slice>
```

**Backend (`[foundation+]`, after Gradle tree + uncommented `backend-verify`):**

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze \
  test jacocoTestCoverageVerification build
```

**Frontend (`[foundation+]`, after `frontend/` tree + uncommented `frontend-verify`):**

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

**Traceability phase `full` (once `@trace` tags exist in tests):**

```bash
node scripts/check-traceability.mjs --phase full --write
node scripts/check-traceability.mjs --phase full --check-fresh
```

Every matrix row closing in the slice needs ≥1 `@trace <row-id>` in tests, or an
explicit recorded handoff to a later slice (plan §5 DoD item 2).

**Review findings:** copy [remediation-ledger.template.md](./remediation-ledger.template.md)
to `openspec/changes/<slice>/evidence/remediation-ledger.md`, fill FIND blocks,
then:

```bash
node scripts/check-remediation-ledger.mjs --file openspec/changes/<slice>/evidence/remediation-ledger.md
```

**Shortcut:** `.cursor/commands/quality-gate.md` lists the docs-phase battery.

Never claim green without running these commands locally.

---

### Phase E — Handoff and archive

1. All `tasks.md` checkboxes truthfully `[x]`.
2. Slice-specific gate met (plan §5 gate table — see §4–§9 below).
3. Archive OpenSpec change: `/opsx-archive <slice>` (or openspec-archive-change).
4. Sync main specs if applicable (`/opsx-sync`).
5. Confirm `docs/specs/<NN>_<Slice>_Spec.md` exists.
6. **Last repo edit:** prepend slice entry to [current-state.md](../current-state.md).

```bash
node scripts/check-handoff-fresh.mjs --slice <slice>
```

Newest current-state entry must mention the slice and not predate the green-run
timestamp (10-minute write-then-commit skew allowed).

---

### Phase F — PR, CI, merge

1. Push branch; open PR using [.github/pull_request_template.md](../../.github/pull_request_template.md).
2. Fill: slice name, matrix row IDs, DoD checklist, verification commands +
   decisive output, rollback note.
3. Wait for CI:
   - **`docs-verify`** — always (automatic).
   - **`backend-verify`** / **`frontend-verify`** — after foundation enables them.
4. CodeRabbit — **advisory only** (`.coderabbit.yaml`); not a merge substitute.
5. Non-author human approval when available (NFR §7.1).
6. Merge only when G4 criteria in [quality-gates.md §G4](../checklists/quality-gates.md#g4--per-slice-repeat-for-slices-16) hold.

---

## 3. Automatic vs manual gates

| Gate | Runs automatically | You must still |
|------|-------------------|----------------|
| OpenAPI lint, OpenSpec strict, doc links, golden-seed, manifest, Mermaid, gitleaks | CI `docs-verify` every PR | Run locally before push; fix reds |
| Traceability freshness | CI `--check-fresh` | Regenerate with `--write`, **commit** report |
| Red/green + handoff + ledger | CI `check-slice-gates.mjs` when evidence exists | Author JSON + current-state |
| Checkstyle, SpotBugs, deps, `./gradlew test`, JaCoCo, build | CI `backend-verify` after uncomment | Enable job same commit as Gradle wrapper |
| Frontend lint, tsc, coverage, E2E, build | CI `frontend-verify` after uncomment | Enable when `frontend/` lands |
| Per-task verification | — | Before each OpenSpec `[x]` |
| SAD §9.1 benchmark | — | Run `tools/benchmark/` before ingestion merge |
| Golden-suite eval (G6) | — | Manual via `evaluation` module; **not** CI-scheduled (plan §4) |
| Non-author PR approval | GitHub branch protection | Second reviewer or documented solo waiver |
| SAST, Error Prone task, SBOM, Prettier, Ruff/mypy | **Not wired** (plan §6.2) | Add during foundation or track as known debt |

---

## 4. Slice 1 — foundation

**Status:** OpenSpec proposed; 69 tasks in [tasks.md](../../openspec/changes/foundation-slice/tasks.md); 0 done.

**Matrix rows closing here:** FND-1..FND-8; OBS-AC1/7/8 via audit append-only.

### Recommended PR sequence

Split if review size grows; order matters inside the slice:

1. Spec doc (tasks 1.1–1.4) + G2 commit.
2. Gradle wrapper + **uncomment `backend-verify`** same commit (tasks 2.1–2.2).
3. Package tree, profiles, Compose, frontend shell (2.3–2.7); uncomment
   `frontend-verify` when `frontend/package.json` exists.
4. Shared VOs (§3) then **nine ArchUnit walls first** (§4) — design D2.
5. Flyway V1, entities, seed, canary chain (§5).
6. Module stubs (§6), security + bootstrap API (§7), frontend integration (§8).
7. Tests, JaCoCo, Playwright scaffold, red/green evidence, close (§9–§10).

### Critical bootstrap actions

**Task 2.1 — Gradle tree:** Java 21, Spring Boot, Flyway, OAuth2 resource server,
Testcontainers, ArchUnit, pgvector JDBC.

**Task 2.2 — CI activation (same commit as wrapper):** Uncomment `backend-verify`
in `.github/workflows/ci.yml`. Job must pass before heavy domain code. Configure
JaCoCo per [coverage-policy.md](./coverage-policy.md) (70% aggregate, 90%
policy/audit/search).

**Task 2.7 — Frontend tree:** React + TypeScript shell; uncomment
`frontend-verify` in the commit that adds `frontend/package-lock.json`.

**Tasks 4.1–4.10 — ArchUnit:** Nine walls per
[design.md](../../openspec/changes/foundation-slice/design.md) D2. Prove each
wall **red** on intentional violation at least once; CI `./gradlew test` blocks
on violations thereafter.

### Slice-specific gate (plan §5)

- ArchUnit red/green demonstrated.
- Canary seeded + detectable.
- Audit append-only + same-transaction tests pass.

### First commands

```bash
git checkout -b feat/foundation-slice
# Agent: complete tasks 1.1–1.4 → docs/specs/01_Foundation_Spec.md
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-traceability.mjs --slice foundation-slice --phase docs --write
node scripts/check-traceability.mjs --check-fresh
git add docs/qa/traceability-report.md docs/specs/01_Foundation_Spec.md
git commit -m "docs(foundation): add implementation spec and traceability"
# /opsx-apply foundation-slice — start task 2.1
```

---

## 5. Slice 2 — ingestion

**Blocked on:** foundation merged.

**Prerequisite before merge (mandatory):** [tools/benchmark/](../../tools/benchmark/README.md)
runnable; SAD §9.1 pass (recall@8 ≥ 0.85, p95 ≤ 1.0 s); fill
[ADR-019](../adr/019-pgvector-index-parameters.md).

1. Phase A: `/opsx-propose ingestion-slice` + prompt 02; trace ING-AC1..AC11.
2. Phase B: `documents` pipeline/mgmt, `worker.runtime`, object storage, AV async.
3. Phase C–F: red/green evidence; golden-seed cases for new error surfaces;
   slice gate = benchmark ADR + ING-AC7 delete-during-reindex test.

Admin **not** required (soft dependency).

---

## 6. Slice 3 — chat / RAG

**Blocked on:** foundation + ingestion.

**Rows:** SRCH-AC1/2/4/5, CHAT-AC1/3–7. **Defer** SRCH-AC3 and CHAT-AC2 evidence
to evaluation slice (record handoff in spec if tests land early).

1. Phase A: prompt 03 + OpenSpec change.
2. Phase B: search read path, `rag`, `chat`, SSE (ADR-011), fail-closed provider
   (CHAT-AC5), refusal tests (unit/integration — golden acceptance in slice 5).
3. Slice gate: SSE conformance, CHAT-AC5 tests, deterministic refusal path green.

---

## 7. Slice 4 — admin

**Blocked on:** foundation. May parallel ingestion/chat.

**Rows:** ADM-AC1..AC6.

1. Phase A: prompt 04 + OpenSpec change.
2. Phase B: full admin CRUD, four-eyes, deny-precedence, rate-limit fail-closed,
   notifications.
3. Slice gate: ADM-AC3/AC6 + rate-limit fail-closed tests.

---

## 8. Slice 5 — evaluation

**Blocked on:** chat + admin.

**Rows:** EVAL-AC1..AC5; **closes** SRCH-AC3 and CHAT-AC2.

1. Phase A: prompt 05 + OpenSpec change.
2. Phase B: eval runner reuses live RAG pipeline; regression alerts (EVAL-AC3).
3. **Manual:** run golden suite end-to-end; record results in `docs/qa/eval-report.md`
   (create on first run — see G6 in [quality-gates.md](../checklists/quality-gates.md)).
   Not CI-scheduled (plan §4).
4. Slice gate: negative-ACL, ranking-comparison, refusal cases; EVAL-AC2 oracle
   beats LLM-judge on refusal.

---

## 9. Slice 6 — hardening

**Blocked on:** chat, admin, evaluation.

**Rows:** OBS-AC2–6, RET-DOC/CHAT/AUDIT.

1. Phase A: prompt 06 + OpenSpec change.
2. Phase B: retention purge, logging profiles (OBS-AC3), NDJSON export (OBS-AC4),
   E2E top-10 per [e2e-journeys.md](./e2e-journeys.md).
3. Close **G5** in [quality-gates.md](../checklists/quality-gates.md).

---

## 10. After all slices (once)

| Gate | Actions |
|------|---------|
| **G6** QA proof pack | Phase `full` traceability all green; eval-report; ADR-019 current; a11y in Playwright; manual test plan |
| **G7** Release | `./gradlew check`, full frontend battery, global review, CI green on release commit, deploy smoke, current-state |
| **G8** UAT | Per bug: `@trace BUG-x`, golden-seed regression if retrieval/answer, full battery green |

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `traceability-report.md is stale` | Report not committed after `--write` | `node scripts/check-traceability.mjs --slice <slice> --write`, commit, re-run `--check-fresh` |
| `check-slice-gates` fails on handoff | current-state not updated last or omits slice name | Prepend entry mentioning `<slice>` after green-run |
| `backend-verify` missing on PR | Job still commented | Foundation task 2.2 — uncomment in Gradle wrapper commit |
| Cannot self-approve PR | GitHub policy | Second reviewer, or temporary approval waiver + green CI ([branch-protection.md](./branch-protection.md)) |
| Phase `full` traceability fails | Missing `@trace` on tests | Add tags or record explicit deferral in spec/handoff |
| Ingestion blocked | Benchmark not run | Complete `tools/benchmark/` + ADR-019 before merge |

---

## 12. Related documents

- [quality-gates.md](../checklists/quality-gates.md) — G0–G8 exit criteria
- [mvp-capability-plan.md](../mvp-capability-plan.md) — ownership matrix, DoD, slice DAG
- [verification-manifest.json](./verification-manifest.json) — machine-readable gate list
- [coverage-policy.md](./coverage-policy.md) — JaCoCo / Vitest floors
- [branch-protection.md](./branch-protection.md) — human merge gate
- [spec-prompts/README.md](../spec-prompts/README.md) — per-slice spec generation
- [openspec/changes/foundation-slice/](../../openspec/changes/foundation-slice/) — active foundation change
