# Current State Log

> This file extends [common/development-workflow.md](./development-workflow.md) with a mandatory session-handoff record.

`docs/current-state.md` is the running log of what the agent last did in this repo. It exists so any agent (or human) picking up the session can see recent activity without replaying chat history.

## Rule

- `docs/current-state.md` must always exist. If missing, create it using the template below before doing anything else.
- At the end of any task that changed the repo (docs/code/config), prepend a new entry to `docs/current-state.md`.
- Newest entry goes at the top, directly under the `# Current State` heading. Do not delete older entries; this is a log, not a status snapshot.
- Do not touch `docs/current-state.md` for pure Q&A, exploration, or read-only requests that changed nothing.

## Entry Format

```markdown
## <ISO 8601 timestamp, e.g. 2026-07-18T16:02:00+03:00>

- **Timestamp of last agent action:** same as heading (ISO 8601)
- **What was done by agent:** files edited/created + key decisions (1-3 bullets)
- **Current state:** what is true now, after changes (1-3 bullets)
- **Next steps:** concrete follow-ups (or "none")
- **Open questions / blockers:** unresolved decisions, missing info, or "none"
```

## Example

```markdown
## 2026-07-18T16:02:00+03:00

- **Timestamp of last agent action:** 2026-07-18T16:02:00+03:00
- **What was done by agent:** Added `.cursor/rules/common/current-state.md`; created `docs/current-state.md`
- **Current state:** Rule exists; log file exists
- **Next steps:** none
- **Open questions / blockers:** none
```

## Notes

- Timestamps use the user's local timezone offset as given by the session, ISO 8601 format.
- Keep each entry short (3-6 lines). This is a changelog, not a design doc — link to ADRs, PRDs, or commits instead of duplicating their content.
- This file is documentation-workflow metadata, not a source of truth for architecture — it never overrides `docs/BRD.md`, ADRs, or other canonical docs.
