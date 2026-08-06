# Remediation Ledger

Copy to `openspec/changes/<slice>/evidence/remediation-ledger.md` when a review
produces findings. Max attempts caps uncontrolled agent retries.

Max attempts: 3

Slice: `<slice-name>`
Reviewer: `<human-or-agent-id>`
Opened: `<ISO-8601>`

<!--
### FIND-001

- Severity: HIGH
- Owner: implementer
- Attempt: 1
- Disposition: open
- Evidence: path/to/failing-test or PR comment URL
- Next action: fix null check in PolicyEngine.resolvePermissions
-->

## Rules

- One finding per `FIND-nnn` block.
- `Disposition`: `open` | `fixed` | `wontfix` | `deferred`.
- `Attempt` increments on each remediation cycle; stop at Max attempts and escalate to human.
- `open` requires `Next action`.
- `fixed` requires Evidence pointing at re-run green command output or commit SHA.
- Validate: `node scripts/check-remediation-ledger.mjs --file <path>`
