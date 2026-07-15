# ADR-014: Document Version Activation Is Atomic

## Status
Accepted

## Decision
- New version is not searchable until full indexing succeeds.
- Cutover transaction updates:
  - `document_versions.status = 'active'` for new version,
  - prior active version to `superseded`,
  - `documents.active_version_id`,
  - audit event.

## Consequences
- No partial-version visibility.
- Safe retry semantics for failed indexing runs.
