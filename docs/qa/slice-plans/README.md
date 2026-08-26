# Per-slice plans (before / during / after)

Write **three** files per slice. Do **not** pre-write slices 2–6. Foundation
changes package layout, CI jobs, and schema; later plans would go stale.

## When to write

1. Copy the three `_template-*.md` files when **that** slice’s Phase A starts.
2. Archive the previous slice first (except foundation).
3. Fill `<slice>` from the new OpenSpec change (`/opsx-propose` for slices 2–6).
4. Commands and stop rules stay in `docs/qa/slice-implementation-runbook.md`.
   These files **sequence** work; they do not replace `tasks.md`. Traceability
   `--write` is always **unsliced** so `--check-fresh` / CI match the
   committed full report.

## Mapping

| Plan | Runbook | OpenSpec |
|------|---------|----------|
| Before | Phase A | propose (skip if change exists) + spec doc |
| During | Phases B–D | **`/opsx-apply`** — implementation |
| After | Phases E–F | `/opsx-archive` + handoff + PR |

## Files

| Slice | Before | During | After |
|-------|--------|--------|-------|
| 1 Foundation | `01-foundation-before.md` | `01-foundation-during.md` | `01-foundation-after.md` |
| 2 Ingestion | copy templates when slice starts | | |
| 3 Chat | copy templates when slice starts | | |
| 4 Admin | copy templates when slice starts | | |
| 5 Evaluation | copy templates when slice starts | | |
| 6 Hardening | copy templates when slice starts | | |

Naming for later slices: `02-ingestion-before.md`, `02-ingestion-during.md`,
`02-ingestion-after.md` (same pattern for 03–06).
