# Quality Gates G0–G8 — RAG Platform

Hard exit criteria per delivery phase. A gate passes only when EVERY criterion
holds. Record each gate's passage in [docs/current-state.md](../current-state.md)
and a git commit.

**Gates are commands.** Each gate lists its deterministic command set — every
command must exit 0. Judgment criteria (reviews, sign-offs) sit ON TOP of green
commands, never instead of them. A red command is a STOP; fixing the check is
allowed, weakening or bypassing it is not.

This checklist is **workflow, not requirements** — subordinate to the
source-of-truth chain (AGENTS.md precedence) and to
[docs/mvp-capability-plan.md](../mvp-capability-plan.md) (the plan). Where a
criterion here restates the plan §5 Definition of Done, the plan wins; report
drift, do not silently patch either document.

Adapted from a generic template. Intentionally **not** ported because no BRD/NFR
requirement demands them and some conflict with plan §4 exclusions: automated
demo recordings + vision verification, trajectory-eval workflow, CI-scheduled
eval runs (explicitly out of scope for v1 — plan §4), TS eval-runner harness
(`evals/cases/*.eval.ts`) — the eval runner here is the `evaluation` backend
module reusing the live RAG pipeline (EVAL-AC1).

**Command legend:** `[active]` runs today (docs phase, CI `docs-verify`);
`[foundation+]` becomes mandatory once the foundation slice lands its
Gradle/frontend trees and enables the commented CI jobs.

---

## G0 — Repo & docs scaffold — **PASSED (docs phase)**

```bash
node scripts/check-doc-links.mjs                                          # [active]
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal       # [active]
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict              # [active]
node scripts/check-verification-manifest.mjs                              # [active]
```

- [x] `AGENTS.md` + `.agents/skills/rag-*` in place; ADR-001..019 in `docs/adr/`.
- [x] OpenSpec initialized (`openspec/config.yaml`, `openspec/specs/README.md` placeholder; main capability specs appear on archive sync; per-slice changes under `openspec/changes/`).
- [x] CI `docs-verify` job live (manifest, OpenAPI lint, OpenSpec strict, links,
      traceability freshness **without rewrite**, golden-seed schema, slice gates,
      Mermaid render, gitleaks, evidence artifact upload).
- [x] `docs/current-state.md` handoff log exists and is maintained
      (rule: `.cursor/rules/common/current-state.md`).
- [x] Git initialized, history clean of secrets (gitleaks in CI).
- [x] Minimum trusted loop contract: `docs/qa/verification-manifest.json` +
      `docs/qa/branch-protection.md` + `.github/CODEOWNERS` (replace `@OWNER`).

## G1 — Product framing — **PASSED**

- [x] `docs/BRD.md`, `docs/NFR.md`, `docs/BA_Analysis.md`, `docs/prd/01..06` exist.
- [x] Acceptance criteria numbered per PRD §10 and mapped to plan-local row IDs
      (`FND-n`, `ING-ACn`, …, plan §1).
- [x] Scope in/out fixed (plan §4; BRD §3.4/§5 roadmap lists).

## G2 — Baseline specs — repeats per slice, before implementation starts

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict              # [active]
node scripts/check-traceability.mjs --write && node scripts/check-traceability.mjs --check-fresh   # [active]
```

- [ ] The slice's OpenSpec change (`openspec/changes/<slice>/`) validates
      strictly: proposal, design, delta specs, tasks.
- [ ] Every plan §1 matrix row closing in the slice is cited in the slice's
      delta specs (traceability phase `docs` enforces).
- [ ] Cross-doc conflicts found during spec work are **reported**, never
      silently resolved (AGENTS.md protected rule).

## G3 — Capability plan — **PASSED (approved 2026-08-05)**

- [x] `docs/mvp-capability-plan.md` complete: ownership matrix, slice DAG
      (acyclic, critical path in §2), scope, per-slice DoD, sign-off table.
- [x] Product owner + tech lead signed off (plan §7).

## G4 — Per slice (repeat for slices 1–6)

```bash
# Docs/contract surface — always
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal       # [active]
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict              # [active]
node scripts/check-doc-links.mjs                                          # [active]
node scripts/check-golden-seed.mjs                                        # [active]
node scripts/check-verification-manifest.mjs                              # [active]
node scripts/check-traceability.mjs --phase full --write \
  && node scripts/check-traceability.mjs --phase full --check-fresh       # [foundation+] (docs phase until test code exists)

# Code surface — once trees exist
./gradlew checkstyleMain checkstyleTest spotbugsMain dependencyCheckAnalyze \
  test jacocoTestCoverageVerification build                               # [foundation+]
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build   # [foundation+]

# Slice evidence — CI runs via check-slice-gates.mjs when evidence/ present
node scripts/check-slice-gates.mjs                                        # [active] CI
node scripts/check-red-green-evidence.mjs --slice <slice>                 # [active] once evidence written
node scripts/check-handoff-fresh.mjs --slice <slice>                      # [active] at slice close
node scripts/check-remediation-ledger.mjs --file openspec/changes/<slice>/evidence/remediation-ledger.md  # [active] when ledger exists
```

- [ ] G2 held for this slice **before** implementation started.
- [ ] All `tasks.md` checkboxes ticked, truthfully — each `[x]` requires focused verification already run (see `docs/qa/verification-manifest.json` → `openspecApply`).
- [ ] **Red-first evidence** (plan §5 DoD item 5): tests for matrix rows written from
      the spec and observed to FAIL before implementation, then made green; no
      test weakened to pass. Durable evidence saved as
      `openspec/changes/<slice>/evidence/red-run.json` (non-zero exit,
      failing test list, gitHead, timestamp) and `green-run.json` (exit 0).
- [ ] Every matrix row closing in the slice has ≥ 1 test annotated
      `@trace <row-id>` (traceability phase `full`); deferred rows have an
      explicit handoff recorded (plan §5 DoD item 2).
- [ ] ArchUnit walls green; each wall demonstrably red on an intentional
      violation at least once (foundation slice proves this; later slices keep
      them green).
- [ ] Coverage floors hold per [docs/qa/coverage-policy.md](../qa/coverage-policy.md)
      (≥ 70% backend aggregate, ≥ 90% policy/audit/search/retention).
- [ ] **Slice-specific gate met** (plan §5 gate table — e.g. ingestion:
      SAD §9.1 benchmark + ADR-019 filled; chat: SSE conformance + fail-closed
      provider tests; admin: four-eyes + deny-precedence).
- [ ] Golden-seed cases covering the slice's new error surface added or
      confirmed present in `docs/eval/golden-seed.yaml`
      (see [docs/eval/README.md](../eval/README.md) consumers table).
- [ ] Protected rules hold (AGENTS.md): no cross-tenant exposure,
      pre-retrieval filtering, fail-closed provider gate, no secrets, canary
      never in results.
- [ ] PR reviewed by ≥ 1 approver who is not the implementer (PR template +
      branch protection; CodeRabbit advisory only); ALL confirmed findings
      recorded in remediation ledger, fixed or escalated, and commands re-run green.
- [ ] No API endpoint in the slice can 500 on user input; errors are
      `ProblemDetails` (ADR-009); no silent external failures.
- [ ] Change archived (`openspec list` shows no active change for the slice),
      `docs/specs/<NN>_<Slice>_Spec.md` exists, `docs/current-state.md`
      updated LAST, slice committed with the row IDs referenced.

## G5 — Cross-cutting hardening (closes with `hardening-slice`)

```bash
./gradlew check                                                           # [foundation+]
cd frontend && npm run test:e2e                                           # [foundation+]
```

- [ ] E2E suite covers the top-10 journeys in
      [docs/qa/e2e-journeys.md](../qa/e2e-journeys.md), including auth + RBAC
      negative cases.
- [ ] Retention purge paths verified (RET-DOC / RET-CHAT / RET-AUDIT);
      content-minimized logging proven in both runtime profiles (OBS-AC3);
      NDJSON audit export round-trip (OBS-AC4).
- [ ] Seed data idempotent — re-running Flyway seed / compose bootstrap
      re-pins baseline state.
- [ ] Coverage ratchet applied per policy: thresholds raised where headroom
      ≥ 5 pp for two consecutive main builds; thresholds never lowered.

## G6 — QA proof pack

- [ ] Traceability matrix (phase `full`) all green: every MVP matrix row has
      spec citation + `@trace`'d test (or an explicit recorded reason).
- [ ] **Golden suite executed end-to-end** through the `evaluation` module
      (manually triggered — scheduled/CI eval runs are out of scope, plan §4):
      negative-ACL, ranking-comparison (SRCH-AC3), and refusal (CHAT-AC2)
      cases pass; deterministic oracle beats LLM-judge on refusal cases
      (EVAL-AC2). Results recorded in `docs/qa/eval-report.md`.
- [ ] Benchmark evidence current: ADR-019 numbers reproducible (p95 ≤ 1.0 s,
      recall@8 ≥ 0.85 at 100k chunks).
- [ ] a11y: WCAG 2.2 AA per [Design_System.md §7](../Design_System.md) —
      axe checks wired into the Playwright suite pass in light and dark;
      [UI_Review_Checklist §3](UI_Review_Checklist.md) applied in review.
- [ ] Manual test plan executable by a non-developer; demo script written.
- [ ] Risk register and acceptance report drafted.

## G7 — Global review & release

```bash
./gradlew check dependencyCheckAnalyze                                    # [foundation+]
cd frontend && npm run lint && npx tsc --noEmit && npm run test:coverage && npm run test:e2e && npm audit --audit-level=high   # [foundation+]
node scripts/check-traceability.mjs --phase full --check-fresh            # [foundation+]
node scripts/check-doc-links.mjs                                          # [active]
```

- [ ] Global review over the whole codebase; all confirmed findings fixed;
      commands re-run green.
- [ ] Authz matrix verified per route × role (ADMIN/CONTRIBUTOR/USER/VIEWER
      + capability flags); no secrets in repo or history.
- [ ] NFRs resolved by class: **local-verifiable** NFRs actually verified
      (coverage, a11y, validation, benchmark, ArchUnit); **deploy-gated** NFRs
      (per-tenant SLO gauges under real load, uptime, live p95) marked
      *pending live measurement* explicitly — never silently skipped.
- [ ] CI green on the release commit — the loop nobody can skip.
- [ ] Deployed; live URL smoke-checked (status, no localhost leakage, clean
      error logs); deployment recorded in `docs/current-state.md`.
- [ ] Committed and pushed (push target approved by user).

## G8 — UAT round (repeat per bug report)

```bash
./gradlew check                                                           # [foundation+]
node scripts/check-traceability.mjs --phase full --check-fresh            # [foundation+]
```

- [ ] Every reported bug has a verdict citing the governing requirement
      (BRD/NFR/PRD section or matrix row); low-confidence verdicts
      double-checked.
- [ ] Confirmed defects clustered by mechanism; each fix covers the class,
      including latent locations.
- [ ] Every fix has a regression test annotated `@trace BUG-x`; retrieval- or
      answer-quality defects also get a golden-seed regression case tagged
      with the bug ID.
- [ ] Full battery green; original reproduction steps re-tested live.
- [ ] Bug-fix report written (traceability, root causes, evidence); handoff
      updated; deployed build verified to serve the fix.

---

## Slice evidence tooling (G4)

| Script | Purpose |
|--------|---------|
| `scripts/check-slice-gates.mjs` | CI entry: for each change with evidence runs, validate red/green (+ handoff if green, + ledger if present). |
| `scripts/check-red-green-evidence.mjs --slice <slice>` | Validate `openspec/changes/<slice>/evidence/{red,green}-run.json` shape and ordering (red exit ≠ 0 + failingTests, green exit 0, red timestamp/gitHead precede green). Resolves archived changes too. |
| `scripts/check-handoff-fresh.mjs --slice <slice>` | Fail if `docs/current-state.md` newest entry omits the slice or predates the baseline: green-run timestamp, else latest git commit on the change dir, else newest file mtime (10 min write-then-commit skew allowed). |
| `scripts/check-remediation-ledger.mjs --file <path>` | Validate bounded remediation ledger (max attempts, dispositions, open→next action). |
| `scripts/check-verification-manifest.mjs` | Validate `docs/qa/verification-manifest.json` shape + referenced scripts exist. |

`scripts/check-traceability.mjs` is **archive-aware**: after a change moves to
`openspec/changes/archive/YYYY-MM-DD-<slice>/`, row-ID enforcement continues
against the archived delta specs (newest matching archive wins).

`--check-fresh` never rewrites the report (CI must not `--write` before check).

Tip: run traceability for one slice only:

```bash
node scripts/check-traceability.mjs --slice foundation-slice --phase docs --write
node scripts/check-traceability.mjs --slice foundation-slice --phase docs --check-fresh
```
