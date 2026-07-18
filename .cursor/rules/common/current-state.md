# Current State Log

> This file extends [common/development-workflow.md](./development-workflow.md) with a mandatory session-handoff record.

`docs/current-state.md` is the running log of what the agent last did in this repo. It exists so any agent (or human) picking up the session can see recent activity without replaying chat history.

## Rule

- `docs/current-state.md` must always exist. If missing, create it using the template below before doing anything else.
- At the end of any non-trivial task (new feature, doc change, refactor, multi-file edit, bug fix — not a single read-only question), prepend a new entry to `docs/current-state.md`.
- Newest entry goes at the top, directly under the `# Current State` heading. Do not delete older entries; this is a log, not a status snapshot.
- Do not touch `docs/current-state.md` for pure Q&A, exploration, or read-only requests that changed nothing.

## Entry Format

```markdown
## <ISO 8601 timestamp, e.g. 2026-07-18T16:02:00+03:00>

- **Task:** one-line description of what was asked
- **Actions:** what the agent actually did (files created/edited, decisions made)
- **Status:** done / partial / blocked
- **Next steps / open items:** anything left unresolved, or "none"
```

## Example

```markdown
## 2026-07-18T16:02:00+03:00

- **Task:** Add rule requiring a current-state log
- **Actions:** Added .cursor/rules/common/current-state.md; created docs/current-state.md
- **Status:** done
- **Next steps / open items:** none
```

## Notes

- Timestamps use the user's local timezone offset as given by the session, ISO 8601 format.
- Keep each entry short (3-6 lines). This is a changelog, not a design doc — link to ADRs, PRDs, or commits instead of duplicating their content.
- This file is documentation-workflow metadata, not a source of truth for architecture — it never overrides `docs/BRD.md`, ADRs, or other canonical docs.
