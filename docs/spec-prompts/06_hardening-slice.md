# Prompt — Operational Hardening Slice Implementation Spec

Create `docs/specs/06_Hardening_Spec.md` — a detailed implementation
specification for the **operational hardening slice**
(Solution_Architecture.md §8 track 6). Assumes all previous slice specs exist.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries or conventions; reference
  `docs/Module_Boundaries.md`, `.claude/rules/audit-module.md`,
  `.claude/rules/worker-runtime-module.md`.
- Scope: MVP only. No SIEM streaming, no hash-chain tamper-evidence
  (post-MVP), no managed observability SaaS (ADR-008).
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

Retention purge jobs, hard-delete + deletion_jobs execution, four-eyes
deletion approval, audit partition lifecycle, metrics dashboard,
notification fallback, DSAR/export.

## The specification must include

1. **Retention purge framework**
   - `RetentionPolicy` config class in `admin` centralizes all periods
     (BRD §4.5: superseded versions 30d, chat metadata 90d, eval results
     180d, audit 1y, operational logs 30d, backups 30d; admin export
     artifacts 7d expiry per BA §7.7.c)
   - Per-owner `purgeExpired(Instant before)`: `documents` (superseded
     versions, expired soft-deletes), `chat` (content past retention),
     `audit` (partition detach)
   - Jobs run in worker profile via `worker.runtime`; step-checkpointed,
     idempotent

2. **Hard-delete execution (deletion_jobs)**
   - Steps exact (Module_Boundaries B3): (1) drop chunks/embeddings/vectors
     for every active + building profile, (2) delete extracted text,
     (3) delete original object, (4) stale-flag dependent golden questions,
     (5) audit document.hard_deleted
   - `last_completed_step` checkpoint; each step idempotent (double-delete
     = no-op); profile set read at execution time (SAD §3.2 —
     delete-during-reindex covered)
   - Pending-deletes drain blocks profile cutover

3. **Four-eyes deletion approval (BA §7.7.d)**
   - Sensitive-collection flag (schema from admin slice) → initiator +
     second distinct ADMIN approval before hard-delete scheduling
   - Approval endpoints (`/approve`-style subresource verbs, ADR-009);
     single-admin attempt rejected; both actions audited in-transaction

4. **Audit lifecycle**
   - Monthly partition creation automation; detach at 1-year retention
   - NDJSON export endpoint (Platform Admin; BA §7.8.b), streamed for large
     result sets
   - Verify INSERT-only role + trigger enforcement carried from foundation

5. **Metrics & observability dashboard**
   - `metrics` package: counters/histograms (1-min/5-min buckets) →
     `metrics_aggregates` in PostgreSQL; Actuator exposure (ADR-008: no
     Prometheus/Grafana/SaaS)
   - Per-tenant gauges: ingestion success/failure, search latency,
     chat latency/TTFT, token usage, refusal rate, eval pass rate,
     access-denied count, budget consumption
   - Health checks: backend, PG, vector search, object storage, IdP,
     providers, worker liveness

6. **Token budget enforcement (SAD §7.8 Concern 3)**
   - Budget counter in `policy` (read+write, transactional per provider
     response); alerts 70/90/100%; hard stop ≥ 110% fail-closed + admin
     notification

7. **DSAR / export (BA §7.7.b–c)**
   - `GET /me/export` — NDJSON+zip of own profile/activity/conversations/feedback
   - Erasure flow: PII nulling, one-way-hashed audit references, feedback
     anonymized-but-retained
   - Admin data export: scoped, 7-day expiring artifact, encrypted, audited

8. **Degraded modes & resilience**
   - LLM outage → provider-unavailable chat response; embedding outage →
     jobs queue/retry; budget store down → deny AI calls
   - Backup/restore posture: managed PG PITR; restore requires Platform
     Admin + quarantine collection re-ACL (BA §7.7.e)

9. **Test plan**
   - Purge correctness per data category vs RetentionPolicy values
   - Hard-delete resume-from-checkpoint after injected step failure
   - Delete-during-reindex: building profile cleaned, cutover blocked until
     drained
   - Partition detach does not break inserts; export streams > 100k rows
   - Budget hard-stop fail-closed path

Deliverable format: purge framework → deletion execution → four-eyes →
audit lifecycle → metrics → budget → DSAR → tests.
