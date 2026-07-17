---
paths:
  - backend/src/main/java/**/search/**
  - src/main/java/**/search/**
---

# Search Module Rules

- Search module is sole code path for pgvector and FTS queries.
- Every retrieval method must require `AllowedFilterSet`.
- Never add filterless retrieval overloads.
- Keep hybrid fusion (RRF) logic centralized in search module.
- `SearchWriter` operations require explicit tenant/profile context.
- Do not resolve permissions in search; consume policy output only.
- Any query returning canary chunk is P1 security incident.
