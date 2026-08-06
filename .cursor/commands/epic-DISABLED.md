---
description: DISABLED — epic coordination script missing; use OpenSpec + quality gates.
---

# /epic-* commands — DISABLED

`scripts/github-coordination.js` is **not in this repository**. These ECC epic
commands are inert here.

## Use instead (RAG trusted loop)

1. Slice work: `openspec/changes/<slice>/` + `/opsx-apply` / openspec-apply-change skill
2. Gates: `docs/qa/verification-manifest.json` + `docs/checklists/quality-gates.md`
3. CI: `.github/workflows/ci.yml` `docs-verify`
4. Handoff: `docs/current-state.md`
5. Review findings: `docs/qa/remediation-ledger.template.md`

Do not invent a coordination script to “make epic-* work” unless a new ADR /
plan item authorizes GitHub epic automation.
