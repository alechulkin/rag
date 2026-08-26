# Phase A — tasks 1.1–1.4 verification

Date: 2026-08-26T19:02:41Z  
Branch: `docs/foundation-phase-a-findings` (from `feat/foundation-slice`)  
Spec: `docs/specs/01_Foundation_Spec.md`

## Accepted findings

| Finding | Disposition |
|---------|-------------|
| `openapi/admin.yaml` bootstrap POST/PUT missing | Planned — **task 7.11** (During) |
| SAD §9.2 stale `worker.pipeline` / `worker.eval` | **Fixed** — ArchUnit rule text now uses `documents.pipeline` / `evaluation` (+ `worker.runtime` note) |
| OpenAPI gap not a Phase A blocker | Accepted |
| `openapi/common.yaml` unused-component warnings | Accepted — shared `$ref` library; Redocly lint-per-file cannot see cross-file refs |

## Traceability command (canonical)

```bash
node scripts/check-traceability.mjs --phase docs --write
node scripts/check-traceability.mjs --check-fresh
```

Do **not** pass `--slice` on `--write`. CI and `--check-fresh` regenerate the
full multi-slice report; a slice-filtered write fails the freshness gate.
Aligned with `docs/qa/slice-plans/01-foundation-before.md`.

## OpenAPI lint warnings

After adding tag `description` fields (no path/schema changes), Redocly reports
**4 warnings, 0 errors** — all `no-unused-components` on the shared library file:

- `openapi/common.yaml:19:5` — Component `"IdempotencyKey"` is never used.
- `openapi/common.yaml:42:5` — Component `"CursorPage"` is never used.
- `openapi/common.yaml:14:5` — Component `"X-Request-Id"` is never used.
- `openapi/common.yaml:9:5` — Security scheme `"bearerAuth"` is never used.

(Previously also 5× `tag-description` on Admin/Chat/Documents/Evaluation/Search —
cleared by adding tag descriptions only.)

## Verification battery (all exit 0)

```text
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
→ Totals: 1 passed, 0 failed (1 items)

node scripts/check-traceability.mjs --phase docs --write
→ wrote docs/qa/traceability-report.md / traceability OK

node scripts/check-traceability.mjs --check-fresh
→ traceability report fresh / traceability OK

node scripts/check-doc-links.mjs
→ doc links OK

npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
→ Woohoo! Your API descriptions are valid. (4 warnings, 0 errors)

node scripts/check-verification-manifest.mjs
→ verification manifest OK (17 gates, sections=5)

node scripts/check-golden-seed.mjs
→ golden-seed OK (50 benchmark, 10 refusal, 10 negativeAcl)
```
