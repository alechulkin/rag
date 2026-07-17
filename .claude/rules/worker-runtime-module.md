---
paths:
  - backend/src/main/java/**/worker/runtime/**
  - src/main/java/**/worker/runtime/**
---

# Worker Runtime Rules

- Dequeue with lease semantics aligned to ADR-010 (`lock_token`, `available_after_at`, `locked_until`).
- Use `FOR UPDATE SKIP LOCKED` for safe concurrent workers.
- Retries must be bounded with backoff and terminal dead-letter state.
- Worker context must carry explicit tenant/workspace from job row.
- Keep processing idempotent; retries must not duplicate side effects.
- Enforce tenant fairness in scheduler/dequeue strategy.
