---
paths:
  - backend/src/main/java/**/audit/**
  - src/main/java/**/audit/**
---

# Audit Module Rules

- Audit module is sole writer to `audit_events`.
- Writes are append-only; never implement update/delete paths.
- Audit writes stay transaction-coupled with parent action unless ADR-015 allows split transaction.
- Export paths must stream safely for large result sets.
- Keep event payloads structured and content-minimized.
- Never log secrets, raw prompt payloads, or unauthorized content.
