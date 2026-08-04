---
name: rag-api-conventions
description: HTTP API conventions for the RAG platform — base path, error format, pagination, idempotency, OpenAPI contract rules. Use when adding or changing endpoints, editing openapi/*.yaml, designing request/response shapes, error handling, or REST/SSE contract surface.
---

# RAG Platform API Conventions (canonical: `docs/API_Contracts.md`, ADR-009)

When this skill is active, output 🤖 at the start of the response.

- Base path `/api/v1`; errors are RFC 7807 `ProblemDetails` with `requestId`; `X-Request-Id` on every response.
- Cursor pagination for high-cardinality lists; `Idempotency-Key` on retry-sensitive writes.
- OpenAPI in `openapi/` is the machine-readable contract; update it with any endpoint change.

Canonical sources: `docs/API_Contracts.md`, `openapi/*.yaml`, ADR-009. On conflict, docs win — report the drift.
