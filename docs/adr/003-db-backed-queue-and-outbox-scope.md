# ADR-003: DB-Backed Queue for MVP, Outbox Deferred

## Status
Accepted

## Context
MVP forbids broker-heavy infrastructure. Queue semantics still need durability and recovery.

## Decision
- Use PostgreSQL-backed durable queues (`ingestion_jobs`, `eval_runs`, `deletion_jobs`) with lease + retry + dead-letter semantics.
- Defer transactional outbox table until first external event consumer is in scope.
- Record pipeline milestones in `audit_events` for MVP visibility.

## Consequences
- No broker cost in MVP.
- Clear migration path to broker remains (triggered by ADR-006 conditions).
