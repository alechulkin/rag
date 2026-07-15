# ADR-015: Audit Write Semantics by Flow Type

## Status
Accepted

## Decision
- For transactional CUD actions (ACL, roles, upload metadata, deletion requests), audit writes are in the same DB transaction.
- For long-running streamed chat/eval flows, audit is written after completion/interruption in a dedicated transaction.
- Rule: successful action produces one audit record; rolled-back transactional action produces none.

## Consequences
- Keeps strict transactional guarantees where technically valid.
- Avoids impossible transaction coupling across long-lived streams.
