# Before — `<slice>`

Phase A only. No `/opsx-apply`. No implementation code. Stop on non-zero exit.

1. Create branch: `git checkout -b feat/<slice>`.
2. If OpenSpec change does not exist: paste `docs/spec-prompts/0N_<slice>.md`
   and run `/opsx-propose <slice>`. If it already exists: skip propose.
3. Confirm: `openspec/changes/<slice>/proposal.md`, `design.md`, `tasks.md`,
   `specs/**/spec.md`.
4. Cite every closing matrix row ID in delta specs. Report conflicts. Do not
   silently patch `docs/`.
5. Write `docs/specs/<NN>_<Slice>_Spec.md`.
6. Run:

```bash
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-traceability.mjs --phase docs --write
node scripts/check-traceability.mjs --check-fresh
node scripts/check-doc-links.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
node scripts/check-verification-manifest.mjs
node scripts/check-golden-seed.mjs
```

7. Commit spec files + `docs/qa/traceability-report.md`.
8. If any command is red: stop. Do not start During.
