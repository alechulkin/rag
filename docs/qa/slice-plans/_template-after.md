# After — `<slice>`

Phases E–F plus the slice-specific gate. Last repo edit is
`docs/current-state.md`.

1. Confirm every `tasks.md` checkbox is `[x]` and each had a proving command.
2. Confirm the slice-specific gate (fill below when copying this template).
3. Archive: `/opsx-archive <slice>`.
4. Sync main specs if prompted: `/opsx-sync`.
5. Confirm `docs/specs/<NN>_<Slice>_Spec.md` exists.
6. Last edit: prepend an ISO-8601 entry to `docs/current-state.md` that names
   `<slice>`.
7. Run (same as runbook Phase E):

```bash
node scripts/check-handoff-fresh.mjs --slice <slice>
node scripts/check-slice-gates.mjs --slice <slice>
```

8. Push: `git push -u origin HEAD`. Open PR. Fill
   `.github/pull_request_template.md`.
9. CI must be green: `docs-verify` always. After foundation uncomments jobs:
   `backend-verify` and `frontend-verify`.
10. Merge only if Before + During + this After all exited 0.
