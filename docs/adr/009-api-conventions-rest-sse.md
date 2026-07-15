# ADR-009: API Conventions for REST + SSE

## Status
Accepted

## Decision
- Base path: `/api/v1`.
- Error envelope: RFC 7807 (`application/problem+json`) + `requestId`.
- Correlation: `X-Request-Id` accepted/preserved.
- Pagination: cursor for high-cardinality endpoints, offset allowed for low-cardinality admin lists.
- Idempotency: optional `Idempotency-Key` for upload/import/retry-sensitive operations.
- URL style: prefer resource paths and subresource verbs (`/retry`, `/restore`) over `:verb` suffix.

## Consequences
- Uniform client behavior.
- Lower OpenAPI drift and controller-level inconsistency.
