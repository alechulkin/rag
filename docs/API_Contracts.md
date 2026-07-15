# API Contracts — AI Knowledge Assistant (MVP)

**Status:** Draft v1.0  
**Source inputs:** `docs/BRD.md`, `docs/NFR.md`, `docs/prd/*`, `docs/Solution_Architecture.md`, ADRs in `docs/adr/`, and OpenAPI in `openapi/*.yaml`  

> **Purpose.** Define the API contract surface (HTTP + SSE) at the same level of rigor as `docs/Database_Schema.md`: canonical naming, invariants, error semantics, and retry/idempotency rules. This is the human-readable contract; `openapi/*.yaml` is the machine-readable contract.

---

## 0. Contract governance

- **Base path**: `/api/v1` (ADR-009).
- **Source of truth**:
  - **Normative**: OpenAPI (`openapi/*.yaml` + `openapi/common.yaml`).
  - **Explanatory**: this document + ADRs (especially ADR-009/011/015).
- **Compatibility**:
  - New fields are additive and must be optional for clients.
  - Breaking changes require `/api/v2` with parallel availability (NFR §7.5).

---

## 1. Cross-cutting HTTP conventions (all endpoints)

### 1.1 Authentication & authorization

- **Auth**: `Authorization: Bearer <JWT>` (OIDC/OAuth2).
- **Tenant/workspace scoping**:
  - The API derives `tenant_id` from the token issuer/claims.
  - Requests are always scoped by `workspaceId` path parameter where relevant.
  - Access checks are enforced by the Policy Engine (ADR-004).

### 1.2 Correlation

- **Client may send**: `X-Request-Id`.
- **Server must return**: `X-Request-Id` on every response (including errors).

### 1.3 Errors (RFC 7807)

- Error responses use `application/problem+json` (ADR-009) and include:
  - `type`, `title`, `status`, `detail?`, `requestId`
- Canonical schema lives in `openapi/common.yaml#/components/schemas/ProblemDetails`.

### 1.4 Pagination

- **Cursor pagination** for high-cardinality resources (audit, jobs, messages, documents list).
- **Offset pagination** permitted for small bounded admin lists only.
- Canonical envelope: `CursorPage` in `openapi/common.yaml`.

### 1.5 Idempotency & retries

- Writes that may be retried due to network issues SHOULD accept `Idempotency-Key` (ADR-009).
- The server must either:
  - return the same outcome for the same key within the key TTL window, or
  - reject replays deterministically (409/422) with a clear `ProblemDetails.type`.

### 1.6 Rate limiting

- The Spring Boot API is the **source of truth** for per-user/per-tenant limits (SAD §7.8).
- When rejecting, prefer `429` with `Retry-After` and `ProblemDetails`.

---

## 2. Streaming (SSE) contract (Chat)

### 2.1 Endpoint behavior

- Chat answers stream over **SSE** (`Content-Type: text/event-stream`) (ADR-011).
- **Reconnect does not resume generation**; the client re-asks (PRD Chat §5.6).

### 2.2 Event types (canonical)

The canonical event set is defined by ADR-011 and is referenced by PRD Chat:

- `token`: incremental text.
- `citation`: emitted when a citation is discovered/attached.
- `heartbeat`: keep-alive.
- `done`: terminal success.
- `error`: terminal failure (must include `ProblemDetails` payload).

### 2.3 Cancellation semantics

- Client cancellation ends the stream.
- The server must still persist a terminal audit/diagnostic record for partial streams (ADR-015).

---

## 3. Endpoint inventory (MVP contract surface)

This inventory is organized by domain; exact schemas are defined in OpenAPI.

### 3.1 Documents & ingestion (`openapi/documents.yaml`)

- **Upload**
  - `POST /workspaces/{workspaceId}/documents`
  - Request: `multipart/form-data` with file + metadata
  - Response: `202 Accepted` (ack fast), returns `documentId`, `versionId`, `ingestionJobId`, initial status
  - **Idempotency**: supported via `Idempotency-Key` and/or `content_hash` semantics (PRD Ingestion)
- **Read metadata**
  - `GET /workspaces/{workspaceId}/documents/{documentId}`
- **Soft delete**
  - `DELETE /workspaces/{workspaceId}/documents/{documentId}`
  - Response: `202 Accepted` (deletion job scheduled) or `204 No Content` (soft delete immediate, hard delete async)

### 3.2 Search (`openapi/search.yaml`)

- `POST /workspaces/{workspaceId}/search`
  - Request: query + scope + filters
  - Response: `200 OK` with hits + `nextCursor?`
  - **Hard rule**: permission-aware retrieval is enforced before results are returned (BRD §2.2, ADR-004)

### 3.3 Chat (`openapi/chat.yaml`)

- `POST /workspaces/{workspaceId}/conversations` (create)
- `POST /conversations/{conversationId}/ask` (SSE stream)
- `POST /messages/{messageId}/feedback`

### 3.4 Evaluation (`openapi/evaluation.yaml`)

- `POST /workspaces/{workspaceId}/eval/suites/{suiteId}/runs`
  - Response: `202 Accepted` with `runId`

### 3.5 Admin (`openapi/admin.yaml`)

- Workspace/user/role/admin surfaces required to support RBAC, policy configuration, and platform bootstrap (PRD Admin).

---

## 4. Validation checks (contract hygiene)

After every contract update:

- **OpenAPI parses** (`openapi/*.yaml` + `openapi/common.yaml`).
- **Global invariants**:
  - All endpoints are under `/api/v1`.
  - Every error response uses `ProblemDetails`.
  - Every response returns `X-Request-Id`.
- **SSE invariants**:
  - Event types match ADR-011.
  - `error` event carries a `ProblemDetails` payload.

