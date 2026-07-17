---
paths:
  - backend/src/main/java/**/documents/**
  - src/main/java/**/documents/**
---

# Documents Module Rules

- Keep internal wall: `documents.mgmt` must not import `documents.pipeline`.
- API profile and worker profile communicate only through durable job rows + object keys.
- Upload acknowledgment requires durable metadata + ingestion job creation.
- New document version becomes searchable only after full indexing and activation.
- On reindex failure, previous active version remains searchable.
- Deletion must propagate to chunks, embeddings, indexes, and object storage.
- Hard-delete flow must be step-checkpointed and idempotent on retries.
