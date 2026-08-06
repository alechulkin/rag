---
description: Run the RAG trusted-loop quality gates (docs phase).
---

# Quality Gate Command

Run the **minimum trusted loop** for this repository. Authoritative list:
`docs/qa/verification-manifest.json`.

## Docs-phase battery (blocking)

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs
```

If traceability is stale, regenerate and commit:

```bash
node scripts/check-traceability.mjs --write
```

## Slice close (when evidence exists)

```bash
node scripts/check-slice-gates.mjs --slice <slice>
# or individually:
node scripts/check-red-green-evidence.mjs --slice <slice>
node scripts/check-handoff-fresh.mjs --slice <slice>
node scripts/check-remediation-ledger.mjs --file openspec/changes/<slice>/evidence/remediation-ledger.md
```

## Notes

- ECC formatter hook `scripts/hooks/quality-gate.js` is **not** part of this repo.
- Hook wiring for `--no-verify` block: `.cursor/hooks.json`.
- Human merge gate: `docs/qa/branch-protection.md`.

## Arguments

$ARGUMENTS — optional `--slice <name>` for slice-gates only.
