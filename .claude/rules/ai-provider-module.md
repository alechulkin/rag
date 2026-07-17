---
paths:
  - backend/src/main/java/**/ai/provider/**
  - src/main/java/**/ai/provider/**
---

# AI Provider Module Rules

- Adapter classes are package-private inside `ai.provider.adapter`; nothing outside instantiates them.
- Provider SDK types never leak past the adapter boundary (no SDK type in a public signature).
- Module is reachable only via `PolicyEngine.callProvider()`; never call it directly from domain code.
- No pre-call validation here; region/retention/training/approval checks live in `policy`.
- Adapters do low-level transient retry only; business retry/circuit-breaking is the caller's job.
- Return token usage to the caller; do not write audit or budget state from this module.
- Declare capabilities (chat/embedding/rerank), region, retention, embedding dimension per provider.
