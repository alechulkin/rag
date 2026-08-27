---
description: Run the RAG trusted-loop quality gates (docs + backend).
---

# Quality Gate Command

Run the **minimum trusted loop** for this repository. Authoritative list:
`docs/qa/verification-manifest.json`.

## Default (blocking): docs + backend lint (when Gradle wrapper exists)

```bash
node scripts/hooks/quality-gate.js
```

If traceability is stale, regenerate and commit:

```bash
node scripts/check-traceability.mjs --write
```

## Slice close (when evidence exists)

```bash
node scripts/hooks/quality-gate.js --slice <slice>
```

## Notes

- `node scripts/hooks/quality-gate.js --backend-verify` runs full backend battery
  (dependency scan, tests, coverage, build) and may require `NVD_API_KEY`.
- `node scripts/hooks/quality-gate.js --docs-only` skips backend lint.
- Hook wiring for `--no-verify` block: `.cursor/hooks.json`.
- Human merge gate: `docs/qa/branch-protection.md`.

## Arguments

$ARGUMENTS — optional `--slice <name>` for slice-gates.
