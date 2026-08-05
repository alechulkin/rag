## What / why

<!-- 1–3 sentences. Link slice + OpenSpec change when applicable. -->

**Slice / change:** <!-- e.g. foundation-slice, docs/tooling, none -->

## Matrix rows touched

<!-- Plan §1 row IDs: FND-n, ING-ACn, SRCH-ACn, CHAT-ACn, EVAL-ACn, ADM-ACn, OBS-ACn, RET-DOC/RET-CHAT/RET-AUDIT — or "none (docs/tooling)" -->

## Definition of Done ([docs/mvp-capability-plan.md §5](../docs/mvp-capability-plan.md#5-definition-of-done-per-slice))

Tick only what applies to this PR (docs-phase PRs skip implementation-only items).

- [ ] **Spec:** OpenSpec change validates; slice spec doc reviewed against `docs/` (conflicts reported, not silently patched)
- [ ] **Traceability:** owned matrix rows cited in spec + covered by tests referencing row IDs (or explicit handoff to later slice)
- [ ] **Contract:** `openapi/*.yaml` updated and parses; API_Contracts §4 invariants hold
- [ ] **Schema:** Flyway migrations match Database_Schema §9; canonical schema doc updated when schema evolves
- [ ] **Tests:** unit + integration green; ArchUnit walls green; coverage per NFR §7.2; matrix-row tests red-first
- [ ] **Quality gates:** CI green (lint, SAST, dependency scan, secret scan); ≥ 1 non-author approver (NFR §7.1)
- [ ] **Protected rules:** no cross-tenant leak; pre-retrieval filtering; provider policy validation; fail-closed; no secrets in source/logs/fixtures; canary never in results
- [ ] **Slice gate:** slice-specific gate from plan §5 table met (or N/A for docs/tooling PR)
- [ ] **Evidence:** verification below; `docs/current-state.md` updated when repo changed

## Verification evidence

<!-- Commands run + decisive output line. Never claim green without running (rag-change-workflow). -->

```
<!-- paste commands + key output -->
```

## Rollback note (NFR §9.7)

<!-- How to revert safely: previous image tag, migration expand/contract, feature flag, or "docs-only — revert commit". -->

## Reviewer

- [ ] ≥ 1 **non-author** approver (NFR §7.1)
- [ ] Schema migration PR: separate review by DB-savvy reviewer when applicable (NFR §9.8)
