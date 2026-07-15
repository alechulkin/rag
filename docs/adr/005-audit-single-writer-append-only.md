# ADR-005: Audit Module Is Sole Writer, Append-Only Enforced

## Status
Accepted

## Context
Auditability is non-negotiable for tenant isolation, lifecycle changes, and AI provider governance.

## Decision
- `audit` module is only write path to `audit_events`.
- DB role grants: INSERT allowed, UPDATE/DELETE denied.
- Trigger blocks UPDATE/DELETE.
- Monthly partitioning retained.

## Consequences
- Strong tamper resistance from application layer.
- Predictable retention and export maintenance.
