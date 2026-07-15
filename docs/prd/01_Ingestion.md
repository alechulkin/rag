# PRD — Document Ingestion (MVP)

**Status:** Draft v1.0
**Owner:** Product
**Source:** [docs/BRD.md §3.1, §4.4, §5.4](../BRD.md) · [docs/BA_Analysis.md §3.1, §7.3](../BA_Analysis.md)

---

## 1. Objective

Allow CONTRIBUTORs and ADMINs in a workspace to upload technical, compliance, and financial-domain documents and have them become searchable and chat-grounded within the SLOs of BRD §4.4, while honoring tenant/workspace residency and AI-provider policy.

## 2. In-Scope (MVP)

- File-type support: **PDF (text-based), Markdown (`.md`), plain text (`.txt`)**.
- Upload channels: UI drag-and-drop and REST API (`POST /api/v1/workspaces/{wsId}/documents`).
- Local folder one-shot import (recursive walk + filters).
- Document versioning with cutover-after-success semantics.
- Asynchronous pipeline: `uploaded -> pending_av -> [av_blocked] | queued -> parsing -> chunking -> embedding -> indexed | failed`.
- Pre-call AI-provider policy validation before any embedding call.
- Audit events for every state transition.

## 3. Out-of-Scope (MVP)

- Scanned PDFs / OCR.
- Connectors (GitHub, SharePoint, Confluence, etc.) — roadmap.
- Folder *sync* or *watch* — only one-shot.
- Cross-workspace document moves.
- Reindexing across multiple workspaces in one job.

## 4. Personas & Permissions

- **CONTRIBUTOR**: upload, retry, supersede, delete (subject to ACL).
- **ADMIN**: all CONTRIBUTOR actions + reindex, restore (within soft-delete window), manage chunking parameters.
- **USER / VIEWER**: cannot upload; can see ingestion status only if granted by ACL.

## 5. Functional Requirements

### 5.1 Upload & Validation
1. UI accepts drag-and-drop of one or more files; REST accepts multipart.
2. Backend validates synchronously, in order:
   1. Authorization (workspace membership + permission).
   2. MIME and extension match.
   3. Size limit: **PDF ≤ 50 MB, MD/TXT ≤ 10 MB** (hard caps; see [BA §7.3.a](../BA_Analysis.md#73-document-ingestion-resolves-63)).
   4. Duplicate check by content hash within `(workspace, collection, name)`:
      - matches active version → no-op + audit `document.upload.duplicate_ignored`, return existing doc.
      - matches older version → restore as new active version, audit `document.version.restored`.
3. Persist original file to a **pending-av area** in object storage (a dedicated prefix/container, encrypted, not indexed, not searchable, not available for chat). Persist document metadata + ingestion job row (initial status `pending_av`) in PostgreSQL **before** acknowledgement.
4. **Ack within 2 s p95** of file fully received (BRD §4.4). AV scanning is **not** on the ack path — it runs as the first gated worker stage (§5.2).
5. Return `documentId`, `versionNo`, `ingestionJobId`, current status (`pending_av`).

**Rationale for async AV (architecture risk #8 resolution).** Synchronous AV on the ack path risks blowing the 2 s budget on cold starts or large files. Moving AV to the first worker stage preserves the BRD's ack definition ("after validation and durable storage") while keeping the file in a non-indexed, non-searchable pending-av area until AV passes. The brief window where an unscanned file exists in encrypted object storage is accepted because the file is never parsed, chunked, indexed, searchable, or available for chat until `AV_PASSED`.

### 5.2 Ingestion Pipeline

**Phase 1 — AV gate (status `pending_av`).**

1. Worker picks up `ingestion_jobs` with status `pending_av`.
2. **Antivirus scan (first gated stage).** ClamAV-compatible scan on the file in the pending-av object-storage area.
   - **Clean:** move file from the pending-av area to the primary object-storage area; update job status to `queued`; audit `document.av.passed`.
   - **Positive detection:** retain file in a quarantine prefix; update job status to `av_blocked`; audit `document.av.blocked`; notify workspace admin. No further processing. The document is never searchable or chatable.

**Phase 2 — Ingestion (status `queued` → `parsing` → `chunking` → `embedding` → `indexed | failed`).**

3. Worker picks up `ingestion_jobs` with status `queued`.
4. **Parsing.** Extract text from PDF (text layer only), MD, TXT.
   - If extracted text < 200 chars AND char/byte density < 0.1 → fail with `OCR_REQUIRED`.
5. **Chunking.** Workspace-configurable parameters within bounds (BA §7.3.e):
   - chunk size default 800 tokens (200–1500).
   - overlap default 120 tokens (0–250).
   - Prefer semantic boundaries (markdown headings, paragraph breaks, PDF page breaks); fallback to fixed-size.
6. **Embedding.** Provider selected from workspace AI policy. Pre-call validation (region, retention, training, approval). Fail-closed.
7. **Indexing.** Write chunks + `chunk_embeddings` entries scoped by `(tenant, workspace, collection, document, version, embedding_profile)`.
8. **Cutover.** New version becomes active and searchable only after successful index of all chunks. Previous version remains active in the meantime.

**Cross-cutting pipeline rules.**

9. **Retries.** Up to 3 automatic with exponential backoff per stage (including AV). Authorized users can manually retry from a `failed` or `av_blocked` terminal state with full diagnostic context.
10. **Tenant fairness.** Workers consume jobs fairly across tenants so a single tenant's burst (e.g., bulk folder import) cannot starve others. Default: weighted round-robin across tenants with a ready job, bounded by the 5 concurrent ingestion jobs/tenant cap (BRD §4.4). Final dequeue strategy is an architecture decision (SAD §5, §9 worker-pool item).
11. **Dead-letter.** A job that exhausts its 3 automatic retries is marked `dead_letter = true` with a `dead_letter_reason`. Dead-lettered jobs stay queryable and are surfaced in the admin monitor (§5.6); they are re-enqueued only by an explicit authorized retry. Broker-level DLQ is roadmap (BRD §5.4).

### 5.3 Versioning & Supersede
- New uploads default to **new document**.
- Explicit "Upload new version of <document>" action creates a version under the existing document (BA §7.3.g).
- Same-hash dedupe (5.1.4) catches accidental re-uploads.

### 5.4 Deletion (Soft + Hard)
- Soft-delete on user action; 7-day window in which ADMIN can restore.
- After 7 days, the hard-delete job runs (BRD §4.5):
  1. Remove from search + chat.
  2. Drop chunks/embeddings + vector entries **for every embedding profile** (see below).
  3. Delete extracted text.
  4. Delete original file from object storage.
  5. Mark dependent golden questions stale.
- Audit retains tombstone (`id`, content hash, deleter, reason).
- **Deletion during reindex (hard requirement, SAD §3.2).** If the document is deleted while a new `embedding_profile` index family is being built, the deletion must be applied to **both** the active and the building profile (directly, or via a per-profile `pending_deletes` log the builder consumes). **Cutover to the new profile is blocked until its pending-delete set is drained**, so no orphan vectors survive activation. Deletion propagation to the vector index for all profiles is mandatory per BRD §4.5.

### 5.5 Local Folder Import
- ADMIN-only endpoint `POST /api/v1/workspaces/{wsId}/imports/folder`.
- Recursive walk of an allow-listed local path with include/exclude globs.
- Each file goes through the standard upload pipeline (5.1–5.2).
- One-shot only. No watcher in MVP.

### 5.6 Monitoring & Diagnostics
- Per-document status timeline visible to CONTRIBUTOR/ADMIN.
- Stage durations, error reason, retry count, current worker id surfaced in the admin UI.
- **Dead-lettered jobs** (retries exhausted, §5.2.9) listed in the admin ingestion monitor with `dead_letter_reason` and an explicit re-enqueue action for authorized users.
- **Per-tenant queue depth** surfaced so admins can see if one tenant's burst is backing up the shared worker pool (fairness, §5.2.8).
- Bulk reindex action (ADMIN) restricted to documents within a single workspace.

## 6. Non-Functional Requirements

- **Throughput SLOs (p95):** TXT/MD ≤ 5 MB → ≤ 2 min; text PDF ≤ 25 MB → ≤ 10 min.
- **Durability:** acknowledged uploads must not be lost; file + metadata + job durable before ack.
- **Concurrency:** 5 simultaneous ingestion jobs per tenant.
- **Residency:** all derived artifacts inherit source residency policy.
- **Permission inheritance:** chunks/embeddings inherit document ACL; retrieval filters scoped accordingly.

## 7. Data Model Touchpoints

- `documents`, `document_versions`, `ingestion_jobs`, `deletion_jobs`, `chunks`, `chunk_embeddings`, `audit_events`.
- New: `embedding_profile_id` foreign key on `chunks`.
- New: `ingestion_jobs.dead_letter` (boolean) + `ingestion_jobs.dead_letter_reason` (text), set on retry exhaustion (§5.2.9).
- New: per-profile `pending_deletes` (or equivalent delete-log) consumed by the reindex builder to satisfy delete-during-reindex propagation (§5.4, SAD §3.2).

## 8. APIs (illustrative)

- `POST /api/v1/workspaces/{wsId}/documents` (multipart upload).
- `POST /api/v1/documents/{docId}/versions` (supersede).
- `POST /api/v1/ingestion-jobs/{jobId}/retry`.
- `POST /api/v1/documents/{docId}:delete` (soft delete).
- `POST /api/v1/documents/{docId}:restore`.
- `POST /api/v1/workspaces/{wsId}/imports/folder` (admin).
- `GET /api/v1/documents/{docId}/status`.

## 9. Telemetry & Audit

- Metrics: ingest queue depth, per-stage latency, failure rate by reason, retry rate, AV-block count, throughput vs SLO.
- Audit: `document.uploaded`, `document.av.passed`, `document.av.blocked`, `text.extracted`, `chunks.created`, `embeddings.generated`, `document.indexed`, `ingestion.failed`, `document.deleted`, `document.restored`, `embedding_profile.activated`.

## 10. Acceptance Criteria

1. Uploaded PDF/MD/TXT becomes searchable within SLO and only after full successful indexing.
2. Failed ingestion shows a clear reason and is retryable manually.
3. Same-hash duplicate within the same `(workspace, collection, name)` does not create a new version.
4. Document deletion removes vector index entries (verified by a search returning zero hits).
5. Pre-call provider policy violation blocks embedding generation with audit and admin notification.
6. No unauthorized chunk is returned for ingestion-status queries to non-permitted users.
7. Deleting a document mid-reindex removes its vectors from **both** the active and the building embedding profile; cutover does not complete while the building profile has pending deletes (verified by deleting during a reindex, completing cutover, and asserting zero hits in the new profile).
8. A job that exhausts 3 retries is marked `dead_letter` with a reason, remains visible in the admin monitor, and is re-enqueued only by explicit authorized retry.
9. Under a single-tenant bulk import, other tenants' ingestion jobs continue to make progress (tenant fairness, §5.2.10).
10. Upload ack is returned before AV completes; the file sits in the pending-av area (encrypted, not indexed, not searchable) until AV passes (§5.1, §5.2 Phase 1).
11. AV-blocked files are quarantined and never reach parsing, chunking, indexing, search, or chat. The admin is notified and the audit event `document.av.blocked` is recorded.

## 11. Open Items (deferred to architecture)

- Exact chunking algorithm for PDFs with embedded code blocks.
- Format of folder-import allow-list (config vs UI-managed).
