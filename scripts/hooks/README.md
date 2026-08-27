# Local hook scripts (Cursor + shared)

Minimal in-repo hooks. Wired from `.cursor/hooks.json`.

| Script | Role |
|--------|------|
| `block-no-verify.js` | Block `git commit`/`push` when `--no-verify`/`-n` is a real flag |
| `quality-gate.js` | Run docs gates + backend lint/verify locally |
| `pre-push` | Git `pre-push` hook (calls `quality-gate.js --backend-verify`) |
| `install-pre-push.sh` | Install `pre-push` into `.git/hooks/pre-push` |

Prefer RAG trusted loop (`docs/qa/verification-manifest.json`) as source of truth; `quality-gate.js` is a convenience runner.
