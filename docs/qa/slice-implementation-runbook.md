# Slice implementation checklist

Repeat phases A–F for every slice. Stop on any non-zero exit. Never skip a
command. Never mark a task `[x]` without a proving command.

Slice order: `foundation-slice` → `ingestion-slice` → `chat-slice`.
`admin-slice` after foundation, may overlap ingestion/chat.
`evaluation-slice` after chat + admin. `hardening-slice` last.

Replace `<slice>` with the change name (`foundation-slice`, `ingestion-slice`,
…).

This file is **workflow, not requirements**. On conflict with BRD, NFR, ADRs,
or the capability plan, report the drift — do not silently patch those docs.

---

## Preconditions (once)

1. Merge trusted-loop work onto `main` if still on a feature branch.
2. Replace `@OWNER` in `.github/CODEOWNERS` with a real GitHub user or team.
3. GitHub → Settings → Branches → protect `main`: require status check
   `docs-verify`. After foundation, also require `backend-verify` and
   `frontend-verify`.
4. Require PR approvals only if a second reviewer exists. Solo: skip required
   approvals; record waiver in `docs/current-state.md`.
5. Never implement on `main`. One slice (or sub-PR) per branch.
6. Per-slice plans live in `docs/qa/slice-plans/`. Copy `_template-*.md` when
   **that** slice starts (after the previous slice is archived). Do not
   pre-write slices 2–6. `/opsx-apply` is **During**, not Before. Foundation
   trio: `01-foundation-before.md`, `01-foundation-during.md`,
   `01-foundation-after.md`.

---

## Phase A — Spec (before any implementation code)

Follow `docs/qa/slice-plans/<NN>-<name>-before.md` when it exists. No
`/opsx-apply` in this phase.

1. Create branch: `git checkout -b feat/<slice>`.
2. Foundation only: skip propose. OpenSpec already at
   `openspec/changes/foundation-slice/`. Go to point 6.
3. Slices 2–6: paste `docs/spec-prompts/0N_<slice>.md` into an agent session
   and run `/opsx-propose <slice>`.
4. Confirm these files exist: `openspec/changes/<slice>/proposal.md`,
   `openspec/changes/<slice>/design.md`, `openspec/changes/<slice>/tasks.md`,
   `openspec/changes/<slice>/specs/**/spec.md`.
5. Put every closing matrix row ID in delta specs (`FND-n`, `ING-ACn`,
   `SRCH-ACn`, `CHAT-ACn`, `ADM-ACn`, `EVAL-ACn`, `OBS-ACn`, `RET-DOC` /
   `RET-CHAT` / `RET-AUDIT`). Report conflicts. Do not silently patch `docs/`.
6. Write `docs/specs/<NN>_<Slice>_Spec.md` (foundation:
   `docs/specs/01_Foundation_Spec.md`, tasks 1.1–1.4).
7. Run:

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-traceability.mjs --slice <slice> --phase docs --write
node scripts/check-traceability.mjs --check-fresh
node scripts/check-doc-links.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
node scripts/check-verification-manifest.mjs
node scripts/check-golden-seed.mjs
```

8. Commit `docs/qa/traceability-report.md` and the spec files. CI runs
   `--check-fresh` without `--write`; uncommitted report fails.
9. If any command exits non-zero: stop. Do not start Phase B.

---

## Phase B — Implement (one OpenSpec task at a time)

This is the `/opsx-apply` phase. Follow
`docs/qa/slice-plans/<NN>-<name>-during.md` when it exists.

1. Start apply: `/opsx-apply <slice>`.
2. For each `- [ ]` in `openspec/changes/<slice>/tasks.md`:
   1. State the task id.
   2. Write tests first. Annotate `@trace <row-id>` when test files exist.
   3. Run the smallest proving command for that task. Examples after Gradle
      exists:

```bash
./gradlew test --tests <TestClass>
./gradlew test
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
```

   4. Confirm the test is red (non-zero) before production code for that
      behavior.
   5. Implement the minimum code to pass.
   6. Re-run the same proving command. Exit 0 required.
   7. Paste the decisive output line into the session (later into the PR).
   8. Only then change `- [ ]` to `- [x]`.
3. Do not refactor unrelated files.
4. New architecture decision: add a new file under `docs/adr/`. Do not
   silently edit accepted ADRs.
5. HTTP contract change: edit `openapi/*.yaml` in the same change, then:

```bash
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
```

---

## Phase C — Red/green evidence

1. After the first failing matrix-row test run, before the code that makes it
   pass, write `openspec/changes/<slice>/evidence/red-run.json`:

```json
{
  "exitCode": 1,
  "failingTests": ["com.example.FooTest.bar"],
  "gitHead": "<sha from git rev-parse HEAD>",
  "timestamp": "<ISO-8601>"
}
```

2. Capture SHA and time:

```bash
git rev-parse HEAD
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

3. After the slice is green, write
   `openspec/changes/<slice>/evidence/green-run.json` with `exitCode: 0`,
   `failingTests: []`, a **different** `gitHead`, a **later** `timestamp`.
4. Run:

```bash
node scripts/check-red-green-evidence.mjs --slice <slice>
```

5. CI will run this automatically via:

```bash
node scripts/check-slice-gates.mjs
```

once those JSON files exist.

---

## Phase D — Local full battery (before PR)

1. Docs/contract (always):

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs --slice <slice>
```

2. Backend (after Gradle wrapper exists):

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
```

3. Frontend (after `frontend/` exists):

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

4. Traceability against tests (after `@trace` tags exist):

```bash
node scripts/check-traceability.mjs --slice <slice> --phase full --write
node scripts/check-traceability.mjs --phase full --check-fresh
```

5. If review findings exist: copy `docs/qa/remediation-ledger.template.md` to
   `openspec/changes/<slice>/evidence/remediation-ledger.md`, fill FIND
   blocks, then:

```bash
node scripts/check-remediation-ledger.mjs --file openspec/changes/<slice>/evidence/remediation-ledger.md
```

6. Every closing matrix row needs `@trace <row-id>` in a test, or a written
   handoff to a later slice. Missing IDs fail `--phase full`.
7. If any command is red: stop. Do not open the PR.

---

## Phase E — Close, archive, handoff

Follow `docs/qa/slice-plans/<NN>-<name>-after.md` when it exists.

1. Confirm every checkbox in `openspec/changes/<slice>/tasks.md` is `[x]` and
   each had a proving command.
2. Confirm the slice-specific gate (Phase G below).
3. Archive: `/opsx-archive <slice>`.
4. Sync main specs if prompted: `/opsx-sync`.
5. Confirm `docs/specs/<NN>_<Slice>_Spec.md` exists.
6. Last edit: prepend a new ISO-8601 entry to `docs/current-state.md` that
   names `<slice>`.
7. Run:

```bash
node scripts/check-handoff-fresh.mjs --slice <slice>
node scripts/check-slice-gates.mjs --slice <slice>
```

---

## Phase F — PR, CI, merge

1. Push: `git push -u origin HEAD`.
2. Open PR. Fill `.github/pull_request_template.md`: slice name, matrix row
   IDs, commands + decisive output, rollback note.
3. CI always runs `docs-verify`:

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs
```

plus Mermaid render and gitleaks (CI only).

4. After foundation uncomments jobs, CI also runs:

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run test:e2e && npm run build
```

5. CodeRabbit comments are advisory. Do not treat them as merge approval.
6. Non-author human approval if a second person exists. Solo: merge on green
   CI + documented waiver.
7. Merge only if Phases A–E all exited 0.

---

## Phase G — Slice-specific extra work

### 1. `foundation-slice`

1. Rows: FND-1..FND-8; OBS-AC1/7/8 via audit.
2. Tasks 1.1–1.4: write `docs/specs/01_Foundation_Spec.md`; run Phase A
   commands with `--slice foundation-slice`.
3. Task 2.1: create Gradle wrapper (Java 21, Spring Boot, Flyway, OAuth2
   resource server, Testcontainers, ArchUnit, pgvector JDBC).
4. Task 2.2, **same commit as wrapper**: uncomment `backend-verify` in
   `.github/workflows/ci.yml`. Then:

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze test jacocoTestCoverageVerification build
```

5. Tasks 2.3–2.6: package tree (`documents.pipeline`, `evaluation`,
   `worker.runtime` — never `worker.pipeline` / `worker.eval`); `api`/`worker`
   profiles; Compose (PostgreSQL 16 + pgvector, Keycloak, MinIO, two JVMs,
   frontend).
6. Task 2.7: React + TypeScript shell. **Same commit as
   `frontend/package-lock.json`**: uncomment `frontend-verify`. Then:

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

7. Tasks 3.1–3.6: shared VOs. Prove compile:

```bash
./gradlew test
```

8. Tasks 4.1–4.10: nine ArchUnit walls **before** domain code. For each wall:
   introduce an intentional violation, confirm `./gradlew test` fails, revert,
   confirm green.
9. Tasks 5–8: Flyway V1 + canary FK chain + deny rows; stubs fail-closed;
   bootstrap API + in-transaction audit; OIDC login + workspace list.
10. Tasks 9–10: Testcontainers + integration tests with `@trace FND-n`;
    JaCoCo 70% aggregate / 90% policy/audit/search; Playwright journey #1
    under `frontend/e2e/`.
11. Slice gate: ArchUnit red-then-green proven; canary seeded and detectable;
    audit UPDATE/DELETE rejected; audit in same transaction as mutation.
12. Extra:

```bash
./gradlew test jacocoTestCoverageVerification
npx --yes @redocly/cli@2.44.1 lint openapi/admin.yaml --extends=minimal
```

Confirm no stale `worker.pipeline` / `worker.eval` terms. Confirm no Kafka,
Redis-as-correctness, Kubernetes, dedicated vector DB.

### 2. `ingestion-slice`

1. Blocked until foundation is merged.
2. Rows: ING-AC1..ING-AC11.
3. Phase A with `docs/spec-prompts/02_ingestion-slice.md` and
   `--slice ingestion-slice`.
4. Before merge, make `tools/benchmark/` runnable and run:

```bash
cd tools/benchmark
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python generate_corpus.py --output ./corpus/
python load_corpus.py --dsn "$BENCHMARK_DATABASE_URL" --corpus ./corpus/
python run_benchmark.py --dsn "$BENCHMARK_DATABASE_URL" --seed ../../docs/eval/golden-seed.yaml
```

Pass: recall@8 ≥ 0.85 and p95 ≤ 1.0 s. Fill
`docs/adr/019-pgvector-index-parameters.md`.

5. Implement pipeline, async AV, worker jobs, delete-during-reindex (ING-AC7).
6. Add golden-seed cases for new error surfaces; then:

```bash
node scripts/check-golden-seed.mjs
```

7. Slice gate: ADR-019 filled; ING-AC7 test green; Phase D battery green.

### 3. `chat-slice`

1. Blocked until foundation + ingestion merged.
2. Rows closing here: SRCH-AC1, SRCH-AC2, SRCH-AC4, SRCH-AC5, CHAT-AC1,
   CHAT-AC3, CHAT-AC4, CHAT-AC5, CHAT-AC6, CHAT-AC7.
3. Do **not** close SRCH-AC3 or CHAT-AC2 here. Record handoff to
   `evaluation-slice`.
4. Phase A with `docs/spec-prompts/03_chat-slice.md` and `--slice chat-slice`.
5. Implement search read path, `rag`, `chat`, SSE
   (`token`/`citation`/`heartbeat`/`done`/`error`), fail-closed provider
   (CHAT-AC5), refusal unit/integration tests.
6. Slice gate: SSE contract tests green; CHAT-AC5 tests green; refusal path
   green (golden-suite acceptance waits for evaluation).

### 4. `admin-slice`

1. Blocked until foundation merged. May run in parallel with ingestion/chat.
2. Rows: ADM-AC1..ADM-AC6.
3. Phase A with `docs/spec-prompts/04_admin-slice.md` and
   `--slice admin-slice`.
4. Implement full CRUD, four-eyes, deny-precedence, rate-limit fail-closed,
   notifications.
5. Slice gate: ADM-AC3 and ADM-AC6 tests green; rate-limit fail-closed test
   green.

### 5. `evaluation-slice`

1. Blocked until chat + admin merged.
2. Rows: EVAL-AC1..EVAL-AC5 plus **close** SRCH-AC3 and CHAT-AC2.
3. Phase A with `docs/spec-prompts/05_evaluation-slice.md` and
   `--slice evaluation-slice`.
4. Eval runner must call the live RAG pipeline (not a parallel fake path).
5. Manual (not CI): run the golden suite; write `docs/qa/eval-report.md`
   (create that file on first run).
6. Slice gate: negative-ACL, ranking-comparison, refusal cases pass;
   refusal-that-got-an-answer is `fail` regardless of LLM-judge (EVAL-AC2);
   synthetic >5 pp drop fires admin alert (EVAL-AC3).

### 6. `hardening-slice`

1. Blocked until chat + admin + evaluation merged.
2. Rows: OBS-AC2..OBS-AC6, RET-DOC, RET-CHAT, RET-AUDIT.
3. Phase A with `docs/spec-prompts/06_hardening-slice.md` and
   `--slice hardening-slice`.
4. Implement retention purge, content-minimized logging on `api` and
   `worker`, NDJSON audit export, Playwright top-10 journeys from
   `docs/qa/e2e-journeys.md`.
5. Extra:

```bash
./gradlew check
cd frontend && npm run test:e2e
```

6. Slice gate: RET-DOC / RET-CHAT / RET-AUDIT tests green; OBS-AC3 both
   profiles; OBS-AC4 export round-trip; E2E top-10 green.

---

## After all six slices (once)

1. Traceability all rows:

```bash
node scripts/check-traceability.mjs --phase full --write
node scripts/check-traceability.mjs --phase full --check-fresh
```

2. Confirm `docs/qa/eval-report.md` and filled
   `docs/adr/019-pgvector-index-parameters.md` exist.
3. Release battery:

```bash
./gradlew check dependencyCheckAnalyze
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run test:e2e && npm audit --audit-level=high
node scripts/check-traceability.mjs --phase full --check-fresh
node scripts/check-doc-links.mjs
```

4. Global review; fix findings; re-run the same commands; CI green on the
   release commit; deploy smoke; prepend `docs/current-state.md`.
5. UAT bugs: add regression test `@trace BUG-x`; retrieval/answer bugs also
   add a golden-seed case; then:

```bash
./gradlew check
node scripts/check-traceability.mjs --phase full --check-fresh
node scripts/check-golden-seed.mjs
```

---

## What CI runs vs what you run

1. Every PR, automatic (`docs-verify`): OpenAPI lint, OpenSpec strict, doc
   links, traceability freshness, golden-seed, slice-gates (when evidence
   exists), Mermaid, gitleaks.
2. After foundation uncomments jobs, automatic: Gradle
   lint/test/coverage/build; frontend lint/tsc/coverage/e2e/build.
3. You still run the same commands locally. Do not claim green from CI alone
   if you did not run them.
4. Never automatic: red/green JSON authoring, benchmark, golden-suite eval
   run, SAST, SBOM, Error Prone as a real task, non-author approval.
