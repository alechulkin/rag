---
paths:
  - backend/src/main/java/**/policy/**
  - src/main/java/**/policy/**
---

# Policy Module Rules

- Keep `policy.access` and `policy.providergate` separated by failure stance.
- `policy.access` may degrade to PostgreSQL reads on cache/listener failure.
- `policy.providergate` must fail closed when validation or budget state is uncertain.
- `PolicyEngine.callProvider()` is only allowed entry point for AI calls.
- Never import provider SDK classes in policy package.
- Policy reads ACL/RBAC/AI policy state from admin-owned tables; do not mutate admin entities here.
- Budget counter read/write ownership stays in policy module.
