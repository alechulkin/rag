# Non-Functional Requirements — AI Knowledge Assistant for FinTech Engineering Teams

**Status:** Draft v1.0
**Date:** 2026-05-14
**Companion to:** `docs/BRD.md` v1.0

---

## 0. Purpose and Reading Guide

This document defines the measurable non-functional requirements (NFRs) for the platform described in `docs/BRD.md`. Each requirement uses the structure:

> **Category / Requirement / Source / Target / Reasoning / Priority / Validation method / Risk if not implemented**

**Source labels**

- **Explicit** — stated verbatim or quantified in the BRD.
- **Implied** — clearly required by BRD scope or business posture, but not numerically defined.
- **Suggested** — added as a reasonable engineering target where the BRD is silent.

**Lifecycle tiers** — where targets differ:

- **MVP** — Docker Compose, single region, one or two pilot tenants, <= 500 indexed documents per tenant.
- **Production launch** — managed cloud (Azure/AWS), 5-20 paying tenants, audit-grade operations.
- **Future scale** — multi-region or per-tenant isolation tier, 100+ tenants, regulated FinTech rollout.

**Priority labels** follow MoSCoW: Must-have / Should-have / Could-have.

---

## 1. Availability and Reliability

### 1.1 Monthly Uptime SLA — Core APIs

- **Category:** Availability
- **Requirement:** Monthly availability of `/api/search`, `/api/chat`, `/api/documents`.
- **Source:** Explicit (BRD §4.4 best-effort monthly availability target for core application APIs).
- **Target:**
  - MVP: **99.0%**(≈ 7h 18m downtime/month) best-effort target on a single-VM / single-AZ footprint with no HA replicas and no hot-standby providers.
  - Production launch: **99.9%** (≈ 43 min / month) on managed PG with single-AZ HA + container-platform managed runtime.
  - Future scale: **99.95%** for regulated tenants (≈ 22 min / month) with multi-AZ HA and additional capacity headroom.
- **Reasoning:** BRD positions the product as an internal decision-support tool, not life-critical. 99.0% best-effort fits the cheapest viable pilot footprint; banking-adjacent clients demand 99.9%+ once it becomes routinely used in compliance workflows, and that tier of availability is what justifies the production-launch infra spend in NFR §6.4.
- **Priority:** Must-have.
- **Validation method:** Synthetic uptime probes (every 60 s) against `/actuator/health` and one end-to-end smoke endpoint; monthly availability report.
- **Risk if not implemented:** Loss of pilot trust; cannot meet DORA-style operational resilience expectations referenced in BRD §4.1.

### 1.2 Acceptable Downtime — Planned Maintenance

- **Category:** Availability
- **Requirement:** Planned maintenance windows excluded from SLA calculation.
- **Source:** Explicit (BRD §4.4 excludes planned maintenance).
- **Target:** Maximum **2 maintenance windows per month**, each ≤ 2 hours, announced **≥ 5 business days in advance**, scheduled outside 08:00-19:00 CET on business days.
- **Reasoning:** Most users are EU-based engineering / compliance teams; off-hours windows protect productivity.
- **Priority:** Must-have.
- **Validation method:** Change-management log; pre-announced calendar entries; post-window report.
- **Risk if not implemented:** Surprise outages count against SLA; tenant trust erodes.

### 1.3 Recovery Time Objective (RTO)

- **Category:** Availability
- **Requirement:** Time to restore service after a major incident.
- **Source:** Explicit (BRD §4.4: "RTO 4 h").
- **Target:**
  - MVP: **4 hours**.
  - Production launch: **2 hours**.
  - Future scale: **1 hour** for regulated tenants.
- **Reasoning:** BRD pins 4 h for backups; production tightening aligns with DORA-style expectations for ICT service continuity.
- **Priority:** Must-have.
- **Validation method:** Quarterly DR drill restoring a tenant from backup into a clean environment; document elapsed wall-clock time.
- **Risk if not implemented:** Inability to demonstrate operational resilience to regulated customers.

### 1.4 Recovery Point Objective (RPO)

- **Category:** Reliability
- **Requirement:** Maximum tolerable data loss measured in time.
- **Source:** Explicit (BRD §4.4: "RPO 24 h"; backups daily).
- **Target:**
  - MVP: **24 hours** (daily backup).
  - Production launch: **1 hour** for PostgreSQL via continuous WAL archiving; object storage versioning + replication.
  - Future scale: **15 minutes** with PITR + cross-AZ streaming replication.
- **Reasoning:** Documents and audit logs are append-mostly, but losing a day of audit events is unacceptable for a 1-year audit retention promise (BRD §2.5).
- **Priority:** Must-have.
- **Validation method:** PITR restore test in staging quarterly; verify last-committed transaction window.
- **Risk if not implemented:** Audit logs / uploads lost on incident, breaching BRD §4.4 durability rule "no acknowledged upload may be lost".

### 1.5 Error Rate — Core Read Paths

- **Category:** Reliability
- **Requirement:** HTTP 5xx + unhandled-exception rate on search and document read endpoints.
- **Source:** Suggested.
- **Target:** **< 0.5% of requests over rolling 5 minutes** at MVP, **< 0.1%** at production launch.
- **Reasoning:** Read paths must be near-perfect; only chat (LLM-dependent) tolerates higher transient error rates.
- **Priority:** Must-have.
- **Validation method:** Alert computed from PostgreSQL-stored metrics (`http_server_errors_total / http_server_requests_total`) per endpoint in the admin observability dashboard.
- **Risk if not implemented:** Degrades trust in retrieval pipeline; users blame the AI when it's actually infrastructure.

### 1.6 Error Rate — Chat / LLM Path

- **Category:** Reliability
- **Requirement:** Successful answer delivery (any token streamed or full response) for chat requests.
- **Source:** Implied (BRD §3.3 expects graceful "I don't know" / provider-unavailable behavior).
- **Target:** **≥ 98% successful response rate** under normal provider conditions; **≥ 90%** during a single provider degradation event (via fallback path).
- **Reasoning:** LLM providers have intrinsic flakiness; the platform must compensate.
- **Priority:** Should-have.
- **Validation method:** Synthetic chat probes and per-tenant success-rate dashboards.
- **Risk if not implemented:** Users perceive the product as unreliable even when its infra is healthy.

### 1.7 Retry and Fallback Behavior

- **Category:** Reliability
- **Requirement:** Standardized retry policy for transient failures.
- **Source:** Partly explicit (BRD §3.1, §4.4: "retries up to 3x" for ingestion).
- **Target:**
  - Ingestion jobs: **3 retries** with exponential backoff (initial 30 s, factor 2, jitter ±20%, max 8 min).
  - LLM provider calls: **2 retries** on 5xx / 429 / timeout, max total budget 12 s for time-to-first-token attempt.
  - Embedding calls: **3 retries** with backoff; on permanent failure, mark job `failed` with reason.
  - Database transient errors (deadlock, serialization failure): **3 retries** at app layer.
- **Reasoning:** Explicit retries already in BRD for ingestion; LLM/embedding paths need their own bounded budgets to keep latency NFRs achievable.
- **Priority:** Must-have.
- **Validation method:** Unit tests for retry policy; fault-injection tests in staging.
- **Risk if not implemented:** Flapping providers create user-visible failures that mask real bugs.

### 1.8 Graceful Degradation

- **Category:** Reliability
- **Requirement:** Defined degraded-mode behavior per dependency outage.
- **Source:** Explicit (BRD §4.4 Degraded mode).
- **Target:**
  - **LLM provider outage:** chat returns explicit "AI provider unavailable" message with timestamp; search, document management, admin, audit review remain fully available.
  - **Embedding provider outage:** new ingestions queue (no data loss); previously indexed content remains searchable.
  - **Object storage outage:** uploads rejected with retry-after; existing search and chat remain functional from cached metadata + already-extracted text.
  - **IdP outage:** existing valid JWTs continue working until expiry; no forced logout.
  - **Vector index unavailable:** keyword (FTS) search remains available; chat returns degraded warning.
- **Reasoning:** BRD requires fail-closed for permission, but fail-open with clear messaging for non-security dependencies.
- **Priority:** Must-have.
- **Validation method:** Chaos tests per dependency; documented runbook entries.
- **Risk if not implemented:** Cascading failures; whole product appears down when only one dependency is impaired.

### 1.9 Dependency Failure Isolation

- **Category:** Reliability
- **Requirement:** Circuit breakers and bulkheads around external dependencies.
- **Source:** Suggested.
- **Target:** Resilience4j (or equivalent) configured with:
  - Circuit breaker per provider (50% error rate threshold over 20 calls -> open for 60 s).
  - Bounded thread pool / semaphore per provider (LLM: 32 concurrent, embedding: 16, object storage: 64).
  - Per-call timeout: LLM 30 s, embedding 15 s, object storage 10 s.
- **Reasoning:** Prevents a slow provider from exhausting the request worker pool.
- **Priority:** Should-have.
- **Validation method:** Load tests with simulated provider latency spikes.
- **Risk if not implemented:** A single slow provider hangs the JVM thread pool and brings down unrelated endpoints.

---

## 2. Performance

### 2.1 Search API Latency (Permission-Aware)

- **Category:** Performance
- **Requirement:** Latency for permission-aware semantic + keyword search.
- **Source:** Explicit (BRD §4.4: p95 < 1.5 s).
- **Target:**
  - p50: **≤ 400 ms**, p95: **≤ 1.5 s**, p99: **≤ 3 s** at MVP scale (50 concurrent users, 100k chunks).
  - Production launch: p50 ≤ 300 ms, p95 ≤ 1.0 s, p99 ≤ 2 s.
- **Reasoning:** BRD pins p95; p50/p99 added so we can detect distribution skew that p95 alone hides.
- **Priority:** Must-have.
- **Validation method:** k6/Gatling load test against `/api/search`; histogram metrics captured in PostgreSQL metric buckets (`search_duration_seconds` family).
- **Risk if not implemented:** Slow search undermines the whole "fast knowledge retrieval" value proposition.

### 2.2 Chat — Time to First Token (Streaming)

- **Category:** Performance
- **Requirement:** Time from chat request received to first token streamed to client.
- **Source:** Explicit (BRD §4.4: TTFT < 2 s, p95).
- **Target:**
  - p50: **≤ 1.2 s**, p95: **≤ 2 s**, p99: **≤ 4 s** at MVP.
  - Production launch: p95 ≤ 1.5 s.
- **Reasoning:** TTFT dominates perceived chat responsiveness; budget = policy check (≤ 50 ms) + retrieval (≤ 1 s) + first-token provider latency (≤ 800 ms).
- **Priority:** Must-have.
- **Validation method:** End-to-end chat probe with synthetic question per tenant; metric `chat_ttft_seconds`.
- **Risk if not implemented:** Users abandon chat ("looks frozen") even though full answers eventually arrive.

### 2.3 Chat — Full Non-Streaming Answer Latency

- **Category:** Performance
- **Requirement:** End-to-end latency for full chat answer when streaming disabled.
- **Source:** Explicit (BRD §4.4: p95 < 8 s).
- **Target:** p50 ≤ 4 s, **p95 ≤ 8 s**, p99 ≤ 15 s, under normal LLM-provider conditions.
- **Reasoning:** BRD-defined; matches expectations for a typical 500-1000 token response.
- **Priority:** Must-have.
- **Validation method:** Synthetic chat suite (one short, one medium, one long answer).
- **Risk if not implemented:** Compounds TTFT issues; long-tail latency hides provider regressions.

### 2.4 RAG Retrieval + Prompt Construction Latency

- **Category:** Performance
- **Requirement:** Time from question received to LLM call initiated.
- **Source:** Explicit (BRD §4.4: p95 < 1.5 s).
- **Target:** p50 ≤ 600 ms, **p95 ≤ 1.5 s**, p99 ≤ 2.5 s.
- **Reasoning:** Sub-component of TTFT; called out separately in BRD to isolate retrieval performance from provider performance.
- **Priority:** Must-have.
- **Validation method:** Internal timer metric `rag.retrieve_and_build_prompt` stored in PostgreSQL aggregates and surfaced on the admin observability dashboard.
- **Risk if not implemented:** Slow retrieval blames provider; root cause hidden.

### 2.5 Document Upload Acknowledgement Latency

- **Category:** Performance
- **Requirement:** Time from upload request to durable-persistence acknowledgement to the client.
- **Source:** Explicit (BRD §4.4: < 2 s).
- **Target:** p95 ≤ 2 s for files up to 25 MB; p99 ≤ 5 s.
- **Reasoning:** BRD-defined; ingestion itself is asynchronous, so the only thing on the critical path is durable storage + metadata insert + job-record creation.
- **Priority:** Must-have.
- **Validation method:** Upload probe with 1 MB, 10 MB, 25 MB test files; metric `upload_ack_duration_seconds`.
- **Risk if not implemented:** Users retry uploads, double-creating jobs.

### 2.6 Ingestion Throughput — Small Files

- **Category:** Performance
- **Requirement:** Time from upload to "indexed" status for TXT/MD files ≤ 5 MB.
- **Source:** Explicit (BRD §4.4: < 2 min, p95).
- **Target:** p50 ≤ 45 s, **p95 ≤ 2 min**, p99 ≤ 5 min.
- **Reasoning:** BRD-pinned; assumes embedding provider responds at <200ms per batch of 100 chunks.
- **Priority:** Must-have.
- **Validation method:** Bulk-load 100 representative TXT/MD files; measure distribution.
- **Risk if not implemented:** Users perceive ingestion as broken; manual retries pile up.

### 2.7 Ingestion Throughput — Text PDFs

- **Category:** Performance
- **Requirement:** Time from upload to "indexed" for text-based PDFs ≤ 25 MB.
- **Source:** Explicit (BRD §4.4: < 10 min, p95).
- **Target:** p50 ≤ 4 min, **p95 ≤ 10 min**, p99 ≤ 20 min.
- **Reasoning:** BRD-pinned; PDF parsing dominates wall-clock cost.
- **Priority:** Must-have.
- **Validation method:** Test corpus of 50 representative FinTech PDFs (regulatory docs, runbooks, ADRs).
- **Risk if not implemented:** Compliance teams cannot bulk-onboard their existing libraries.

### 2.8 Frontend Page Load — First Contentful Paint

- **Category:** Performance
- **Requirement:** FCP for primary routes (`/`, `/chat`, `/documents`, `/admin`).
- **Source:** Suggested.
- **Target:** p75 **≤ 1.8 s** on a typical corporate broadband connection (10 Mbps, 50 ms RTT); p95 ≤ 3 s.
- **Reasoning:** Web Vitals "good" threshold; corresponds to BRD's "fast knowledge retrieval" theme.
- **Priority:** Should-have.
- **Validation method:** Lighthouse CI on every PR; Real-User Monitoring (RUM) in production.
- **Risk if not implemented:** Slow first paint deters daily use even if APIs are fast.

### 2.9 Frontend Time to Interactive (TTI)

- **Category:** Performance
- **Requirement:** TTI for primary routes.
- **Source:** Suggested.
- **Target:** p75 **≤ 3.5 s** on corporate broadband; p95 ≤ 5 s.
- **Reasoning:** Web Vitals "good" threshold for TTI.
- **Priority:** Should-have.
- **Validation method:** Lighthouse CI + RUM.
- **Risk if not implemented:** Users click before app is ready; events dropped, support tickets rise.

### 2.10 Frontend Time to First Byte (TTFB)

- **Category:** Performance
- **Requirement:** TTFB for first-byte of HTML/SPA shell.
- **Source:** Suggested.
- **Target:** p75 ≤ 600 ms; p95 ≤ 1 s.
- **Reasoning:** Standard CDN/edge expectation; the SPA should be served from a CDN-fronted bucket in production.
- **Priority:** Should-have.
- **Validation method:** RUM; synthetic checks from EU edge locations.
- **Risk if not implemented:** Bad first-impression latency; users blame the AI for infrastructure delays.

### 2.11 Background Job Processing Latency

- **Category:** Performance
- **Requirement:** Time from job enqueue to job pickup by worker.
- **Source:** Implied (BRD §5.4 durable job queue).
- **Target:** p95 ≤ **30 seconds** at MVP; ≤ 10 seconds at production launch.
- **Reasoning:** Affects perceived ingestion latency; users seeing "uploaded" but no progress for a minute lose confidence.
- **Priority:** Should-have.
- **Validation method:** Metric `ingestion_job_queue_wait_seconds`.
- **Risk if not implemented:** Job backlogs invisible until users complain.

### 2.12 Behavior Under Peak Load

- **Category:** Performance
- **Requirement:** Latency degradation budget under peak load.
- **Source:** Implied.
- **Target:** Under **2× nominal concurrency** (i.e., 100 active users per tenant, 20 concurrent chats), p95 latency may degrade by **≤ 50%** vs. nominal but must not exceed the absolute BRD ceilings (search 2.25 s, TTFT 3 s, chat 12 s) before autoscaling kicks in.
- **Reasoning:** Allows graceful degradation without immediate SLA breach during temporary spikes.
- **Priority:** Should-have.
- **Validation method:** Sustained 2× load test in staging once per release.
- **Risk if not implemented:** Unknown breaking point; surprise outages under load.

### 2.13 File Download Performance

- **Category:** Performance
- **Requirement:** Original-document download throughput.
- **Source:** Suggested.
- **Target:** Object storage signed-URL or proxied download achieves ≥ **5 MB/s** sustained per stream, p95 download-start latency ≤ 500 ms.
- **Reasoning:** Citation "view source" must feel instantaneous on 25 MB PDFs.
- **Priority:** Could-have.
- **Validation method:** Download probes per region.
- **Risk if not implemented:** Citation experience feels sluggish; users distrust grounding.

---

## 3. Scalability

### 3.1 Per-Tenant Active Users

- **Category:** Scalability
- **Requirement:** Active users supported per tenant simultaneously.
- **Source:** Explicit (BRD §4.4: 50 concurrent active users per tenant).
- **Target:**
  - MVP: **50 concurrent active users per tenant**.
  - Production launch: **200 per tenant**.
  - Future scale: **1,000 per tenant**.
- **Reasoning:** BRD-pinned; production launch matches mid-sized FinTech engineering org; future scale aligns with multi-department rollouts.
- **Priority:** Must-have.
- **Validation method:** Load test with realistic mix (60% search, 30% chat, 10% ingestion).
- **Risk if not implemented:** Cannot meet promised tenant capacity; sales conversations stall.

### 3.2 Concurrent Chat Requests

- **Category:** Scalability
- **Requirement:** Simultaneous in-flight chat requests per tenant.
- **Source:** Explicit (BRD §4.4: 10 concurrent chat requests).
- **Target:**
  - MVP: **10 per tenant**.
  - Production launch: **50 per tenant**.
  - Future scale: **200 per tenant**, scoped by per-tenant token budget.
- **Reasoning:** BRD-pinned; bounded by LLM provider rate limits and budget.
- **Priority:** Must-have.
- **Validation method:** Concurrency soak test with mocked provider; verify queueing fairness.
- **Risk if not implemented:** Queueing or 429s surface to users; chat feels broken.

### 3.3 Concurrent Ingestion Jobs

- **Category:** Scalability
- **Requirement:** Simultaneous ingestion jobs per tenant.
- **Source:** Explicit (BRD §4.4: 5 concurrent ingestion jobs).
- **Target:**
  - MVP: **5 per tenant** (≥ 25 system-wide).
  - Production launch: **20 per tenant**, ≥ 200 system-wide.
- **Reasoning:** BRD-pinned; assumes worker pool sized to embedding-provider throughput.
- **Priority:** Must-have.
- **Validation method:** Bulk-upload load test; measure end-to-end indexing completion times.

### 3.4 Document Volume per Tenant

- **Category:** Scalability
- **Requirement:** Indexed documents and chunks per tenant.
- **Source:** Explicit (BRD §4.4: 1,000 documents and ~100,000 chunks).
- **Target:**
  - MVP: **1,000 documents / 100k chunks** per tenant.
  - Production launch: **20,000 documents / 2M chunks** per tenant.
  - Future scale: **100,000 documents / 10M chunks** per tenant with partitioned pgvector or move to dedicated vector store.
- **Reasoning:** BRD-pinned for MVP; scale tiers correspond to real FinTech document corpora (engineering wikis + regulatory libraries).
- **Priority:** Must-have.
- **Validation method:** Synthetic corpus generator; query latency benchmark at each scale tier.
- **Risk if not implemented:** Tenants outgrow MVP and must be migrated under stress.

### 3.5 Total Tenants and System Concurrency

- **Category:** Scalability
- **Requirement:** Total tenants supported by a single deployment.
- **Source:** Implied.
- **Target:**
  - MVP: **5 tenants**.
  - Production launch: **50 tenants**, ≥ 5,000 system-wide active users.
  - Future scale: **200 tenants** per region, with optional per-tenant dedicated schema for the top 10.
- **Reasoning:** Logical isolation (BRD §2.3); cardinality limits driven by pgvector index size and queue worker throughput.
- **Priority:** Should-have.
- **Validation method:** Capacity model document; multi-tenant load test.

### 3.6 Read/Write Mix Assumption

- **Category:** Scalability
- **Requirement:** Documented system read/write profile.
- **Source:** Suggested (assumption).
- **Target:** Steady-state mix:
  - 70% retrieval (search + chat retrieval),
  - 15% authoring (upload + index),
  - 10% admin/audit reads,
  - 5% write/metadata updates.
- **Reasoning:** Drives caching strategy and read-replica decisions.
- **Priority:** Should-have.
- **Validation method:** Production telemetry; revisit quarterly.
- **Risk if not implemented:** Misallocated capacity; surprise hot paths.

### 3.7 Data Growth Rate

- **Category:** Scalability
- **Requirement:** Storage growth assumption per active tenant.
- **Source:** Suggested.
- **Target:** Assume **~5 GB/month** of ingested content per active tenant on average; **~50 GB/month** peak during initial onboarding.
- **Reasoning:** Based on a typical FinTech doc corpus (regulatory + engineering + runbooks); used for storage cost forecasting.
- **Priority:** Should-have.
- **Validation method:** Monthly storage report per tenant.

### 3.8 Horizontal Scaling Expectations

- **Category:** Scalability
- **Requirement:** Stateless backend processes; ingestion workers and API servers must scale horizontally.
- **Source:** Implied (BRD §6 Tech Stack; cloud target K8s).
- **Target:**
  - Stateless API service replicas scaled by request rate (target CPU 60%, p95 latency < 1× SLO).
  - Worker replicas scaled by `ingestion_job_queue_depth`.
  - Stateful components (PG, object storage, Keycloak) scale vertically or via managed-service horizontal features (e.g., PG read replicas).
- **Reasoning:** BRD §5.4 explicitly contemplates K8s; no persistence in app processes.
- **Priority:** Must-have at production launch.
- **Validation method:** Scale-out test from 2 to 10 replicas under load; verify no session/state loss.

### 3.9 Peak Load Scenarios

- **Category:** Scalability
- **Requirement:** Named peak scenarios with defined behavior.
- **Source:** Suggested.
- **Target:** Two documented scenarios:
  1. **Compliance crunch** — 100 chat queries/min across all tenants for 1 hour (e.g., audit drill). Must hold p95 < 1.5× normal.
  2. **Bulk onboarding** — 500-document upload over 30 minutes by a single tenant. Must not affect other tenants' p95 search latency (tenant fairness via queue weighting).
- **Reasoning:** Realistic FinTech load patterns.
- **Priority:** Should-have.
- **Validation method:** Quarterly scenario test.

---

## 4. Security

### 4.1 Authentication Method

- **Category:** Security
- **Requirement:** Production identity via enterprise SSO.
- **Source:** Explicit (BRD §2.4, §5.1: OIDC via Keycloak / Entra ID / Okta).
- **Target:**
  - Production: **OIDC / OAuth2** only; local accounts disabled.
  - Local development: Keycloak in Docker Compose with seeded users.
  - **JWT validation** in Spring Security OAuth2 Resource Server.
- **Reasoning:** BRD-mandated; aligns with FinTech enterprise expectations.
- **Priority:** Must-have.
- **Validation method:** Configuration audit; integration tests with Keycloak; pen test login flow.
- **Risk if not implemented:** Cannot sell to any regulated FinTech customer.

### 4.2 Authorization — Workspace RBAC + Document ACL

- **Category:** Security
- **Requirement:** Workspace-level RBAC plus document/collection-level access control with mandatory pre-retrieval enforcement.
- **Source:** Explicit (BRD §2.2 Critical RAG rule, §4.4 "fails closed").
- **Target:**
  - RBAC enforced in app layer (not just IdP claims).
  - All retrieval queries pre-filter by `tenant_id`, `workspace_id`, `collection_id`/`document_id`, access policy, user role **before** vector or keyword search.
  - **Zero unauthorized chunks** may be returned or sent to an LLM provider.
- **Reasoning:** Hardest BRD hard requirement; product-defining.
- **Priority:** Must-have.
- **Validation method:**
  - Property-based test: for every user × workspace × document matrix, the result set is a subset of allowed documents.
  - Penetration test attempting cross-tenant access by tampering with JWT claims.
  - Continuous canary test in production with a "forbidden chunk" that, if ever surfaced, triggers a P1 alert.
- **Risk if not implemented:** Data leak; product-killing event.

### 4.3 Cross-Tenant Isolation

- **Category:** Security
- **Requirement:** Logical isolation must prevent any cross-tenant data exposure even under bug conditions.
- **Source:** Explicit (BRD §2.3 + §2.2).
- **Target:**
  - Every persistent table includes `tenant_id`; queries either use a tenancy-aware repository wrapper or RLS (PostgreSQL Row-Level Security).
  - All cache keys are tenant-scoped.
  - Object storage keys are prefixed by `tenant_id`.
  - Vector search must never execute without a `tenant_id` predicate (enforced by query construction layer).
- **Reasoning:** Multi-tenant logical isolation is the most common source of leaks in shared-DB platforms.
- **Priority:** Must-have.
- **Validation method:** Static-analysis check for any DB query missing tenancy predicate; quarterly cross-tenant red-team exercise.

### 4.4 Encryption in Transit

- **Category:** Security
- **Requirement:** All network traffic encrypted in transit.
- **Source:** Implied (BRD §4.1 GDPR / NIS2 posture).
- **Target:**
  - All external traffic: **TLS 1.2+**, prefer TLS 1.3. HSTS enabled for the SPA host.
  - Internal traffic (in cluster): mTLS via service mesh at production launch.
  - LLM/embedding provider calls: TLS 1.2+ required; certificate pinning for self-hosted provider.
- **Reasoning:** Standard baseline; required for GDPR Article 32.
- **Priority:** Must-have.
- **Validation method:** SSL Labs test ≥ A on every public endpoint; CI check on ciphers.

### 4.5 Encryption at Rest

- **Category:** Security
- **Requirement:** All persistent data encrypted at rest.
- **Source:** Implied (GDPR/NIS2 posture).
- **Target:**
  - PostgreSQL: storage-level encryption via managed service (Azure Database / RDS) or LUKS for self-hosted.
  - Object storage: SSE (server-side encryption) with **managed keys** (MVP) and **customer-managed keys** (CMK) post-MVP for sensitive workspaces.
  - Backups: encrypted with same or stronger keys than primary.
  - Application secrets: stored only in secret manager, never in DB.
- **Reasoning:** BRD §4.2 lists CMK as out-of-scope for MVP, so default to managed keys initially.
- **Priority:** Must-have.
- **Validation method:** Cloud configuration review; audit log of encryption status per resource.

### 4.6 Secrets Management

- **Category:** Security
- **Requirement:** Centralized secret storage and rotation.
- **Source:** Suggested.
- **Target:**
  - All secrets (provider API keys, DB passwords, JWT signing keys, SMTP credentials) stored in a managed secret store (Azure Key Vault / AWS Secrets Manager / HashiCorp Vault).
  - Secrets rotated at least **every 90 days** for service credentials; **every 30 days** for AI provider keys.
  - **No secrets in source, env files, or container images.**
  - Local dev secrets via `.env.local` (git-ignored) with documented seeded values only.
- **Reasoning:** Provider keys directly map to cost and data-residency risk; rapid rotation limits blast radius.
- **Priority:** Must-have at production launch.
- **Validation method:** GitGuardian / TruffleHog in CI; quarterly rotation drill.

### 4.7 Audit Logging

- **Category:** Security
- **Requirement:** Append-only audit log of all security and lifecycle events.
- **Source:** Explicit (BRD §2.5).
- **Target:**
  - All events listed in BRD §2.5 audit list are captured.
  - Audit table is **append-only from the application layer**; DB user used for app cannot DELETE/UPDATE on `audit_events`.
  - Audit log retention: **≥ 1 year** (default).
  - Audit-write failure must not silently drop events; must alert and degrade if necessary.
- **Reasoning:** BRD hard requirement (§8.7).
- **Priority:** Must-have.
- **Validation method:** Audit-write integration test for each event type; DB grant audit; quarterly tamper-evidence drill.
- **Risk if not implemented:** Loss of compliance posture; regulators reject deployment.

### 4.8 Session Management

- **Category:** Security
- **Requirement:** Bounded token lifetime; revocation support.
- **Source:** Implied (BRD §2.4).
- **Target:**
  - Access tokens: lifetime **≤ 15 minutes**.
  - Refresh tokens: lifetime **≤ 8 hours** for interactive sessions; per-IdP policy otherwise.
  - Idle session timeout in SPA: **30 minutes**.
  - Logout invalidates refresh token at IdP.
- **Reasoning:** Standard enterprise SSO defaults; FinTech-conservative bounds.
- **Priority:** Must-have.
- **Validation method:** Integration tests for token expiry; manual idle-timeout test.

### 4.9 Password Policy

- **Category:** Security
- **Requirement:** Application does not manage passwords directly.
- **Source:** Explicit (BRD §2.4: "MFA, password policy, and primary user lifecycle are delegated to the enterprise IdP").
- **Target:** Application stores no passwords. Local dev Keycloak realm enforces ≥ 12 characters, 4 character classes, no reuse of last 5; MFA optional locally, **required in production via IdP policy**.
- **Reasoning:** BRD delegation; consistent enforcement at IdP.
- **Priority:** Must-have.
- **Validation method:** IdP configuration review.

### 4.10 Protection Against Common Web Vulnerabilities (OWASP)

- **Category:** Security
- **Requirement:** Mitigations for OWASP Top 10 and OWASP LLM Top 10.
- **Source:** Suggested.
- **Target:**
  - Input validation on all controllers (Spring Validation).
  - Parameterized queries only (no string-concatenated SQL).
  - Output encoding in React; CSP headers; X-Frame-Options DENY.
  - **Rate limiting (three-layer model, see SAD §7.8):**
    - *IP / connection flood:* edge-level IP rate limit (LB / ingress); MVP uses built-in LB facility at no extra cost, production graduates to managed WAF / API gateway when justified.
    - *Per-user request rate:* enforced in **Spring** (`OncePerRequestFilter`) on `/api/chat` and `/api/search` — requires resolved JWT identity, so only the backend can enforce it. MVP: in-memory counters (single replica). Production: shared counters in Redis or PG. **Fail-closed** on counter unavailability.
    - *Per-tenant AI token budget:* enforced in the **Policy Engine** at provider-call time; **fail-closed** at budget cap. This is a cost-safety hard stop and cannot live at any edge layer.
  - **LLM-specific:** prompt-injection mitigation (system-prompt isolation, retrieved-context sanitization), output filtering for forbidden tokens (e.g., secrets), prompt allow-list per workspace.
  - Dependency scanning (Snyk / OWASP Dependency-Check) blocking on high/critical CVEs.
- **Reasoning:** Both classic web and LLM-specific attack surfaces apply. Rate-limit enforcement is layered because each concern needs different identity context (SAD §7.8).
- **Priority:** Must-have.
- **Validation method:** Annual third-party pen test; continuous SAST + DAST in CI; tabletop prompt-injection drill; rate-limit integration tests (single-replica and multi-replica scenarios).

### 4.11 Compliance Posture

- **Category:** Security / Compliance
- **Requirement:** Compliance-ready posture without MVP certification.
- **Source:** Explicit (BRD §4.1).
- **Target:**
  - **MVP:** GDPR-aligned, EU AI Act transparency-ready, DORA-style operational resilience-ready, NIS2-aligned, but **no formal ISO 27001 / SOC 2 / PCI-DSS / HIPAA certification**.
  - **Production launch:** SOC 2 Type 1 audit readiness package (policies, evidence, control mapping).
  - **Future scale:** SOC 2 Type 2 + ISO 27001 certification roadmap; HIPAA and PCI-DSS explicitly **out of scope** unless new business case.
- **Reasoning:** BRD §4.1 explicit out-of-scope list for MVP.
- **Priority:** Must-have (MVP) / Should-have (production).
- **Validation method:** Annual gap assessment against control framework; audit-readiness checklist.

### 4.12 Data Retention and Deletion Enforcement

- **Category:** Security
- **Requirement:** Retention defaults from BRD §4.5 enforced automatically.
- **Source:** Explicit (BRD §4.5).
- **Target:** Scheduled retention job runs **daily**, deletes/expires:
  - Superseded document versions > 30 days.
  - Chat content > 30 days (if enabled by workspace).
  - Chat metadata > 90 days.
  - Evaluation runs > 180 days.
  - Audit logs > 1 year (configurable per-tenant up to 7 years).
  - Operational logs > 30 days.
  - Backups > 30 days rolling.
  - **Deletion propagation to vector index is mandatory** (BRD §4.5 hard requirement).
- **Reasoning:** BRD-pinned.
- **Priority:** Must-have.
- **Validation method:** Per-category retention job has integration test verifying both data removal and audit entry.

---

## 5. Privacy and Data Governance

### 5.1 PII Handling

- **Category:** Privacy
- **Requirement:** Identify and constrain PII handling.
- **Source:** Implied (BRD §4.1 GDPR posture).
- **Target:**
  - User-profile PII (email, display name, IdP subject) stored in `users` table.
  - Document content may contain PII; treated as customer-controlled data subject to the tenant's data classification.
  - No PII in operational logs (BRD §5.5 already constrains this).
  - DSR (data subject request) workflow: respond within **30 calendar days** (GDPR Art. 12).
- **Reasoning:** GDPR-aligned defaults.
- **Priority:** Must-have.
- **Validation method:** Data-flow inventory; quarterly DSR drill.

### 5.2 Data Minimization

- **Category:** Privacy
- **Requirement:** Send only the minimum data needed to providers.
- **Source:** Explicit (BRD §4.3: "Only permission-filtered and minimized context is sent to providers").
- **Target:**
  - Only top-k retrieved chunks sent to LLM provider, not full documents.
  - User question text trimmed of metadata before sending.
  - No internal user IDs, internal tenant IDs, or org names sent to providers unless required.
- **Reasoning:** BRD-mandated; reduces breach blast-radius.
- **Priority:** Must-have.
- **Validation method:** Pre-send payload audit per call; static analysis on prompt builders.

### 5.3 Data Classification

- **Category:** Privacy
- **Requirement:** Per-workspace data classification driving AI-provider policy.
- **Source:** Implied (BRD §4.3 sensitive workspace rules).
- **Target:** Workspaces support classification levels: **standard / restricted / strict**. Each level maps to:
  - Allowed AI providers
  - Allowed regions
  - Allowed retention behavior
  - Whether prompt/response logging may be enabled
- **Reasoning:** Operationalizes BRD's "sensitive workspace" concept.
- **Priority:** Should-have for MVP, Must-have at production launch.
- **Validation method:** Policy-engine unit tests; admin UI configuration tests.

### 5.4 User Consent

- **Category:** Privacy
- **Requirement:** Consent capture where required.
- **Source:** Suggested.
- **Target:**
  - Application is B2B internal-tool; user consent for service use is governed by employer terms (no consent UI required).
  - **Per-workspace toggle** required if a tenant enables chat-content storage (BRD §4.5 default-off): users must see a banner indicating chat content is being retained.
- **Reasoning:** Reduces GDPR exposure when chat storage is enabled.
- **Priority:** Should-have.
- **Validation method:** UI flag toggling test; banner snapshot.

### 5.5 Right to Access / Delete / Export

- **Category:** Privacy
- **Requirement:** Per-user data access, export, and deletion.
- **Source:** Implied (BRD §4.5 deletion events + GDPR).
- **Target:**
  - Workspace Admin can export a user's chat history, feedback, and audit-of-self entries in machine-readable format (JSON/CSV) within **7 days** of request.
  - Deletion request removes user record, chat content (where retained), and per-user metadata; audit entries about the user are retained (compliance carve-out).
  - SLA for full DSR resolution: **30 calendar days**.
- **Reasoning:** GDPR Art. 15/17/20 expectations.
- **Priority:** Must-have at production launch.
- **Validation method:** End-to-end DSR test per release.

### 5.6 Data Residency

- **Category:** Privacy
- **Requirement:** EU/EEA data residency by default.
- **Source:** Explicit (BRD §4.2).
- **Target:**
  - All customer-controlled data stays in configured EU/EEA region (DB, object storage, vector index, backups, logs).
  - LLM/embedding provider region declared per provider; **pre-call validation** blocks any cross-residency call unless tenant has explicit cross-border policy enabled.
  - **No cross-region replication** of customer data in MVP; **multi-region active-active** explicitly out of scope per BRD.
- **Reasoning:** BRD-mandated; cornerstone for EU FinTech compliance.
- **Priority:** Must-have.
- **Validation method:** Configuration audit per environment; policy-engine integration tests.

### 5.7 Backup Retention

- **Category:** Privacy
- **Requirement:** Backup retention aligned with primary data.
- **Source:** Explicit (BRD §4.5: "30 days rolling, same residency").
- **Target:** **30 days rolling** for DB + object storage + audit. Backups encrypted (see 4.5) and in same region.
- **Reasoning:** BRD-pinned.
- **Priority:** Must-have.
- **Validation method:** Automated backup-retention check; quarterly restore drill.

### 5.8 Log Retention

- **Category:** Privacy
- **Requirement:** Operational vs audit log retention separation.
- **Source:** Explicit (BRD §2.5, §4.5, §5.5).
- **Target:** Operational logs **30 days**, content-minimized (no full document text, prompts, responses, or secrets). Audit logs **1 year**, configurable to 7 years per tenant.
- **Reasoning:** BRD-pinned.
- **Priority:** Must-have.
- **Validation method:** Log-pipeline configuration audit; sample-content scan for forbidden fields.

### 5.9 Anonymization / Pseudonymization

- **Category:** Privacy
- **Requirement:** Pseudonymize where feasible.
- **Source:** Suggested.
- **Target:**
  - User identifiers in logs and metrics use opaque IDs (UUIDs), not emails.
  - Email or full display name appears only in `users` table and audit events that legally require it.
  - Telemetry never includes document content (already constrained by BRD §5.5).
- **Reasoning:** GDPR Art. 32 expectation.
- **Priority:** Should-have.
- **Validation method:** Log scan for emails / direct identifiers; CI check.

---

## 6. Cost and Infrastructure

### 6.1 Hosting Model

- **Category:** Cost
- **Requirement:** Defined hosting model per lifecycle tier.
- **Source:** Explicit (BRD §1, §5.4).
- **Target:**
  - **MVP:** **single VM, Azure Container Apps, AWS App Runner, App Service, or Docker Compose on a VM.** **Kubernetes (AKS / EKS / GKE) is out of scope** for MVP (see NFR §6.10).
  - **Production launch:** managed cloud (Azure preferred for EU residency, AWS supported), managed-container platform (Container Apps / App Service / ECS). Kubernetes adopted only if multi-tenant scale-out demands it.
  - **Future scale:** optional self-hosted / sovereignty-sensitive deployment per BRD §1; Kubernetes considered.
- **Reasoning:** BRD-defined order of evolution; Kubernetes overhead is unjustified at pilot scale.
- **Priority:** Must-have.
- **Validation method:** Deployment topology documented and CI-deployable per environment; quarterly review confirms no out-of-scope managed services (NFR §6.10) have been adopted.

### 6.2 Preferred Cloud Provider

- **Category:** Cost
- **Requirement:** Primary cloud provider.
- **Source:** Implied (BRD §5.3 "Azure preferred for EU residency").
- **Target:** **Azure** (primary), AWS (secondary), with vendor-neutral abstractions for object storage, DB, secrets, queue.
- **Reasoning:** BRD's MVP LLM adapter is Azure OpenAI; collocating infra reduces egress and latency.
- **Priority:** Should-have.
- **Validation method:** Architecture review.

### 6.3 Infrastructure Budget — MVP

- **Category:** Cost
- **Requirement:** Maximum monthly infrastructure spend for MVP.
- **Source:** Suggested (BRD silent).
- **Target:** **≤ €500 / month** for the MVP pilot environment, excluding AI provider costs.
- **Scope:** Single region, up to 5 pilot tenants, **managed PostgreSQL** (Azure Flexible Server Burstable or AWS RDS micro; ~€12-20/mo — provides automated backup, PITR, patching, TLS, SAD §5) + pgvector + PostgreSQL FTS as the single primary store, object storage (Azure Blob / S3 / MinIO), containerized backend/frontend on a single VM / Container App / App Service / Docker Compose on VM, lightweight observability (structured logs + Actuator + basic metrics in PostgreSQL + admin dashboard + limited log retention), and OIDC-compatible authentication (one of: small Keycloak container on the same VM, the tenant's managed Entra ID / Okta, or a dev-grade OIDC mock for demo-only deployments). PG-on-VM is a documented fallback only for air-gapped sovereignty deployments (SAD §5).
- **Reasoning:** The MVP is intended to validate product value, RAG quality, RBAC, ingestion, evaluation, and admin workflows. It should avoid production-grade Kubernetes, dedicated vector databases, managed SIEM, and heavyweight observability until pilot usage justifies them.
- **Priority:** Should-have.
- **Cost-control rule (MVP):** Kubernetes (AKS / EKS / GKE), dedicated managed vector databases (Pinecone, Weaviate, etc.), managed OpenSearch / Elasticsearch, enterprise SIEM (Sentinel, Splunk, Datadog, QRadar), multi-region deployment, high-availability database replicas, hot-standby AI provider pools, managed Grafana / Prometheus stacks, and managed log-aggregation SaaS are **out of scope for MVP unless explicitly approved** by the product owner.
- **Validation method:** Monthly cloud cost report tagged by environment, service, and tenant where possible; quarterly architecture review to confirm no out-of-scope managed services have crept in.
- **Risk if not implemented:** Over-engineered infrastructure creates unnecessary burn rate, reduces pilot ROI, and delays the path to a paid first contract.

### 6.4 Infrastructure Budget — Production Launch

- **Category:** Cost
- **Requirement:** Monthly infra spend ceiling at production launch.
- **Source:** Suggested.
- **Target:** **≤ €8,000 / month** for the first 20-50 production tenants, excluding AI provider costs.
- **Scope:** Single region, managed PostgreSQL (single-AZ HA), managed object storage, container-platform runtime (Container Apps / App Service / ECS — Kubernetes still optional, only adopted if multi-tenant scale-out justifies it), the lightweight observability set extended with managed Grafana / Log Analytics, secret manager, and managed IdP. Out-of-scope items from §6.3 remain out of scope unless a specific tenant contract pays for the upgrade.
- **Reasoning:** A small, single-region, no-HA-replica deployment with managed PG and managed object storage typically lands well under €8 000/mo at 20-50 tenants in Azure West Europe / AWS eu-west-1. Higher tiers (multi-AZ HA replicas, managed SIEM, Kubernetes platform team) are only purchased when contractual SLAs or scale make them necessary.
- **Priority:** Should-have.
- **Validation method:** Monthly FinOps review; per-tenant cost attribution; quarterly review of "necessary upgrades" backlog.
- **Risk if not implemented:** Production margins compressed; price competitiveness against incumbents weakened.

### 6.5 AI Provider Cost per Tenant

- **Category:** Cost
- **Requirement:** Per-tenant AI provider cost cap with alerting.
- **Source:** Suggested.
- **Target:**
  - Default per-tenant **monthly budget cap** configurable; default **€150/month** at MVP, **€500/month** at production launch.
  - Alert at 70%, 90%, 100% consumption.
  - Hard stop at 110% unless workspace policy explicitly allows overage.
- **Reasoning:** AI provider cost is the most volatile cost driver and easy to misuse. The MVP cap is set deliberately tight to force the engineering team to validate retrieval-quality and answer-richness trade-offs early, before paid tenants arrive.
- **Priority:** Should-have.
- **Validation method:** Token-usage metric per tenant + budget service; weekly per-tenant burn report in admin dashboard.

### 6.6 Cost per Chat Answer

- **Category:** Cost
- **Requirement:** Target unit economics for a chat answer.
- **Source:** Suggested.
- **Target:**
  - MVP: **≤ €0.03 per answer** (median), **≤ €0.10** (p95). Achieved by defaulting to a small/medium model tier (e.g., GPT-4o-mini-class or equivalent), small `topK` (default 6-8), short prompts, no reranker, no aggressive caching.
  - Production launch: **≤ €0.02 per answer** (median) via prompt-cache, retrieval pruning, and per-workspace model-tier policy.
- **Reasoning:** Accepts a lower answer-richness ceiling in MVP in exchange for unit economics that survive pilot scale. Workspaces that explicitly require a richer model tier can opt in via their AI policy and absorb the extra per-answer cost against the per-tenant budget cap (6.5).
- **Priority:** Should-have.
- **Validation method:** Cost-per-answer metric in observability dashboard; monthly review of model-tier mix per tenant.

### 6.7 Autoscaling Policy

- **Category:** Cost
- **Requirement:** Cost-bounded autoscaling.
- **Source:** Implied.
- **Target:**
  - **MVP: no autoscaling.** Fixed footprint of **1 API container + 1 worker container** on a single VM / Container App / App Service. Vertical scale-up only if pilot capacity is exceeded.
  - **Production launch:** horizontal autoscaling on the chosen runtime (Container Apps / App Service Plan / ECS). API: scale on CPU > 65% over 3 min or p95 latency > target; min 2 replicas, max 10. Worker: scale on queue depth > 100 messages or worker utilization > 70%; min 2, max 10. Scale-down delay ≥ 10 minutes.
- **Reasoning:** A single small VM/container can carry the BRD pilot envelope (50 active users/tenant, 10 concurrent chats, 5 ingestion jobs, 5 tenants) without autoscaling overhead. Autoscaling and Kubernetes are deferred to production launch where their cost is justified by multi-tenant load.
- **Priority:** Should-have at production launch.
- **Validation method:** MVP — capacity test on the fixed footprint; production launch — load test triggering scale-out and scale-in events.

### 6.8 Observability Cost Limit

- **Category:** Cost
- **Requirement:** Observability stack cost stays inside a strict ceiling.
- **Source:** Suggested.
- **Target:**
  - **MVP: €0/month in dedicated observability SaaS spend.** Logs to stdout / host log stream with limited retention; metrics persisted in the same PostgreSQL instance; dashboard rendered by the React admin app. No managed Prometheus / Grafana / Loki / SIEM subscription is permitted.
  - **Production launch:** observability (metrics + logs + traces + alerting) ≤ **10% of total infra spend** when managed Grafana / Log Analytics is adopted.
- **Reasoning:** Observability is a notorious overshoot category. Forcing MVP to use the existing PostgreSQL instance + host log stream removes a whole class of recurring SaaS cost.
- **Priority:** Must-have at MVP, Should-have at production launch.
- **Validation method:** Monthly FinOps review of observability vendor invoices; quarterly architecture review confirming no managed observability SaaS in MVP.

### 6.9 Third-Party API Usage Limits

- **Category:** Cost
- **Requirement:** Per-tenant rate limits to AI/embedding providers and per-user request limits.
- **Source:** Implied (cost + reliability).
- **Target:**
  - **Per-tenant AI token budget** (Concern 3 in SAD §7.8): enforced in the Policy Engine at provider-call time. Default cap: €150/month per tenant MVP (NFR §6.5). At ≥ 110% budget consumption → **fail-closed** (block further AI calls for that tenant; notify admin).
  - **Per-tenant token-rate ceiling:** 200k tokens/minute default — prevents a single tenant's burst from consuming the shared provider quota.
  - **Per-user request rate** (Concern 2 in SAD §7.8): 30 chat requests/minute, 200 requests/hour — enforced in Spring `OncePerRequestFilter`, not at edge or in the frontend.
  - MVP: in-memory rate counters (single API replica, Bucket4j or equivalent). Production: shared Redis or PG counter table for multi-replica consistency.
- **Reasoning:** Stops a runaway script/integration from burning the budget. The three limit types are layered because each requires different identity context (see SAD §7.8 for the full rationale).
- **Priority:** Must-have at production launch; per-tenant budget cap must-have from MVP day 1 (cost-safety hard stop).
- **Validation method:** Rate-limit integration tests (single- and multi-replica); rate-limit dashboard; monthly per-tenant cost report.

### 6.10 MVP Cost-Control Rule (Architectural)

- **Category:** Cost
- **Requirement:** Hard list of out-of-scope managed services for MVP.
- **Source:** Suggested (formalizes BRD §1 cost-control rule).
- **Target:** The following are **out of scope for MVP** and require explicit product-owner approval before adoption:
  - Kubernetes (AKS / EKS / GKE) and any K8s-native managed services.
  - Dedicated managed vector databases (Pinecone, Weaviate, Qdrant Cloud, Milvus Cloud).
  - Managed OpenSearch / Elasticsearch / Algolia.
  - Enterprise SIEM (Microsoft Sentinel, Splunk, Datadog Security, IBM QRadar, Elastic Security).
  - Managed Prometheus / Grafana / Loki / APM SaaS.
  - PagerDuty / Opsgenie / ServiceNow paid integrations.
  - Multi-region deployment.
  - PostgreSQL high-availability read replicas, multi-AZ active-active.
  - Hot-standby LLM / embedding provider pools.
  - Document-management or "intelligent document" SaaS (Form Recognizer, Document AI, etc.).
- **Reasoning:** Every item on this list is a credible Day-2 temptation; pre-committing to "out of scope" stops scope creep that defeats the pilot's cost target.
- **Priority:** Must-have.
- **Validation method:** Pull-request template includes a checkbox "this change does not introduce any service from NFR §6.10 list"; quarterly architecture review.
- **Risk if not implemented:** MVP pilot burn rate exceeds budget; cumulative monthly cost double-digits over €500; pilot ROI evaporates.

**Production Graduation Checklist.** Each item above may move from forbidden to allowed **only** when its documented trigger condition is met. Ad-hoc additions outside this checklist require a formal NFR amendment, not a single product-owner approval.

| Out-of-scope item | Trigger condition | Cost ceiling |
|---|---|---|
| Managed Grafana + managed Log Analytics | **3rd paying tenant signed.** | ≤ 10% of infra spend (NFR §6.8). |
| PagerDuty / Opsgenie paid plan | **3rd paying tenant signed.** | Included in the observability 10% ceiling. |
| PostgreSQL HA read replica (single-AZ) | **Any tenant SLA requires ≥ 99.9% availability.** | Managed-PG HA tier cost absorbed into §6.4 production ceiling. |
| Multi-AZ PostgreSQL active-active | Post-graduation; requires separate NFR amendment. | — |
| Kubernetes (AKS / EKS / GKE) | Post-graduation; adopted only if multi-tenant scale-out requires it. Requires architecture review + NFR amendment. | — |
| Dedicated managed vector DB | Post-graduation; adopted only if pgvector benchmark gate (SAD §9.1) shows recall or latency regression at scale. | — |
| Enterprise SIEM (Sentinel / Splunk / Datadog) | Post-graduation; adopted only under a specific tenant contract that funds the integration. | Tenant-funded. |
| Managed OpenSearch / Elasticsearch | Post-graduation; same condition as dedicated vector DB. | — |
| Hot-standby LLM / embedding provider pools | Post-graduation; only if TTFT SLO consistently breached. | — |
| Document-management SaaS | Post-graduation; only if scanned-PDF / OCR support enters scope. | — |
| Managed WAF / API Gateway | Post-graduation; adopted when edge IP rate-limit from built-in LB/ingress is insufficient (DDoS incident or contractual WAF requirement). See SAD §7.8 Concern 1. | Absorbed into §6.4 production ceiling. |

Items marked "Post-graduation" remain forbidden until a formal NFR amendment is approved. The checklist is reviewed and updated quarterly.

---

## 7. Maintainability

### 7.1 Code Quality Expectations

- **Category:** Maintainability
- **Requirement:** Code review and linting baseline.
- **Source:** Suggested.
- **Target:**
  - All changes go through PR review with **at least one approver** plus passing CI.
  - Java: Checkstyle + SpotBugs + Error Prone configured; PRs blocked on new high-severity violations.
  - TypeScript: ESLint + Prettier; PRs blocked on lint errors.
  - Python: Ruff + mypy strict where applicable.
- **Reasoning:** Quality gates reduce defect-leak rate.
- **Priority:** Must-have.
- **Validation method:** CI pipeline gates; periodic code-quality review.

### 7.2 Test Coverage Targets

- **Category:** Maintainability
- **Requirement:** Automated test coverage minimums.
- **Source:** Suggested.
- **Target:**
  - Unit + integration coverage **≥ 70% (line)** for backend modules at MVP; **≥ 80%** at production launch.
  - Critical security/policy modules (permission engine, retention enforcer, audit-writer): **≥ 90%**.
  - Frontend: ≥ 60% for shared components, ≥ 80% for state/services.
  - End-to-end test suite must cover the top **10 user journeys** (login, upload, search, chat, citation click, role change, deletion, evaluation run, audit view, admin reindex).
- **Reasoning:** Coverage alone doesn't ensure quality, but together with branch metrics and mutation testing on critical modules, it sets a reasonable floor.
- **Priority:** Should-have (overall), Must-have (security-critical modules).
- **Validation method:** Coverage reports in CI; PR comment when coverage regresses on changed files.

### 7.3 Static Analysis Requirements

- **Category:** Maintainability
- **Requirement:** SAST and dependency scanning in CI.
- **Source:** Suggested.
- **Target:**
  - SAST tool (e.g., SonarQube / CodeQL) blocking on new "blocker" or "critical" issues.
  - Dependency scanning blocking on high/critical CVEs.
  - Secret scanning blocking pushes containing detected secrets.
- **Reasoning:** Industry baseline; required for SOC 2 readiness.
- **Priority:** Must-have at production launch.
- **Validation method:** CI policy file review; quarterly tool-coverage report.

### 7.4 Documentation Requirements

- **Category:** Maintainability
- **Requirement:** Living docs for architecture, APIs, runbooks.
- **Source:** Implied (BRD §9 Next Steps).
- **Target:**
  - OpenAPI spec for every public API; published per release.
  - Architecture Decision Records (ADRs) for every significant architectural choice; lightweight Markdown in `docs/adr/`.
  - Operations runbook per critical alert (see §8.7).
  - User-facing admin guide updated within 2 weeks of feature GA.
- **Reasoning:** BRD §9 already mandates the start of this body of docs.
- **Priority:** Must-have.
- **Validation method:** Docs PR review; quarterly ADR audit.

### 7.5 API Versioning Strategy

- **Category:** Maintainability
- **Requirement:** Backward-compatible API evolution.
- **Source:** Suggested.
- **Target:**
  - All HTTP APIs versioned via URI prefix `/api/v1/...`.
  - **Breaking changes:** new major version with **≥ 6 months** parallel availability before deprecation.
  - **Non-breaking changes:** additive; documented in changelog.
  - Deprecation announced via `Deprecation` and `Sunset` headers (RFC 8594).
- **Reasoning:** Stable APIs are critical once external integrations exist (frontend SPA, eval runner, future connectors).
- **Priority:** Must-have.
- **Validation method:** OpenAPI diff in CI; deprecation tracker.

### 7.6 Modular Architecture Expectations

- **Category:** Maintainability
- **Requirement:** Bounded modules with clear contracts.
- **Source:** Implied (BRD §5.3 explicit "isolated provider SDKs"; §5.2 "connector framework").
- **Target:**
  - Domain modules (ingestion, retrieval, chat, policy, evaluation, admin, audit) compile/test independently.
  - Cross-module dependencies via interfaces, not implementations.
  - Provider/connector adapters live behind dedicated interfaces; no leakage of provider types into domain code.
- **Reasoning:** BRD's "architectural primitives" language demands this.
- **Priority:** Must-have.
- **Validation method:** ArchUnit rules in CI for Java; module-boundary lint in TS.

### 7.7 Dependency Management

- **Category:** Maintainability
- **Requirement:** Reproducible, kept-fresh dependencies.
- **Source:** Suggested.
- **Target:**
  - Pinned versions in lock files (Maven, npm, pip).
  - Automated dependency updates (Renovate / Dependabot) at least weekly.
  - Major dependency upgrades reviewed within **30 days** of release.
  - No abandoned or EOL libraries on critical path (e.g., legacy Spring Boot 2).
- **Reasoning:** Reduces supply-chain risk; security patches reach prod fast.
- **Priority:** Should-have.
- **Validation method:** Renovate dashboard; quarterly EOL review.

### 7.8 Technical Debt Tracking

- **Category:** Maintainability
- **Requirement:** Visible, prioritized tech-debt backlog.
- **Source:** Suggested.
- **Target:**
  - Tech-debt items tracked in the same backlog tool with label `tech-debt`.
  - At least **20% of engineering capacity per sprint** allocated to tech debt + maintenance.
  - SonarQube-style tech-debt ratio kept **≤ 5%**.
- **Reasoning:** Without an explicit budget, tech debt compounds and slows feature delivery.
- **Priority:** Should-have.
- **Validation method:** Sprint review; capacity reporting.

### 7.9 Refactoring Expectations

- **Category:** Maintainability
- **Requirement:** Continuous refactoring discipline.
- **Source:** Suggested.
- **Target:** Each feature PR may include adjacent cleanups; standalone refactor PRs encouraged when scope > a few lines.
- **Reasoning:** Encourages the "leave it better than you found it" discipline.
- **Priority:** Could-have.
- **Validation method:** Code-review culture; PR comments.

---

## 8. Observability and Operations

### 8.1 Logging Requirements

- **Category:** Observability
- **Requirement:** Structured logging with PII / secret hygiene.
- **Source:** Explicit (BRD §5.5).
- **Target:**
  - **JSON structured logs** with required fields: timestamp, level, service, environment, tenant_id (when applicable), user_id (opaque), trace_id, span_id, event.
  - **No** document content, full prompts, retrieved chunks, LLM responses, secrets, tokens, or unmasked PII unless explicitly enabled per workspace policy.
  - **MVP:** logs to stdout, captured by the host runtime (Docker / Container App / App Service log stream); pilot retention **7-14 days**. No central log aggregator.
  - **Production launch:** central log platform (managed Log Analytics or Loki/ELK/OpenSearch — chosen lazily) with role-scoped access; retention 30 days operational (BRD §5.5).
- **Reasoning:** BRD-pinned; required for incident response. MVP defers shipping/aggregation to keep observability cost at €0 (NFR §6.8).
- **Priority:** Must-have.
- **Validation method:** Log-field schema validation; sample-content audit.

### 8.2 Metrics Requirements

- **Category:** Observability
- **Requirement:** Core operational metrics emitted and persisted cheaply.
- **Source:** Explicit (BRD §5.5 list).
- **Target:**
  - **MVP storage:** counters and rolling aggregates persisted in the same PostgreSQL instance as application data (table `metrics_aggregates`); exposed via Actuator endpoints and the React admin dashboard. **No Prometheus / Grafana / external time-series store.**
  - **Production launch:** metrics exported via OpenMetrics / Prometheus scrape to a managed Grafana or Azure Monitor / CloudWatch backend.
  - Metric families (same in both tiers):
    - `http_server_requests_*` (latency histograms, count, errors) per route.
    - `search_duration_seconds`, `search_no_result_total`.
    - `chat_ttft_seconds`, `chat_total_duration_seconds`, `chat_token_usage_total`, `chat_failed_total`.
    - `ingestion_job_*` (queue depth, processing time, success/failure counters).
    - `provider_call_*` (provider, region, model, latency, status, perimeter_crossing).
    - `audit_write_*`, `auth_login_success_total`, `auth_login_failure_total`.
    - `access_denied_total` per resource type.
    - `evaluation_run_pass_rate`.
  - **Cost guardrail:** if metric write volume threatens primary write performance, reduce resolution (e.g., 5-minute buckets only) before considering a separate time-series store.
- **Reasoning:** BRD-pinned metric families. Persisting to PG keeps MVP observability cost at zero SaaS spend.
- **Priority:** Must-have.
- **Validation method:** Metric registry review; dashboard coverage; PG load test confirming metric writes do not regress primary path latency.

### 8.3 Distributed Tracing Requirements

- **Category:** Observability
- **Requirement:** End-to-end traces for chat requests.
- **Source:** Implied (BRD §5.5 roadmap mentions OpenTelemetry).
- **Target:**
  - **MVP:** no distributed tracing. Correlation IDs (`requestId`, `tenantId`, `workspaceId`, `userId`) propagated through logs for manual correlation.
  - **Production launch:** **OpenTelemetry tracing**, sampling **10%** of normal traffic and **100%** of error traces. Spans: HTTP entry, policy check, retrieval (vector + FTS), prompt build, provider call, audit write. Traces correlated with logs via `trace_id`.
- **Reasoning:** Multi-hop chat path is impossible to diagnose without traces in production. In MVP, correlation IDs + a small concurrent user count make manual log reading viable.
- **Priority:** Could-have at MVP, Must-have at production launch.
- **Validation method:** Trace exemplar in chat dashboard at production launch.

### 8.4 Alerting Thresholds

- **Category:** Observability
- **Requirement:** Actionable alerts on SLO breaches.
- **Source:** Suggested.
- **Target:**
  - **MVP:** in-app admin banner + email (SMTP / mock mailer) for the alert categories listed in BRD §5.5 (failed ingestion, failed deletion, provider outage, provider-policy block, reindex failure, evaluation pass-rate regression). **No paid PagerDuty / Opsgenie / SIEM integration.**
  - **Production launch:** the alert set below evaluated against PG-stored or Prometheus metrics (whichever is in place), routed to email + (optionally) Slack / Teams webhooks:
    - p95 chat latency > 12 s for 5 min -> P2.
    - p95 search latency > 2.5 s for 5 min -> P2.
    - HTTP 5xx > 1% for 5 min -> P2; > 5% -> P1.
    - Audit-write failure rate > 0 over 1 min -> P1.
    - Access-denied spike (> 5σ over baseline) -> P2 (potential probing).
    - Ingestion job failure rate > 10% over 15 min -> P3.
    - AI provider error rate > 20% for 5 min -> P2 (likely provider outage).
    - Backup job failure -> P1.
    - Vector index build failure -> P2.
    - Token-budget cap hit at 100% for any tenant -> P3 (notify tenant admin).
- **Reasoning:** Aligns with SLO ceilings and lifecycle-critical paths (audit, backup) without requiring paid alerting SaaS in MVP.
- **Priority:** Must-have (MVP minimal set), Should-have (full set at production launch).
- **Validation method:** Alert-runbook review; quarterly synthetic alert test.

### 8.5 Dashboard Requirements

- **Category:** Observability
- **Requirement:** Curated dashboards for ops and admin.
- **Source:** Implied (BRD §5.5 "React admin observability dashboard").
- **Target:**
  - **Platform ops dashboard:** infra, SLOs, error budgets, alert volume.
  - **Tenant admin dashboard (in-app):** ingestion status, search/chat usage, eval pass rate, token usage vs budget, access-denied events.
  - **Auditor dashboard (in-app):** filtered audit-event browser with export.
- **Reasoning:** BRD-pinned in-app dashboards; internal ops dashboards needed for SREs.
- **Priority:** Must-have.
- **Validation method:** Dashboard inventory; quarterly review.

### 8.6 Health Checks

- **Category:** Observability
- **Requirement:** Liveness and readiness for each service.
- **Source:** Explicit (BRD §5.5 Actuator health checks list).
- **Target:**
  - `/actuator/health/liveness` — process is up.
  - `/actuator/health/readiness` — DB, vector search, object storage, IdP, LLM provider, embedding provider, worker reachable.
  - Each dependency check has 5-second timeout and degraded-mode classification.
- **Reasoning:** BRD-pinned.
- **Priority:** Must-have.
- **Validation method:** Health-check integration tests; K8s probe configuration.

### 8.7 SLO / SLI Definitions

- **Category:** Observability
- **Requirement:** Codified SLOs with error budgets.
- **Source:** Suggested (formalizes BRD §4.4).
- **Target:**
  - SLO 1 — Search latency: 95% of requests < 1.5 s over 30-day window.
  - SLO 2 — Chat TTFT: 95% of requests < 2 s over 30-day window.
  - SLO 3 — Chat completeness: 98% of chat requests return a non-error response (excluding "I don't know") over 30 days.
  - SLO 4 — Ingestion success: 95% of jobs reach `indexed` status within stated time targets (BRD §4.4) over 30 days.
  - SLO 5 — Availability: 99.0% (MVP best-effort) / 99.9% (prod) monthly.
  - **Error budget burn alerts** at 2% (2-hour window) and 10% (24-hour window).
- **Reasoning:** Converts BRD latency/availability promises into actionable budgets.
- **Priority:** Should-have for MVP, Must-have at production launch.
- **Validation method:** SLO report generated monthly; budget burn-down dashboard.

### 8.8 Incident Response Expectations

- **Category:** Operations
- **Requirement:** Defined incident severities and response SLAs.
- **Source:** Suggested.
- **Target:**
  - **P1:** ack ≤ 15 min, mitigation ≤ 1 h, RCA within 5 business days.
  - **P2:** ack ≤ 30 min, mitigation ≤ 4 h, RCA within 10 business days.
  - **P3:** ack ≤ 4 business hours, mitigation in next sprint.
  - Public-style status page (or internal equivalent) updated for P1/P2.
- **Reasoning:** FinTech tenants expect explicit incident SLAs.
- **Priority:** Must-have at production launch.
- **Validation method:** Game days; quarterly incident review.

### 8.9 On-Call Readiness

- **Category:** Operations
- **Requirement:** On-call rotation with runbooks.
- **Source:** Suggested.
- **Target:**
  - MVP: **best-effort coverage within business hours** (CET), no paid paging tool. Alerts land in shared inbox + chat channel. Off-hours response is best-effort.
  - Production launch: 24×7 rotation across **≥ 4 engineers**; PagerDuty or equivalent (this is the first paid observability tool the platform adopts).
  - Each alert has a runbook (linked from alert payload) and known-issue history.
- **Reasoning:** Without runbooks and rotation, MTTR exceeds RTO. Paid paging is deferred until paying customers exist.
- **Priority:** Should-have at MVP, Must-have at production launch.
- **Validation method:** On-call schedule audit; runbook coverage report.

---

## 9. Deployment and Release Management

### 9.1 CI/CD Expectations

- **Category:** Deployment
- **Requirement:** Automated pipeline from PR to production.
- **Source:** Suggested.
- **Target:**
  - Every PR triggers: build, unit test, integration test (Testcontainers), lint, SAST, dependency scan, container image build with SBOM.
  - Main-branch merge promotes through environments via automated CI/CD pipeline (runtime-native deployment workflow; no Argo CD requirement in MVP).
  - Pipeline duration: PR feedback ≤ **10 minutes** at MVP, ≤ **8 minutes** at production launch.
- **Reasoning:** Fast feedback loops sustain release frequency.
- **Priority:** Must-have.
- **Validation method:** Pipeline duration dashboard; flaky-test report.

### 9.2 Deployment Frequency

- **Category:** Deployment
- **Requirement:** Target release cadence.
- **Source:** Suggested.
- **Target:**
  - MVP: **weekly** release to staging, **biweekly** to production.
  - Production launch: **daily** to staging, **weekly** to production (multiple releases per week allowed if low-risk).
- **Reasoning:** Balances velocity with audit/change-management overhead in FinTech.
- **Priority:** Should-have.
- **Validation method:** Release calendar; DORA metrics.

### 9.3 Rollback Requirements

- **Category:** Deployment
- **Requirement:** Fast, safe rollback path.
- **Source:** Suggested.
- **Target:**
  - Application rollback in **≤ 5 minutes** by redeploying the previous image tag.
  - Database migrations follow expand/contract pattern so previous app version remains compatible with the new schema for ≥ 1 release.
  - Feature flags gate user-facing risk; flag flip in **≤ 60 seconds**.
- **Reasoning:** Critical for keeping RTO inside 4 h (MVP) / 2 h (prod) under bad-deploy scenarios.
- **Priority:** Must-have.
- **Validation method:** Rollback drill per environment quarterly.

### 9.4 Blue/Green or Canary Deployment

- **Category:** Deployment
- **Requirement:** Reduced-risk deployment strategy.
- **Source:** Suggested.
- **Target:**
  - MVP: rolling deployment with health-check gating.
  - Production launch: **canary** deploy (5% -> 25% -> 100% over 30 minutes) with automated error-budget guardrails for chat and search SLOs.
- **Reasoning:** Limits blast radius of bad releases.
- **Priority:** Should-have at production launch.
- **Validation method:** Canary configuration review; canary outcome log.

### 9.5 Environment Strategy

- **Category:** Deployment
- **Requirement:** Named environments with parity.
- **Source:** Implied.
- **Target:** Four environments — **dev**, **test/CI**, **staging**, **production**. Staging mirrors production topology and uses anonymized or synthetic data only.
- **Reasoning:** Standard for regulated software.
- **Priority:** Must-have.
- **Validation method:** Environment inventory; parity-diff doc.

### 9.6 Infrastructure-as-Code

- **Category:** Deployment
- **Requirement:** All infrastructure declared in code.
- **Source:** Suggested.
- **Target:**
  - Terraform (or Bicep for Azure) for cloud resources; Helm or Kustomize for K8s manifests.
  - **No console-only changes** to production.
  - IaC scanned by tfsec / Checkov in CI.
- **Reasoning:** Reproducibility, auditability.
- **Priority:** Must-have at production launch.
- **Validation method:** Drift detection job; PR-based change history.

### 9.7 Release Approval Process

- **Category:** Deployment
- **Requirement:** Change control for production releases.
- **Source:** Suggested.
- **Target:**
  - Lightweight CAB-equivalent: every production release requires merge of a release PR with linked change-log and rollback note, approved by **at least one non-author engineer** plus **automated SLO check pass**.
  - For schema migrations: separate review by a DB-savvy reviewer.
- **Reasoning:** Aligns with SOC 2 change-management controls without slowing daily delivery.
- **Priority:** Must-have at production launch.
- **Validation method:** Release-PR audit log.

### 9.8 Database Migration Strategy

- **Category:** Deployment
- **Requirement:** Safe, reversible schema evolution.
- **Source:** Implied.
- **Target:**
  - Flyway or Liquibase migrations; one migration per PR where feasible.
  - **Expand/contract pattern**: additive change first, code uses new schema, old columns removed in a later release.
  - Long-running migrations on large tables run via online-DDL or batched scripts during low-traffic windows.
  - Vector-index rebuilds are background tasks; reads use the prior version until the new index passes validation.
- **Reasoning:** Avoids downtime; preserves rollback safety.
- **Priority:** Must-have.
- **Validation method:** Migration template; pre-deploy migration plan.

---

## 10. Compatibility and Accessibility

### 10.1 Supported Browsers

- **Category:** Compatibility
- **Requirement:** Supported browser matrix for the SPA.
- **Source:** Suggested.
- **Target:** Latest two stable major versions of **Chrome, Edge, Firefox, Safari**. No IE11. Tested via Playwright in CI.
- **Reasoning:** Internal FinTech tool; corporate fleets typically standardize on Chrome/Edge/Firefox.
- **Priority:** Must-have.
- **Validation method:** CI cross-browser test job.

### 10.2 Supported Devices

- **Category:** Compatibility
- **Requirement:** Primary device support.
- **Source:** Suggested.
- **Target:** Desktop and laptop (Windows, macOS, Linux) with 1280×720 minimum viewport. Tablet (iPad portrait/landscape) usable but not optimized; phone not officially supported in MVP.
- **Reasoning:** Workflow is read-heavy and admin-heavy; phone is not a primary surface.
- **Priority:** Should-have.
- **Validation method:** Responsive design check; manual tablet smoke test.

### 10.3 Mobile Responsiveness

- **Category:** Compatibility
- **Requirement:** Responsive layout to a documented breakpoint.
- **Source:** Suggested.
- **Target:** Layout responsive down to **≥ 768 px width** (tablet portrait). No degraded UX below; explicit "best on desktop" notice on smaller screens at MVP.
- **Reasoning:** Honest expectation-setting given target persona.
- **Priority:** Could-have for MVP, Should-have for production.
- **Validation method:** Storybook viewport tests.

### 10.4 Accessibility Standard

- **Category:** Accessibility
- **Requirement:** WCAG compliance target.
- **Source:** Suggested.
- **Target:**
  - MVP: best-effort **WCAG 2.1 AA** for primary user flows (login, search, chat, document view).
  - Production launch: **WCAG 2.1 AA** verified across all primary flows and admin UI; published Voluntary Product Accessibility Template (VPAT).
- **Reasoning:** Enterprise customers increasingly require VPAT; EU AI Act and EAA increase pressure on accessibility.
- **Priority:** Should-have for MVP, Must-have at production launch.
- **Validation method:** axe-core in CI; manual screen-reader test (NVDA / VoiceOver) per major release.

### 10.5 Localization / Internationalization

- **Category:** Compatibility
- **Requirement:** Locale support.
- **Source:** Suggested.
- **Target:**
  - MVP: **English-only UI**; document content is locale-agnostic.
  - Production launch: i18n framework in place (i18next), UI translatable; first non-English locale (German or French) shipped in first 6 months post-GA.
  - All date/number formatting locale-aware.
- **Reasoning:** EU customers expect at least DE/FR; building i18n later is expensive.
- **Priority:** Could-have for MVP, Should-have for production.
- **Validation method:** i18n linter (no hardcoded strings in components); locale toggle test.

### 10.6 API Compatibility Requirements

- **Category:** Compatibility
- **Requirement:** Stable contracts for frontend SPA, eval runner, future connectors.
- **Source:** Implied.
- **Target:** See 7.5 (versioning). All breaking changes communicated via release notes and deprecation headers.
- **Priority:** Must-have.
- **Validation method:** OpenAPI diff in CI.

---

## 11. Usability

### 11.1 User Onboarding

- **Category:** Usability
- **Requirement:** Fast first-success experience.
- **Source:** Suggested.
- **Target:**
  - A new user with a valid IdP account can log in, upload a document, and ask a question in **≤ 5 minutes** without external documentation.
  - First-run experience surfaces an example workspace and sample questions.
- **Reasoning:** Pilot adoption hinges on the first-success time.
- **Priority:** Should-have.
- **Validation method:** Quarterly UX test with 3 new users.

### 11.2 Maximum Steps for Key Workflows

- **Category:** Usability
- **Requirement:** Bounded click-counts for primary actions.
- **Source:** Suggested.
- **Target:**
  - Ask a question: ≤ **2 clicks + typing** from any logged-in page.
  - Upload a document: ≤ **4 clicks**.
  - Add a user to a workspace with a role: ≤ **5 clicks**.
  - Open an audit event detail: ≤ **3 clicks**.
- **Reasoning:** Drives information architecture choices.
- **Priority:** Could-have.
- **Validation method:** UX walkthrough script.

### 11.3 Form Validation Behavior

- **Category:** Usability
- **Requirement:** Validation feedback consistency.
- **Source:** Suggested.
- **Target:**
  - Inline validation on blur for individual fields; on submit for cross-field rules.
  - Error messages plain-language, action-oriented (e.g., "Please pick a workspace before uploading").
  - Errors never disappear silently — always either resolve to success state or remain visible.
- **Reasoning:** Reduces support load.
- **Priority:** Should-have.
- **Validation method:** Component design system; UX review.

### 11.4 Error Message Quality

- **Category:** Usability
- **Requirement:** Errors are useful, not scary.
- **Source:** Suggested.
- **Target:**
  - Every user-visible error includes: what happened, why (when safe to disclose), what to do next, and an opaque request ID for support.
  - No raw stack traces or internal IDs in UI.
  - Permission-denied errors say "You don't have access to this workspace" — never reveal whether a resource exists across tenants.
- **Reasoning:** Security + usability. Cross-tenant existence disclosure is a privacy issue.
- **Priority:** Must-have.
- **Validation method:** Error-catalog review; pen-test sub-task.

### 11.5 Admin Usability

- **Category:** Usability
- **Requirement:** Admin UI completeness.
- **Source:** Implied (BRD §3.6).
- **Target:**
  - All admin actions doable in-UI (no DB-only operations) for: user role assignment, workspace settings, document/collection management, ingestion retry, evaluation run, audit log view, retention settings, AI provider policy.
  - Bulk actions on document/user lists (multi-select).
- **Reasoning:** BRD §3.6 explicit; reduces accidental misconfigurations.
- **Priority:** Must-have.
- **Validation method:** Admin-task coverage matrix.

### 11.6 User Support Expectations

- **Category:** Usability
- **Requirement:** In-app support touchpoints.
- **Source:** Suggested.
- **Target:**
  - "Contact support" link with prefilled request ID in error contexts.
  - In-app help / docs link reachable from every page.
- **Reasoning:** Reduces friction; speeds up incident-related tickets.
- **Priority:** Could-have.
- **Validation method:** UX audit.

---

## 12. Data Quality and Integrity

### 12.1 Validation Rules

- **Category:** Data quality
- **Requirement:** Input validation at API and domain layer.
- **Source:** Suggested.
- **Target:**
  - File-type validation (MIME + magic-number) at upload; reject non-allowed types early.
  - File-size cap: **PDF <= 50 MB, MD/TXT <= 10 MB** (MVP) / 100 MB (production), aligned with ingestion PRD limits.
  - Field-level validation on all admin forms (lengths, allowed characters, foreign-key existence).
  - Reject any document with corrupted text-extraction output > 50% non-printable characters.
- **Reasoning:** Bad data poisons retrieval quality.
- **Priority:** Must-have.
- **Validation method:** Unit tests per validator.

### 12.2 Duplicate Handling

- **Category:** Data quality
- **Requirement:** Detect and handle duplicate uploads.
- **Source:** Suggested.
- **Target:**
  - Content-hash (SHA-256) computed on upload; same hash in same workspace surfaces a "duplicate detected" prompt (skip / replace / keep both).
  - Cross-tenant deduplication is **not allowed** (privacy boundary).
- **Reasoning:** Prevents storage bloat and noisy retrieval.
- **Priority:** Should-have.
- **Validation method:** Upload integration tests with identical-content scenarios.

### 12.3 Transaction Consistency

- **Category:** Data quality
- **Requirement:** Strong consistency for security/lifecycle changes.
- **Source:** Implied.
- **Target:**
  - All permission, role, deletion, and lifecycle state transitions occur within a single DB transaction.
  - Audit-event write occurs in the same transaction as the action it describes (BRD's "audit must record the action" is binding).
- **Reasoning:** Avoids the worst class of bug: action happens, audit doesn't (or vice versa).
- **Priority:** Must-have.
- **Validation method:** Code review checklist; integration tests verifying audit + action atomicity.

### 12.4 Eventual Consistency Tolerance

- **Category:** Data quality
- **Requirement:** Defined eventually-consistent paths.
- **Source:** Implied.
- **Target:**
  - Ingestion is eventually consistent: a new document is acknowledged immediately but only becomes searchable when indexing completes (BRD §3.1 explicit).
  - Vector-index reads against the previous version are tolerated during reindexing (BRD §4.4 explicit).
  - Caches (if used) carry max staleness **≤ 60 seconds** for permission data; permission cache must support immediate invalidation on role change.
- **Reasoning:** Allows performance optimizations without compromising correctness.
- **Priority:** Must-have.
- **Validation method:** Cache-invalidation integration tests.

### 12.5 Data Reconciliation Requirements

- **Category:** Data quality
- **Requirement:** Periodic consistency checks across stores.
- **Source:** Suggested.
- **Target:** Nightly reconciliation jobs:
  - Object storage ↔ DB document metadata (no orphaned files; no orphaned records).
  - DB chunks ↔ pgvector entries (no entries for deleted chunks; no orphan vectors).
  - DB roles ↔ IdP user list (warn on stale users beyond 30 days).
- **Reasoning:** Bug in deletion propagation is a compliance risk (BRD hard requirement).
- **Priority:** Should-have for MVP, Must-have at production launch.
- **Validation method:** Reconciliation report; mismatch alert.

### 12.6 Idempotency Requirements

- **Category:** Data quality
- **Requirement:** Idempotent operations where retries occur.
- **Source:** Implied.
- **Target:**
  - Upload accepts an optional client-supplied `Idempotency-Key` header; identical key within 24 h returns the original job ID.
  - Ingestion job retries are idempotent at every stage (parse, chunk, embed, index).
  - Provider call wrappers are idempotent over the network retry window.
- **Reasoning:** Prevents duplicates on transient client/network failure.
- **Priority:** Should-have.
- **Validation method:** Idempotency contract tests.

### 12.7 Auditability of Critical Changes

- **Category:** Data quality
- **Requirement:** All critical actions captured in `audit_events`.
- **Source:** Explicit (BRD §2.5).
- **Target:** See 4.7 (Audit Logging). Every critical action listed in BRD §2.5 produces exactly one audit record per occurrence.
- **Priority:** Must-have.

---

## 13. Summary Table

| #     | Category                       | Requirement                                    | Source     | MVP target                                    | Prod-launch target                              | Priority    |
| ----- | ------------------------------ | ---------------------------------------------- | ---------- | --------------------------------------------- | ----------------------------------------------- | ----------- |
| 1.1   | Availability                   | Monthly uptime SLA                             | Explicit   | 99.0% (best-effort)                           | 99.9% (99.95% future)                           | Must-have   |
| 1.2   | Availability                   | Planned maintenance window                     | Explicit   | ≤ 2/month, ≤ 2 h, off-hours                   | Same                                            | Must-have   |
| 1.3   | Availability                   | RTO                                            | Explicit   | 4 h                                           | 2 h (1 h future)                                | Must-have   |
| 1.4   | Reliability                    | RPO                                            | Explicit   | 24 h                                          | 1 h (15 min future)                             | Must-have   |
| 1.5   | Reliability                    | Read-path error rate                           | Suggested  | < 0.5%                                        | < 0.1%                                          | Must-have   |
| 1.6   | Reliability                    | Chat success rate                              | Implied    | ≥ 98% normal, ≥ 90% degraded                  | Same                                            | Should-have |
| 1.7   | Reliability                    | Retry policy                                   | Explicit/* | Ingestion 3×, LLM 2×, embed 3×, DB 3×         | Same                                            | Must-have   |
| 1.8   | Reliability                    | Graceful degradation                           | Explicit   | Per-dependency runbook                        | Same                                            | Must-have   |
| 1.9   | Reliability                    | Circuit breaker / bulkhead                     | Suggested  | Per-provider config                           | Same                                            | Should-have |
| 2.1   | Performance                    | Search latency                                 | Explicit   | p95 ≤ 1.5 s                                   | p95 ≤ 1.0 s                                     | Must-have   |
| 2.2   | Performance                    | Chat TTFT                                      | Explicit   | p95 ≤ 2 s                                     | p95 ≤ 1.5 s                                     | Must-have   |
| 2.3   | Performance                    | Chat full answer                               | Explicit   | p95 ≤ 8 s                                     | Same                                            | Must-have   |
| 2.4   | Performance                    | RAG retrieval + prompt build                   | Explicit   | p95 ≤ 1.5 s                                   | Same                                            | Must-have   |
| 2.5   | Performance                    | Upload ack                                     | Explicit   | p95 ≤ 2 s                                     | Same                                            | Must-have   |
| 2.6   | Performance                    | Ingestion TXT/MD ≤ 5 MB                        | Explicit   | p95 ≤ 2 min                                   | Same                                            | Must-have   |
| 2.7   | Performance                    | Ingestion text PDF ≤ 25 MB                     | Explicit   | p95 ≤ 10 min                                  | Same                                            | Must-have   |
| 2.8   | Performance                    | FCP                                            | Suggested  | p75 ≤ 1.8 s                                   | Same                                            | Should-have |
| 2.9   | Performance                    | TTI                                            | Suggested  | p75 ≤ 3.5 s                                   | Same                                            | Should-have |
| 2.10  | Performance                    | TTFB                                           | Suggested  | p75 ≤ 600 ms                                  | Same                                            | Should-have |
| 2.11  | Performance                    | Job queue wait                                 | Implied    | p95 ≤ 30 s                                    | p95 ≤ 10 s                                      | Should-have |
| 2.12  | Performance                    | Peak-load degradation                          | Implied    | ≤ 50% degradation @ 2× load                   | Same                                            | Should-have |
| 2.13  | Performance                    | Download throughput                            | Suggested  | ≥ 5 MB/s                                      | Same                                            | Could-have  |
| 3.1   | Scalability                    | Active users / tenant                          | Explicit   | 50                                            | 200 (1000 future)                               | Must-have   |
| 3.2   | Scalability                    | Concurrent chat / tenant                       | Explicit   | 10                                            | 50 (200 future)                                 | Must-have   |
| 3.3   | Scalability                    | Concurrent ingestion / tenant                  | Explicit   | 5                                             | 20                                              | Must-have   |
| 3.4   | Scalability                    | Documents / chunks per tenant                  | Explicit   | 1 000 / 100 k                                 | 20 k / 2 M (100 k / 10 M future)                | Must-have   |
| 3.5   | Scalability                    | Total tenants                                  | Implied    | 5                                             | 50 (200 future)                                 | Should-have |
| 3.6   | Scalability                    | Read/write mix                                 | Suggested  | 70/15/10/5                                    | Same                                            | Should-have |
| 3.7   | Scalability                    | Data growth                                    | Suggested  | ~5 GB/mo/tenant                               | Same                                            | Should-have |
| 3.8   | Scalability                    | Horizontal scaling                             | Implied    | Stateless API + worker                        | HPA-driven                                      | Must-have   |
| 3.9   | Scalability                    | Peak scenarios                                 | Suggested  | 2 named scenarios                             | Same                                            | Should-have |
| 4.1   | Security                       | OIDC SSO                                       | Explicit   | Keycloak (dev), enterprise OIDC (prod)        | Same                                            | Must-have   |
| 4.2   | Security                       | Workspace RBAC + doc ACL fail-closed           | Explicit   | Mandatory pre-retrieval filter                | Same                                            | Must-have   |
| 4.3   | Security                       | Cross-tenant isolation                         | Explicit   | Tenancy-aware queries / RLS                   | Same                                            | Must-have   |
| 4.4   | Security                       | TLS in transit                                 | Implied    | TLS 1.2+                                      | TLS 1.3 + mTLS internal                         | Must-have   |
| 4.5   | Security                       | Encryption at rest                             | Implied    | Managed keys                                  | CMK for sensitive workspaces                    | Must-have   |
| 4.6   | Security                       | Secrets mgmt + rotation                        | Suggested  | Secret manager + 90-day rotation              | + 30 days for AI keys                           | Must-have   |
| 4.7   | Security                       | Append-only audit log                          | Explicit   | DB grant + 1-year retention                   | Same                                            | Must-have   |
| 4.8   | Security                       | Session mgmt                                   | Implied    | AT 15 min, RT 8 h, idle 30 min                | Same                                            | Must-have   |
| 4.9   | Security                       | Password policy (delegated)                    | Explicit   | IdP-enforced                                  | + MFA mandatory                                 | Must-have   |
| 4.10  | Security                       | OWASP + LLM-Top-10 + 3-layer rate limiting    | Suggested  | Baseline mitigations; rate limits in Spring + edge | + annual pen test; shared counters (Redis/PG)  | Must-have   |
| 4.11  | Security                       | Compliance posture                             | Explicit   | GDPR / NIS2 / DORA-aligned, no cert.          | SOC 2 Type 1 ready                              | Must-have   |
| 4.12  | Security                       | Retention enforcement                          | Explicit   | Daily retention job, vector-propagating       | Same                                            | Must-have   |
| 5.1   | Privacy                        | PII handling + DSR SLA                         | Implied    | 30-day DSR                                    | Same                                            | Must-have   |
| 5.2   | Privacy                        | Data minimization to providers                 | Explicit   | Top-k only, no internal IDs                   | Same                                            | Must-have   |
| 5.3   | Privacy                        | Data classification                            | Implied    | 4-tier classification                         | Mandatory per workspace                         | Should-have |
| 5.4   | Privacy                        | Consent banner for chat storage                | Suggested  | Show when retention enabled                   | Same                                            | Should-have |
| 5.5   | Privacy                        | Right to access / delete / export              | Implied    | 30-day SLA                                    | Same                                            | Must-have   |
| 5.6   | Privacy                        | EU/EEA residency                               | Explicit   | Pre-call residency check                      | Same                                            | Must-have   |
| 5.7   | Privacy                        | Backup retention                               | Explicit   | 30 d, same region                             | Same                                            | Must-have   |
| 5.8   | Privacy                        | Log retention                                  | Explicit   | Ops 30 d / audit 1 y                          | Same                                            | Must-have   |
| 5.9   | Privacy                        | Pseudonymization                               | Suggested  | Opaque user IDs in logs                       | Same                                            | Should-have |
| 6.1   | Cost                           | Hosting model                                  | Explicit   | Single VM / Container App / App Service / Docker Compose on VM (K8s forbidden) | Managed cloud (Azure pref); K8s optional       | Must-have   |
| 6.2   | Cost                           | Cloud provider                                 | Implied    | Azure primary                                 | Same                                            | Should-have |
| 6.3   | Cost                           | MVP budget                                     | Suggested  | ≤ €500/mo (single VM, PG-only, lightweight obs.) | n/a                                            | Should-have |
| 6.4   | Cost                           | Prod budget                                    | Suggested  | n/a                                           | ≤ €8 000/mo                                     | Should-have |
| 6.5   | Cost                           | AI cost cap / tenant                           | Suggested  | €150/mo + alerts                              | €500/mo + alerts                                | Should-have |
| 6.6   | Cost                           | Cost per chat answer                           | Suggested  | ≤ €0.03 (median)                              | ≤ €0.02 (median)                                | Should-have |
| 6.7   | Cost                           | Autoscaling                                    | Implied    | No autoscaling; 1 API + 1 worker fixed         | Min 2 / max 10 API; HPA                         | Should-have |
| 6.8   | Cost                           | Observability cost                             | Suggested  | €0 SaaS spend (PG-stored metrics + stdout logs) | ≤ 10% of infra                                 | Must-have   |
| 6.9   | Cost                           | Provider rate limits (3-layer, SAD §7.8)       | Implied    | Budget cap + user rate in Spring (in-mem)      | + shared Redis/PG counters; managed WAF at edge | Must-have   |
| 6.10  | Cost                           | MVP cost-control rule (out-of-scope list)      | Suggested  | K8s / dedicated vector DB / SIEM / multi-region etc. forbidden | Re-evaluated case-by-case      | Must-have   |
| 7.1   | Maintainability                | Code review + lint                             | Suggested  | ≥ 1 approver, lint blocking                   | Same                                            | Must-have   |
| 7.2   | Maintainability                | Coverage                                       | Suggested  | 70% (90% security-critical)                   | 80% (90% security-critical)                     | Must-have   |
| 7.3   | Maintainability                | SAST + deps                                    | Suggested  | CodeQL + Dependabot                           | + secret scanning                               | Must-have   |
| 7.4   | Maintainability                | Docs (OpenAPI + ADR + runbooks)                | Implied    | Per feature                                   | Same                                            | Must-have   |
| 7.5   | Maintainability                | API versioning                                 | Suggested  | URI v1                                        | + 6-mo deprecation                              | Must-have   |
| 7.6   | Maintainability                | Modular architecture                           | Implied    | ArchUnit-enforced boundaries                  | Same                                            | Must-have   |
| 7.7   | Maintainability                | Dependency mgmt                                | Suggested  | Renovate weekly                               | Same                                            | Should-have |
| 7.8   | Maintainability                | Tech-debt tracking                             | Suggested  | 20% sprint capacity                           | Same                                            | Should-have |
| 7.9   | Maintainability                | Refactor culture                               | Suggested  | PR-side cleanups                              | Same                                            | Could-have  |
| 8.1   | Observability                  | Structured JSON logs                           | Explicit   | stdout, 7-14 d pilot retention, no aggregator | Central platform, 30 d retention                | Must-have   |
| 8.2   | Observability                  | Metrics families                               | Explicit   | Persisted in PostgreSQL; admin dashboard       | Prometheus / managed Grafana                    | Must-have   |
| 8.3   | Observability                  | OTel tracing                                   | Implied    | None (correlation IDs only)                   | 10% sample / 100% errors                        | Could-have→Must |
| 8.4   | Observability                  | Alerting                                       | Suggested  | In-app + email; minimal categories            | Full P1/P2/P3 catalog + Slack/Teams             | Must-have   |
| 8.5   | Observability                  | Dashboards                                     | Implied    | Ops + tenant admin + auditor                  | Same                                            | Must-have   |
| 8.6   | Observability                  | Health checks                                  | Explicit   | Liveness + readiness                          | Same                                            | Must-have   |
| 8.7   | Observability                  | SLOs                                           | Suggested  | 5 SLOs                                        | + error-budget alerts                           | Should-have |
| 8.8   | Operations                     | Incident response                              | Suggested  | P1 ack 15 min                                 | + RCA SLAs                                      | Must-have   |
| 8.9   | Operations                     | On-call                                        | Suggested  | Business hours, no paid paging tool           | 24×7 ≥ 4 engineers + PagerDuty                  | Should-have→Must |
| 9.1   | Deployment                     | CI/CD pipeline                                 | Suggested  | < 10 min PR feedback                          | < 8 min                                         | Must-have   |
| 9.2   | Deployment                     | Release cadence                                | Suggested  | Weekly → biweekly                             | Daily → weekly                                  | Should-have |
| 9.3   | Deployment                     | Rollback                                       | Suggested  | ≤ 5 min app rollback                          | Same + canary auto-revert                       | Must-have   |
| 9.4   | Deployment                     | Canary                                         | Suggested  | Rolling                                       | 5%/25%/100% canary                              | Should-have |
| 9.5   | Deployment                     | Environments                                   | Implied    | dev/test/staging/prod                         | Same                                            | Must-have   |
| 9.6   | Deployment                     | IaC                                            | Suggested  | Terraform/Bicep, scanned                      | + drift detection                               | Must-have   |
| 9.7   | Deployment                     | Release approval                               | Suggested  | 1 non-author approver                         | + DB reviewer for migrations                    | Must-have   |
| 9.8   | Deployment                     | DB migrations                                  | Implied    | Flyway expand/contract                        | Same                                            | Must-have   |
| 10.1  | Compatibility                  | Browser matrix                                 | Suggested  | Chrome, Edge, FF, Safari (latest 2)           | Same                                            | Must-have   |
| 10.2  | Compatibility                  | Devices                                        | Suggested  | Desktop + tablet                              | Same                                            | Should-have |
| 10.3  | Compatibility                  | Responsive ≥ 768 px                            | Suggested  | Tablet-friendly                               | Same                                            | Should-have |
| 10.4  | Accessibility                  | WCAG 2.1 AA                                    | Suggested  | Best-effort                                   | Verified + VPAT                                 | Should-have |
| 10.5  | Compatibility                  | i18n                                           | Suggested  | English only                                  | i18n framework + 1 locale                       | Should-have |
| 10.6  | Compatibility                  | API stability                                  | Implied    | v1, deprecation headers                       | Same                                            | Must-have   |
| 11.1  | Usability                      | First success ≤ 5 min                          | Suggested  | Achievable                                    | Same                                            | Should-have |
| 11.2  | Usability                      | Click bounds for key workflows                 | Suggested  | 2/4/5/3 clicks                                | Same                                            | Could-have  |
| 11.3  | Usability                      | Form validation                                | Suggested  | Inline + on submit                            | Same                                            | Should-have |
| 11.4  | Usability                      | Error messages                                 | Suggested  | Action-oriented + request ID                  | Same                                            | Must-have   |
| 11.5  | Usability                      | Admin UI completeness                          | Implied    | All admin tasks in UI                         | + bulk actions                                  | Must-have   |
| 11.6  | Usability                      | Support touchpoints                            | Suggested  | In-app help + contact                         | Same                                            | Could-have  |
| 12.1  | Data quality                   | Input validation                               | Suggested  | MIME + magic + size                           | Same                                            | Must-have   |
| 12.2  | Data quality                   | Duplicate detection                            | Suggested  | SHA-256 dedupe (intra-tenant)                 | Same                                            | Should-have |
| 12.3  | Data quality                   | Transactional audit                            | Implied    | Same tx as action                             | Same                                            | Must-have   |
| 12.4  | Data quality                   | Eventual consistency bounds                    | Implied    | Permission cache ≤ 60 s                       | Same                                            | Must-have   |
| 12.5  | Data quality                   | Reconciliation jobs                            | Suggested  | Nightly                                       | + mismatch alert                                | Should-have |
| 12.6  | Data quality                   | Idempotency                                    | Implied    | `Idempotency-Key` header                      | Same                                            | Should-have |
| 12.7  | Data quality                   | Auditability of critical changes               | Explicit   | Per BRD §2.5                                  | Same                                            | Must-have   |

---

## 14. Assumptions

1. Pilot customers and production tenants are EU/EEA-based FinTech engineering organizations; **EU residency is the primary deployment.**
2. Typical document corpus per tenant is dominated by **engineering wikis, regulatory documents, runbooks, and ADRs** — text-based, not image-heavy.
3. **Azure OpenAI** is the preferred MVP LLM provider, hosted in an EU region; embedding model is consistent with the LLM provider tier.
4. **Single VM / Container App / App Service / Docker Compose on VM** suffices for MVP; first paid deployments move to managed cloud (Container Apps / App Service / ECS) within 6 months of MVP launch. **Kubernetes (AKS / EKS / GKE) is out of scope for MVP** and only adopted at production launch if multi-tenant scale-out justifies the platform-engineering overhead.
5. **MVP infra spend ceiling is €500/mo** (excluding AI provider costs), with the architectural cost-control rule in NFR §6.10 binding (no Kubernetes, no dedicated vector DB, no SIEM, no managed observability SaaS, no multi-region, no HA replicas). Production launch ceiling is €8 000/mo. Per-tenant AI cap defaults are €150/mo (MVP) / €500/mo (production launch). These figures still need stakeholder confirmation against actual pilot quotes.
6. Users are **internal employees** of the tenant — no consumer-facing UX or open registration; B2B-only.
7. **OCR / scanned PDFs / image-based content are out of scope** per BRD §3.4.
8. **No real-time financial decisioning, KYC/AML, or PCI cardholder data** is processed by the system (BRD §1, §4.1).
9. Engineering team is sized to deliver MVP within **~6 months** with 4-6 engineers; this informs the test-coverage and process-maturity targets.
10. The "production launch" milestone implies **paying customers under contract** and triggers tightened SLAs, audit-readiness, and 24×7 on-call.
11. **English-only UI** at MVP; other locales are explicitly deferred.
12. **WCAG 2.1 AA** is sufficient — WCAG 2.2 AAA is not in scope.
13. **No real-time data export to external SIEMs in MVP** — log shipping is fine; integrations such as Sentinel/Splunk are roadmap items.
14. **No customer-managed encryption keys in MVP** (BRD §4.2 explicit out-of-scope).
15. **Backups stay in the same region as primary** (BRD §4.5).

---

## 15. Open Questions for Stakeholders

1. **MVP infrastructure budget validation.**
   The MVP infrastructure ceiling is currently set at **€500/month**, excluding AI provider costs. This assumes a single-region pilot environment for up to 5 tenants, using a lean deployment model: small VM or Container App/App Service, PostgreSQL + pgvector, object storage, lightweight logs/metrics, SMTP/email, and no Kubernetes or managed SIEM.

   Open questions:
    - Has this €500/month ceiling been validated against a real Azure or AWS quote for the pilot footprint?
    - If the real quote exceeds €500/month, which cost lever should flex first?
    - Proposed order:
        1. reduce log retention
        2. disable chat-content retention completely
        3. use PostgreSQL on the same VM instead of managed PostgreSQL
        4. move from Container Apps/App Service to a single VM with Docker Compose
        5. reduce concurrent ingestion jobs from 5 to 3 per tenant

2. **AI usage budget and unit economics.**
   The AI budget is currently capped at **€150/month per tenant for MVP** and **€500/month per tenant for production launch**. The target unit economics are **≤ €0.03 per answer median in MVP** and **≤ €0.02 per answer in production**.

   Open questions:
    - Is the €150/month MVP AI cap realistic for expected pilot usage?
    - Does the expected usage pattern of 50 chat answers/day × 22 working days ≈ 1,100 answers/month represent a realistic pilot tenant?
    - Does the €0.03/answer MVP target include only chat generation, or also retrieval, embeddings, evaluations, and re-indexing?
    - Should ingestion embeddings be counted against the same tenant AI cap as chat usage, or tracked separately?
    - What should happen when a tenant reaches the AI budget cap: hard block, admin approval, or automatic downgrade to a cheaper model?

3. **Production infrastructure budget model.**
   The production-launch infrastructure ceiling is currently set at **€8,000/month**, excluding or including AI costs depending on final pricing model confirmation.

   Open questions:
    - Should the €8,000/month production ceiling remain an absolute platform budget?
    - Or should it be expressed as a per-tenant target, for example **€200/month per tenant at 40 tenants**, for clearer FinOps tracking?
    - Which production features are included in this ceiling: managed database HA, backups, observability, SIEM export, on-call tooling, and alerting?
    - Are any currently out-of-scope items expected by pilot customers from day 1?

4. **Tenant-funded exceptions.**
   Some enterprise customers may require features that are intentionally out of MVP scope, such as managed SIEM integration, extended retention, private deployment, customer-managed keys, or enhanced observability.

   Open questions:
    - Can such features be treated as tenant-funded exceptions?
    - If yes, should the BRD include an explicit exception rule for customer-funded enterprise requirements?
    - Who approves these exceptions: Product Owner, Engineering Lead, Finance, or Security/Compliance?

5. **Production SLA commitments.**
   Are paying customers expecting **99.9% availability** at launch, or is **99.5%** acceptable for the first production release? Will contractual penalties apply?

6. **Self-hosted / sovereignty-sensitive deployments.**
   Which tenants, if any, require a fully self-hosted or private-cloud deployment at production launch rather than as a later roadmap option?

7. **Compliance certifications.**
   Which formal certifications or assurance milestones are required within the first 12 months after MVP: **SOC 2 Type 1**, **SOC 2 Type 2**, **ISO 27001**, internal security review, or customer-specific vendor assessment?

8. **Customer-managed keys.**
   Are customer-managed encryption keys required at production launch, or can they remain a future-scale requirement?

9. **Support and on-call model.**
   Does production launch require **24×7 on-call support**, or is business-hours support acceptable initially? If 24×7 is required, will it be staffed internally or through a partner?

10. **AI provider mix.**
    Beyond Azure OpenAI, which providers must be supported at production launch: OpenAI direct, self-hosted/local models, AWS Bedrock, Anthropic, or others?

11. **Locales and language support.**
    Which languages/locales are required for production launch? Are German and French both required, or can English-only be accepted for MVP/pilot?

12. **GDPR data-subject request SLA.**
    Is the standard **30-day GDPR response window** sufficient, or do enterprise customers require a shorter contractual SLA such as 7 or 14 days?

13. **Chat-content retention default.**
    Chat content is currently disabled by default. Are any pilot tenants expected to enable full chat history from day 1? If yes, this affects storage, logging, privacy review, and deletion workflows.

14. **Mobile support.**
    Is phone-sized viewport support required at production launch, or is desktop/tablet support sufficient for the first release?

15. **Browser support.**
    Do any target tenants use locked-down enterprise browser versions older than the last two major Chrome/Edge releases?

16. **Data classification model.**
    Does the proposed three-tier classification model — **standard / restricted / strict** — match how pilot customers already classify documents?

17. **Budget-cap behavior.**
    When a tenant reaches its AI budget cap, should the system:
    - block new chat requests,
    - degrade to a cheaper model,
    - allow admin-approved overage,
    - or continue while only raising an alert?

---

## 16. MVP vs Production-Grade Requirements Distinction

| Concern                       | MVP                                                          | Production-grade                                                                |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Runtime                       | Single VM / Container App / App Service / Docker Compose on VM; no K8s | Managed container platform (Container Apps / App Service / ECS); K8s only if scale demands it |
| Data tier                     | Single PostgreSQL 16 + pgvector + FTS; no dedicated vector / search DB | Same PG + pgvector + FTS; migrate only if eval metrics demand                  |
| Object storage                | Azure Blob / S3 / MinIO; no doc-management SaaS              | Same                                                                            |
| Identity                      | Small Keycloak container, managed Entra ID / Okta, or dev OIDC mock | Managed Entra ID / Okta / Keycloak                                              |
| Availability                  | 99.0% best-effort, business-hours ops, single AZ, no HA replica | 99.9%, 24×7 on-call, multi-AZ HA, runbooks for all P1/P2 alerts                |
| Disaster recovery             | Daily backup, RTO 4 h, manual restore drill                  | PITR (RPO 1 h), RTO 2 h, automated DR drills quarterly                          |
| Deployment                    | Rolling, weekly cadence, no autoscaling                      | Canary, daily-capable, IaC drift detection, HPA, change-approval audit          |
| Security                      | OWASP basics, IdP-enforced auth, append-only audit           | + annual pen test, secret-rotation drill, SOC 2 Type 1 readiness                |
| Encryption                    | Managed keys                                                 | + CMK for Confidential / Restricted workspaces                                  |
| Observability                 | Stdout logs + Actuator + PG-stored metrics + admin dashboard; 7-14 d log retention; €0 SaaS spend | + OTel tracing, managed Grafana / Log Analytics, SLO dashboards, error-budget alerts, PagerDuty |
| Compliance                    | GDPR / NIS2 / DORA-aligned, no certification                 | SOC 2 Type 1 ready, GDPR DPA + DPIA documented                                  |
| Scale                         | 5 pilot tenants, 50 users / tenant, 1 k docs / 100 k chunks, 10 concurrent chats, 5 concurrent ingestion | 20-50 tenants, 200 users / tenant, 20 k docs / 2 M chunks |
| Cost discipline               | €500/mo infra cap, €150/mo per-tenant AI cap, €0.03/answer median, manual reviews | €8 000/mo infra, €500/mo AI cap, €0.02/answer median, FinOps reporting + per-tenant budget enforcement |
| Accessibility                 | Best-effort WCAG 2.1 AA                                      | Verified WCAG 2.1 AA + VPAT                                                     |
| Localization                  | English only                                                 | i18n framework + 1 additional locale                                            |
| Reconciliation                | Optional nightly                                             | Mandatory nightly + mismatch alerts                                             |
| Rate limits                   | Per-user                                                     | + per-tenant, + per-provider                                                    |
| Documentation                 | OpenAPI + READMEs                                            | + ADRs for every architectural change + runbook per alert + admin user guide    |

---

## 17. Trade-Offs

The following trade-offs are made explicit so that future scope/quality conversations have a shared frame. **The overarching MVP principle is: prefer lower cost, accept lower availability / latency / observability depth / answer richness, recover them at production launch when paying customers justify the spend.**

### 17.1 Latency vs Cost (chat)

A meaningful share of chat latency is provider-side. Tighter TTFT requires either:
- More expensive faster-tier models (cost ↑),
- Aggressive caching of retrieval and rerank results (complexity ↑),
- Smaller prompts via tighter retrieval / reranking (quality risk ↑).

**Chosen position (MVP):** take the BRD ceilings p95 ≤ 2 s TTFT and ≤ 8 s full answer as the **only** budget; do not invest in caching, reranking, faster model tiers, or warm-pool LLM endpoints to push latency lower. If pilot users complain about latency, the first responses are prompt-pruning and `topK` tuning — **not** a more expensive model. Production launch may invest in caching to tighten TTFT to p95 ≤ 1.5 s.

### 17.2 Security/Compliance vs Delivery Speed

Strict EU residency, fail-closed permission enforcement, audit completeness, and retention/deletion propagation all add development effort. **No trade-off is taken here at MVP** — these are hard requirements per BRD §8. Other features and infra tiers defer instead.

### 17.3 Availability vs Cost

Going from 99.0% to 99.9% typically multiplies infrastructure cost by ~2-3× (multi-AZ, hot standbys, more capacity headroom, paid 24×7 on-call). **MVP deliberately accepts a 99.0% best-effort target on a single-VM / single-AZ footprint with no HA replicas and no hot-standby providers, in exchange for the €500/mo infra ceiling (NFR §6.3).** Production launch buys multi-AZ HA and tightens the SLA to 99.9%.

### 17.4 Scale vs Multi-Tenancy Isolation

Logical multi-tenancy (shared DB) gives best cost efficiency at MVP scale; physical isolation gives strongest compliance posture. **MVP uses logical isolation**; the architecture preserves the option for per-tenant schemas/databases later (BRD §2.3 roadmap).

### 17.5 Observability Depth vs Cost

Full traces at 100% sampling, large log retention, and high-cardinality metrics can balloon observability costs. **MVP runs at €0 in dedicated observability SaaS** (NFR §6.8, §8.1, §8.2): logs to stdout with 7-14 day pilot retention, metrics persisted in the same PostgreSQL instance, dashboard rendered by the React admin app, no distributed tracing, no paid paging tool. The team gives up rapid root-cause analysis and proactive anomaly detection at MVP in exchange for the cost ceiling. Production launch buys managed Grafana / Log Analytics, 10%-sampled OTel tracing, and PagerDuty.

### 17.6 Local Provider Sovereignty vs Quality

Self-hosted (local) OpenAI-compatible providers may offer weaker answer quality vs Azure OpenAI. **The policy engine lets tenants choose explicitly**; no global trade-off is made on their behalf. Quality regression for sovereignty-sensitive workspaces is an accepted, documented possibility.

### 17.7 Cost-Per-Answer vs Answer Richness

Bigger prompts, reranking, larger `topK`, and higher model tiers improve answer quality but raise per-answer cost. **MVP defaults to the cheaper end of every knob:** small/medium model tier (e.g., GPT-4o-mini-class), default `topK` 6-8, no reranker, short prompts, no aggressive caching. Target: **≤ €0.03 per answer (median)** at MVP versus ≤ €0.02 at production launch. Workspaces that need a richer answer can opt in via their AI policy and absorb the extra per-answer cost against their per-tenant budget cap (NFR §6.5). Refusal behavior ("I don't know") is preferred over richer-model fallback for ambiguous queries — refusal is free, fallback isn't.

### 17.8 Infrastructure Footprint vs Operational Maturity

Kubernetes (AKS / EKS / GKE) gives smoother autoscaling, rolling deploys, and better observability ecosystems — at the cost of platform engineering effort and managed-control-plane fees. **MVP explicitly forgoes Kubernetes** (NFR §6.10) and runs on a single VM / Container App / App Service / Docker Compose on VM. The team accepts manual scaling and simpler deploys at MVP in exchange for €0 platform-engineering overhead. Kubernetes is revisited at production launch only when multi-tenant scale-out actually requires it.

### 17.9 Vendor Specialization vs Single-Store Simplicity

A dedicated vector DB (Pinecone, Weaviate) plus a dedicated search index (OpenSearch) may offer better retrieval quality and scale than `pgvector` + PostgreSQL FTS. **MVP collapses both into a single PostgreSQL instance** (BRD §1, §5.4) to minimize operational complexity and recurring SaaS spend. The retrieval-quality gap is monitored via the evaluation framework (PRD §04); migration to specialized stores is a documented post-MVP path if golden-suite metrics drop below thresholds.

---

## 18. Cross-Reference to BRD Hard Requirements

The following BRD §8 hard requirements are addressed in this NFR document:

- **Permission-aware retrieval, fail-closed:** §4.2, §4.3 (this doc).
- **Audit logging append-only and 1-year retention:** §4.7, §4.12.
- **Deletion propagation to vector index:** §4.12, §12.5.
- **EU/EEA residency by default:** §5.6.
- **Provider pre-call validation, fail-closed:** §5.6, §8.4 (alerting on provider-policy block events).
- **Durability of acknowledged uploads:** §1.4, §2.5.

---

**End of NFR v1.0.**
