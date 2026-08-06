# Local hook scripts (Cursor + shared)

Minimal in-repo hooks. Wired from `.cursor/hooks.json`.

| Script | Role |
|--------|------|
| `block-no-verify.js` | Block `git commit`/`push` when `--no-verify`/`-n` is a real flag |

ECC scripts referenced by unused wrappers (`session-start.js`, `quality-gate.js`, etc.) are **intentionally absent**. Prefer RAG trusted loop (`docs/qa/verification-manifest.json`) over inventing ECC harness files.
