# PRD — Observability & Audit (MVP)

**Status:** Draft v1.0
**Owner:** Platform + Security
**Source:** [docs/BRD.md §2.5, §3.6, §4.5, §5.5](../BRD.md) · [docs/BA_Analysis.md §5.6, §7.7, §7.8](../BA_Analysis.md)

---

## 1. Objective

Make the system's behavior — ingestion, search, chat, AI-provider calls, access decisions, and admin actions — observable and auditable. Provide append-only audit logs with retention controls suitable for FinTech traceability, while keeping operational logs minimized.

## 2. In-Scope (MVP)

- Structured JSON application logs written to stdout, captured by the host runtime (Docker / Container App / App Service log stream). **Pilot retention: 7-14 days**, content-minimized; the 30-day target (BRD §5.5) applies at production launch.
- Append-only `audit_events` table (1-year retention by default).
- Spring Boot Actuator health endpoints (backend, PG, vector index health, object storage, IdP, providers, ingestion worker).
- Core operational metrics **aggregated and stored in PostgreSQL** (counters, rolling aggregates, latency buckets) for ingestion, search, chat, evaluation, provider, and access events. Exposed via Actuator and the React admin observability dashboard.
- Per-answer diagnostics record (PRD §03).
- Admin observability dashboard (React).
- Manual NDJSON audit export by Platform Admin.
- In-app + SMTP notifications with documented fallbacks.

## 3. Out-of-Scope (MVP — roadmap)

- OpenTelemetry tracing.
- Prometheus + Grafana (managed or self-hosted).
- Managed Grafana / Azure Monitor / Log Analytics, Datadog APM.
- SIEM streaming (Sentinel, Splunk, Datadog, QRadar, Elastic Security).
- Loki / ELK / OpenSearch central log aggregation.
- PagerDuty / Opsgenie / webhook outbound.
- External time-series databases (InfluxDB, Timescale dedicated cluster, Mimir).
- Long-term log retention beyond pilot window.

## 4. Personas & Permissions

- **ADMIN (workspace-scoped)**: dashboard + workspace audit + workspace metrics.
- **ADMIN (with `platform:admin`)**: all dashboards, all audit logs, audit export.
- **VIEWER with `audit:read`**: read-only audit log access (scoped).
- **CONTRIBUTOR**: ingestion + evaluation logs.
- **USER**: own activity history only.

## 5. Functional Requirements

### 5.1 Audit Events
- Single append-only table `audit_events` storing the BRD §2.5 event types and the per-PRD events listed in §01–§05.
- Mandatory fields: `event_id` (uuid), `event_type`, `actor_user_id`, `actor_role`, `tenant_id`, `workspace_id`, `subject_type`, `subject_id`, `payload` (json, content-minimized), `severity`, `timestamp`, `ip`, `user_agent_hash`.
- AI-call events additionally include: `provider`, `region`, `model`, `prompt_version`, `chunk_ids[]`, `cited_chunk_ids[]`, `token_usage`, `cross_border_flag`.

### 5.2 Append-Only Enforcement (BA §7.8.a)
- Application DB role has `INSERT` only on `audit_events`; `UPDATE` and `DELETE` revoked.
- `BEFORE UPDATE OR DELETE` trigger raises a SQL exception.
- Monthly time-partitioning. Partitions detached after retention; detached partitions exported and deleted on a documented schedule.
- Post-MVP: per-partition hash chain for tamper-evidence.

### 5.3 Operational Logs
- Structured JSON written to stdout, captured by the host runtime; pilot retention **7-14 days** (production-launch target 30 days per BRD §5.5), content-minimized: no document text, full prompts, full retrieved chunks, LLM responses, secrets, access tokens, or sensitive PII unless explicitly enabled by workspace policy.
- Correlation IDs propagated across services (`requestId`, `tenantId`, `workspaceId`, `userId`).
- No log shipping to a central aggregator (Loki / ELK / OpenSearch) in MVP — those are roadmap items.

### 5.4 Metrics
- Stored in PostgreSQL as counters, rolling aggregates (1-min and 5-min buckets), and latency histograms; surfaced via Actuator endpoints and the admin observability dashboard. **No Prometheus / Grafana / external time-series store in MVP.**
- Ingestion: queue depth, per-stage latency, success rate, AV blocks.
- Search: p50/p95/p99 latency, no-result rate.
- Chat: p95 retrieval/TTFT/full-answer latency, refusal rate, citation count distribution, feedback rate.
- Provider: call count, latency, error rate, token usage, policy denies, cross-border calls.
- Evaluation: pass rate by suite, regression deltas, partial-run count.
- Access: denied attempts, ACL changes, capability changes.

### 5.5 Per-Answer Diagnostics
- Stored as in PRD §03 §5.8 and joined to audit events.
- Accessible to CONTRIBUTOR+ via "Why this answer?" UI.

### 5.6 Health Checks
- Actuator endpoints for: backend, PostgreSQL, pgvector, object storage, IdP, each configured AI provider, ingestion worker.
- Unhealthy provider degrades workspaces depending on it; admin UI shows the degraded state.

### 5.7 Notifications (BA §7.8.c)
- Primary: in-app banner + notifications panel.
- Secondary: SMTP. Retries 5x exponential backoff up to 30 min.
- Persistent delivery failure surfaces as ops metric `notifications.delivery.failed` + in-app admin banner.
- Notification categories: failed ingestion, failed deletion, reindex failure, provider outage, provider-policy block, evaluation regression, four-eyes pending, AV detection.

### 5.8 Audit Export
- Manual NDJSON export by Platform Admin, with filter (tenant / workspace / date range / event type).
- Export job audited (`audit.export.created`). Artifact stored encrypted in object storage with 7-day expiry.

### 5.9 Concurrency Targets
- BRD §4.4 capacity numbers are **per tenant** (BA §7.8.d). Dashboard surfaces per-tenant gauges so Platform Admin can size deployment for `target × active_tenants`.

## 6. Non-Functional Requirements

- Audit insert must not block primary write paths beyond a few ms.
- Audit table must remain queryable at scale; partitioning required.
- All exported audit artifacts inherit residency policy.
- **Cost ceiling:** observability infrastructure must stay within the MVP infra budget (NFR §6.3); no managed Grafana, SIEM, or APM SaaS subscriptions are permitted at pilot. Metrics are persisted in the same PostgreSQL instance as the rest of the system; if metric volume threatens primary write performance, the system reduces metric resolution (e.g., 5-min buckets only) rather than spinning up a separate time-series store.

## 7. Data Model Touchpoints

- `audit_events` (partitioned), `answer_diagnostics`, `notifications`, `notification_deliveries`.

## 8. APIs (illustrative)

- `GET /api/v1/audit/events` (scoped, filterable, paginated).
- `POST /api/v1/admin/audit/exports` (Platform Admin).
- `GET /api/v1/admin/audit/exports/{id}/download`.
- `GET /api/v1/metrics/...` (Actuator).
- `GET /api/v1/notifications` / `POST /api/v1/notifications/{id}:ack`.

## 9. Telemetry & Audit (about itself)

- Self-monitoring: audit insert latency, partition health, retention purge job results, export job duration, notification delivery success rate.
- Audit events: `audit.export.created`, `audit.partition.detached`, `audit.retention.purged`, `notification.delivery.failed`.

## 10. Acceptance Criteria

1. `UPDATE` or `DELETE` on `audit_events` **under the application DB role** is rejected by the DB (SQL exception raised by trigger and/or revoked grants).
2. Every chat answer (including refusals and interruptions) has a matching audit event with chunk IDs.
3. Operational logs in MVP do not include document text or LLM responses unless workspace policy explicitly enables it.
4. NDJSON export round-trips: re-import produces a verified equal set.
5. Notification fallback triggers an admin banner when SMTP fails for 30 min.
6. Dashboards surface per-tenant SLO gauges.
7. Rolling back the parent action's transaction also rolls back the corresponding audit row — verifying that audit and action share the same DB transaction (NFR §12.3).
8. An action that succeeds always produces exactly one audit row; an action that fails (rolls back) produces zero audit rows — no orphan or missing audit entries.

## 11. Open Items

- Hash-chain design for tamper-evidence (post-MVP).
- Choice of cardinality budget for high-volume audit fields.
