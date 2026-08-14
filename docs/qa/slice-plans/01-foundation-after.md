# After — `foundation-slice`

Phases E–F plus the foundation slice gate. Last repo edit is
`docs/current-state.md`.

1. Confirm every checkbox in
   `openspec/changes/foundation-slice/tasks.md` is `[x]` and each had a
   proving command.
2. Slice gate:
   - ArchUnit walls proven red then green.
   - Canary seeded and detectable.
   - Audit UPDATE/DELETE rejected; audit in the same transaction as mutation.
3. Archive: `/opsx-archive foundation-slice`.
4. Sync main specs if prompted: `/opsx-sync`.
5. Confirm `docs/specs/01_Foundation_Spec.md` exists.
6. Last edit: prepend an ISO-8601 entry to `docs/current-state.md` that names
   `foundation-slice`.
7. Run:

```bash
node scripts/check-handoff-fresh.mjs --slice foundation-slice
node scripts/check-slice-gates.mjs --slice foundation-slice
```

8. Push: `git push -u origin HEAD`. Open PR. Fill
   `.github/pull_request_template.md` (rows FND-1..FND-8, OBS-AC1/7/8).
9. CI must be green: `docs-verify`, plus `backend-verify` and
   `frontend-verify` if those jobs were uncommented in During.
10. Merge only if Before + During + this After all exited 0.
11. Next: copy `docs/qa/slice-plans/_template-*.md` to
    `02-ingestion-before.md` / `during` / `after` and run
    `/opsx-propose ingestion-slice`.
