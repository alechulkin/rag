# ADR-010: DB Queue Semantics Are Lease-Based

## Status
Accepted

## Decision
For `ingestion_jobs`, `eval_runs`, and `deletion_jobs`:
- Dequeue with `SELECT ... FOR UPDATE SKIP LOCKED`.
- Use lease columns: `available_after_at`, `locked_until`, `worker_id`, `lock_token`.
- Retry with exponential backoff by pushing `available_after_at`.
- Mark dead-letter after max retries with explicit reason.
- Recover abandoned running jobs when `locked_until < now()`.

## Consequences
- Worker crashes do not strand jobs forever.
- Queue behavior remains deterministic without external broker.
