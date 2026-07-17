---
paths:
  - backend/src/main/java/**/web/**
  - src/main/java/**/web/**
---

# Web (Controllers) Rules

- Controllers carry no business logic: deserialize, validate shape, delegate to application layer, serialize.
- Expose endpoints only under `/api/v1`; use SSE for streamed chat.
- Map all errors to one RFC 7807 `ProblemDetails` response model; always return `X-Request-Id`.
- Per-user/per-tenant rate limiting lives here (Spring filter, SAD §7.8 Concern 2); it is the source of truth.
- Group controllers per domain; do not create a global controller/service/repository layout.
- Frontend role checks are UX-only; the backend remains authoritative for authorization.
