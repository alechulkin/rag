# Communication Patterns — AI Knowledge Assistant (MVP)

**Status:** Draft v1.0  
**Source inputs:** `docs/Solution_Architecture.md` (communication matrix + cross-cutting concerns), `docs/Database_Schema.md` (DB queue semantics), `docs/Module_Boundaries.md`, ADRs `010` (DB queue semantics), `011` (SSE), `015` (audit write semantics).

> **Purpose.** Make cross-process and cross-service communication rules as explicit and testable as the schema and module walls: patterns, owners, retry semantics, and idempotency responsibilities.

---

## 1. Pattern matrix (canonical)

| Interaction | Pattern | Consistency | Failure stance | Retry owner | Idempotency |
|---|---|---|---|---|---|
| SPA → API | Sync REST | Read-your-writes | 4xx/5xx with `ProblemDetails` | Client (safe) / API (explicit) | `Idempotency-Key` for retry-sensitive writes |
| SPA → API | SSE stream | Eventual completion | Terminal `error` event + persisted diagnostics | Client re-asks (no resume) | Conversation/message IDs + server-side diagnostics |
| API → PostgreSQL | Transactional | Strong | Fail request | API | n/a |
| API → Object storage | Sync write | Strong ack, eventual indexing | Fail request if durable write fails | API | Content hash + idempotency key |
| Worker → PostgreSQL | Dequeue (DB queue) | Eventual | At-least-once processing | Worker | Lease token + stage idempotency |
| Worker → Object storage | Sync read/write | Eventual | Retry/backoff | Worker | Object key + checksum |
| API/Worker → AI providers | Sync outbound | Eventual | **Fail-closed** on policy/budget ambiguity | API/Worker | Request-level idempotency where provider supports it |
| API replica ↔ API replica | PG `LISTEN/NOTIFY` | Eventual | Degrade: bypass cache | API | Version row (`perm_cache_version`) |
| Worker scheduled jobs | Async | Eventual | Retry with backoff + checkpoint | Worker | Step checkpointing (deletion) |

This table expands SAD §6.3; the detailed semantics are below.

---

## 2. Sync REST pattern (SPA → API)

### 2.1 Invariants

- **Every request is permission-scoped** (tenant/workspace) and validated by Policy Engine (ADR-004).
- **Every error is RFC 7807** `ProblemDetails` with `requestId` (ADR-009).
- **Writes either succeed once or fail deterministically** when retried with the same idempotency key.

### 2.2 Retry guidance

- Safe retries:
  - `GET` is retryable.
  - `POST/PUT/DELETE` are retryable only with `Idempotency-Key` when the endpoint is declared idempotent.

---

## 3. SSE streaming pattern (Chat)

### 3.1 Contract

Defined by ADR-011 and PRD Chat §5.6.

- Event types: `token`, `citation`, `heartbeat`, `done`, `error`.
- Reconnect does not resume prior generation; client re-asks.

### 3.2 Audit + diagnostics durability

Per ADR-015:

- Streaming flows must still end with a persisted diagnostic/audit record even on disconnect.
- If the stream cannot be cleanly finalized in the same transaction as the user request, it is written in a separate transaction after termination.

---

## 4. DB-backed queue pattern (API ↔ Worker)

### 4.1 Semantics (lease-based, at-least-once)

Defined by ADR-010 and implemented at the schema level in `docs/Database_Schema.md`:

- Dequeue via `SELECT ... FOR UPDATE SKIP LOCKED`.
- Lease fields:
  - `lock_token` (unique per lease attempt)
  - `locked_until` (lease expiry for recovery)
  - `available_after_at` (backoff / scheduling)
- Recovery:
  - If a worker dies, leases expire and jobs become eligible again.

### 4.2 Idempotency requirements (worker side)

- **Stage-level idempotency**: each pipeline stage must be safe to re-run.
- **Checkpointing**:
  - Ingestion uses `current_stage`.
  - Deletion uses `last_completed_step` (step-checkpointed delete).

---

## 5. Postgres `LISTEN/NOTIFY` invalidation pattern

Used for permission-cache invalidation (SAD §7.1).

- **Correctness rule**: on `LISTEN` connection loss, flush cache and fall back to DB reads.
- **Resilience rule**: a monotonic `perm_cache_version` row detects missed notifications.

---

## 6. Validation checks (after doc updates)

- **Queue semantics match schema**: grep for `lock_token`, `locked_until`, `available_after_at` in `docs/Database_Schema.md` and ensure all job tables use the same lease model.
- **SSE event set** matches ADR-011 and PRD Chat.
- **No cross-process DTO leakage**: `api`↔`worker` communication is DB rows + object keys only (Module Boundaries + Shared Abstractions).

