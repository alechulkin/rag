# Prompt — Ingestion Slice Implementation Spec

Create `docs/specs/02_Ingestion_Spec.md` — a detailed implementation
specification for the **ingestion slice** (Solution_Architecture.md §8
track 2). Assumes the foundation slice spec exists.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries or conventions; reference
  `docs/Module_Boundaries.md`, `.claude/rules/documents-module.md`,
  `.claude/rules/worker-runtime-module.md`.
- Scope: MVP only. TXT/MD/PDF (text-based) upload + local folder import.
  No OCR, no external connectors.
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

`documents` (mgmt / pipeline / connector), `worker.runtime`,
`adapters.objectstorage`. Upload → AV → parse → chunk → embed → index →
cutover. Basic permission-filtered search.

## The specification must include

1. **Domain model**
   - documents, document_versions, chunks, chunk_embeddings, ingestion_jobs
     as Java records/classes mapped to Database_Schema
   - `DocumentSourceItem` per Shared_Abstractions (api in-process only —
     never crosses to worker)
   - Status enum exact: uploaded → pending_av → av_blocked | queued →
     parsing → chunking → embedding → indexed | failed
   - `job_type` enum (upload_ingest, reindex); tags array on documents

2. **Persistence & queue**
   - Flyway migrations for this slice per Database_Schema §9
   - DB queue semantics (ADR-010): `FOR UPDATE SKIP LOCKED` dequeue,
     `lock_token`, `available_after_at`, `locked_until`, lease expiry
     recovery, dead-letter columns, tenant-fair round-robin dequeue
   - Object storage areas: pending-av / quarantine / primary; idempotent
     move/delete operations

3. **API endpoints (openapi/documents.yaml + API_Contracts.md §3.1)**
   - `POST /workspaces/{id}/documents` — multipart, 202 + ids, ack < 2s
     after durable store; `Idempotency-Key` + content-hash dedupe (BA §7.3.b)
   - `GET /workspaces/{id}/documents/{docId}`
   - `DELETE` — soft delete (7-day grace), 202 + deletionJobId
   - Folder import endpoint (one-shot recursive, BA §7.3.f)
   - Validation: file caps PDF 50MB / MD-TXT 10MB (BA §7.3.a); MIME checks;
     scanned-PDF detection → `OCR_REQUIRED` (BA §7.3.c)
   - Error scenarios as ProblemDetails with status codes (400/401/403/409/413)

4. **Pipeline stages (worker profile)**
   - Stage-by-stage contract: AV scan (first gated stage) → parse → chunk
     (800 tokens default, 120 overlap, semantic boundaries; BA §7.3.e) →
     embed (batched, via `policy.callProvider()`) → index (via
     `search.SearchWriter`) → version activation
   - Activation rule (ADR-014): new version searchable only after full
     indexing; previous version stays active until cutover
   - Retries: 3x bounded; `current_stage` = in-flight stage,
     `last_completed_step` = resume checkpoint on retry; dead-letter with
     reason; manual retry endpoint
   - Embedding profile handling: single active profile at MVP; schema
     supports parallel profiles

5. **Basic search endpoint (openapi/search.yaml)**
   - `POST /workspaces/{id}/search` — hybrid (pgvector + FTS, RRF k=60)
     through `search` module only; every read carries `AllowedFilterSet`
   - HNSW params m=16, ef_construction=128, ef_search=64 (SAD §9.1)
   - Benchmark gate before merge: 100k-chunk corpus, p95 ≤ 1.0s,
     recall@8 ≥ 0.85; results recorded in a new ADR

6. **Audit events**
   - document.uploaded, document.av.blocked, document.indexed,
     document.upload.duplicate_ignored, document.deleted — in-transaction

7. **Test plan**
   - ArchUnit: mgmt⊥pipeline enforced
   - Integration (Testcontainers): dedupe no-op, AV quarantine path,
     activation atomicity (search never sees partial version), lease expiry
     job recovery, dead-letter after 3 retries, deletion propagation to
     chunks+embeddings+object storage, canary never returned by search
   - Ingestion throughput targets: TXT/MD 5MB < 2 min, PDF 25MB < 10 min (BRD §4.4)

Deliverable format: entities → migrations → pipeline stage contracts →
endpoints → jobs → tests.
