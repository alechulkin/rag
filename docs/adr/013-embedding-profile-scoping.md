# ADR-013: Embedding Profiles Are Workspace-Scoped

## Status
Accepted

## Context
Workspace AI policy selects embedding provider/model per workspace.

## Decision
- `embedding_profiles` are keyed by `(tenant_id, workspace_id)`.
- At most one `active` profile per tenant/workspace.
- Reindex builds new profile in `building`, then explicit cutover to `active`.

## Consequences
- Matches workspace-level AI policy and reindex behavior.
- Enables zero-downtime embedding migration without cross-workspace coupling.
