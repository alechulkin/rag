---
description: DISABLED — harness-audit.js missing; use verification-manifest + CI.
---

# /harness-audit — DISABLED

`scripts/harness-audit.js` is not in this repository.

Use instead:

```bash
node scripts/check-verification-manifest.mjs
node scripts/check-slice-gates.mjs
# full docs battery: see .cursor/commands/quality-gate.md
```

Or read `docs/qa/verification-manifest.json` and `.github/workflows/ci.yml`.
