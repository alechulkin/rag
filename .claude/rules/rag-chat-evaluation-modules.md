---
paths:
  - backend/src/main/java/**/rag/**
  - backend/src/main/java/**/chat/**
  - backend/src/main/java/**/evaluation/**
  - src/main/java/**/rag/**
  - src/main/java/**/chat/**
  - src/main/java/**/evaluation/**
---

# RAG, Chat, Evaluation Module Rules

- `rag` resolves permissions internally via policy; callers never pass hand-built `AllowedFilterSet`.
- `chat` owns conversation state and memory window only; retrieval/generation stay in `rag`.
- `evaluation` must execute same permission-aware RAG pipeline as live chat.
- Keep SSE contract exact: `token`, `citation`, `heartbeat`, `done`, `error`.
- Reconnect does not resume old generation; client re-asks.
- Persist diagnostics/audit for completed and interrupted streams.
- Refusal behavior is deterministic and auditable when context is insufficient.
