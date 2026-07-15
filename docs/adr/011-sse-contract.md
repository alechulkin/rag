# ADR-011: SSE Streaming Contract for Chat

## Status
Accepted

## Decision
Chat SSE uses named events:
- `token`: incremental answer token.
- `citation`: citation payload update.
- `done`: successful completion summary.
- `error`: fail-closed/provider/unavailable payload.
- `heartbeat`: keepalive event.

Additional rules:
- Client reconnect does not resume prior generation; client must re-ask.
- Client cancellation aborts upstream provider call when possible.
- Partial stream still persists diagnostics and audit event.

## Consequences
- Frontend/backend streaming behavior is predictable.
- Interruptions remain inspectable.
