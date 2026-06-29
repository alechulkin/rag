# PRD — Search (MVP)

**Status:** Draft v1.0
**Owner:** Product
**Source:** [docs/BRD.md §3.2, §4.4, §5.4](../BRD.md) · [docs/BA_Analysis.md §3.2, §7.4](../BA_Analysis.md)

---

## 1. Objective

Provide fast, permission-aware semantic and keyword search over a workspace's indexed documents, returning ranked snippets with citation-ready metadata.

## 2. In-Scope (MVP)

- Hybrid search: dense vector (pgvector) + sparse FTS, fused via Reciprocal Rank Fusion (RRF).
- Filters: workspace, collection, document type, tags.
- Permission-aware filtering enforced before retrieval.
- Result snippets with document title, section/page, similarity score (CONTRIBUTOR+ only).
- Pagination: 20 per page, hard max 200 results per query.

## 3. Out-of-Scope (MVP)

- Cross-workspace search.
- Personalized re-ranking based on user history.
- Saved searches, alerts.
- Reranker-model integration (placeholder only; roadmap).

## 4. Personas & Permissions

- **USER, CONTRIBUTOR, ADMIN, VIEWER**: can search content they have ACL access to.
- **Similarity score visibility:** hidden from USER/VIEWER by default; visible to CONTRIBUTOR/ADMIN; workspace ADMIN can override per workspace (BA §7.4.b).

## 5. Functional Requirements

### 5.1 Query Modes
- Default mode: **Hybrid** (vector + FTS fused via RRF).
- Advanced toggle: **Exact phrase** — uses FTS only.
- A single query input + optional filter chips.

### 5.2 Permission Pre-Filter
1. Resolve `(tenant_id, workspace_id)` from request context (JWT + workspace selector).
2. Resolve ACL: list of allowed `collection_id`s and explicit `document_id` grants/denies.
3. Compose the SQL pre-filter; **never** issue a vector or FTS query without it (BRD §2.2, §5.4).

### 5.3 Ranking
- Dense: cosine similarity over `pgvector` **HNSW** index (SAD §9.1; default `m = 16`, `ef_construction = 128`, `ef_search = 64`). IVFFlat deferred to roadmap.
- Sparse: PostgreSQL `tsvector` + `ts_rank_cd`.
- Fusion: RRF with k = 60 (configurable). Tie-break by document recency.
- Parameters subject to the benchmark gate in SAD §9.1 before the ingestion slice merges.

### 5.4 Result Shape
- `documentId`, `versionNo`, `chunkId`, title, breadcrumbs (collection → document), excerpt (highlighted), section/page, similarity score (when visible), tags, lastModified, sourceType.

### 5.5 Filters
- Workspace (current only).
- Collection (multi-select).
- Document type (`pdf`, `md`, `txt`).
- Tags (any-of).

### 5.6 Pagination & Limits
- Page size: 20 (configurable per request 1–50).
- Hard max results: 200 across pagination.
- Cursor-based pagination over fused ranking is required for stability.

### 5.7 Empty Result Handling
- Show "No matches in your accessible content" with a hint to broaden filters or check permissions.
- Do NOT reveal existence of documents outside permission scope.

## 6. Non-Functional Requirements

- **Latency p95 < 1.5 s** on indexed accessible documents per BRD §4.4.
- 50 concurrent users / tenant; search must not starve chat retrieval (see SAD).
- Search executes only over the **active embedding profile**; superseded versions excluded.
- Index updates from ingestion must be visible to search within seconds of cutover.

## 7. Data Model Touchpoints

- Read-only against `chunks`, `embeddings`, `vector_index`, `documents`, `document_versions`, `collections`, `access_policies`.

## 8. APIs (illustrative)

- `POST /api/v1/workspaces/{wsId}/search`
  - body: `{ query, mode?: "hybrid" | "fts", filters, topK?, page?, cursor? }`
  - returns: `{ results: [...], page, nextCursor, total }`

## 9. Telemetry & Audit

- Metrics: query latency p50/p95/p99, no-result rate, RRF fusion stats, mode mix.
- Audit (for sensitive workspaces): `search.executed` with hashed query and result-count (no full query text by default; configurable per workspace AI policy).

## 10. Acceptance Criteria

1. Search returns only chunks the user is permitted to read (verified by ACL test fixtures).
2. p95 latency on a tenant with 100 k chunks ≤ 1.5 s under nominal load.
3. RRF ranking yields better top-3 relevance than dense-only or FTS-only on the golden suite (measured at evaluation).
4. Pagination cursor returns stable, non-duplicating results across pages.
5. Similarity score not present in API responses for USER/VIEWER by default.

## 11. Open Items

- ~~HNSW vs IVFFlat parameters tuned in SAD.~~ Resolved: HNSW with `m = 16`, `ef_construction = 128`, `ef_search = 64` (SAD §9.1). Benchmark gate required before ingestion-slice merge.
- Per-collection result diversification (roadmap).
