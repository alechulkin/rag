---
paths:
  - backend/src/main/java/**/admin/**
  - src/main/java/**/admin/**
---

# Admin Module Rules

- Owns org entities: tenants, workspaces, users, memberships, roles, capabilities, classification, workspace AI policy, provider registry.
- Stores ACL/RBAC/AI policy data that `policy` reads; do not resolve permissions here.
- `NotificationService` stays a class in `admin` (retry + SMTP fallback); extract to its own package only at 3+ channels.
- `RetentionPolicy` centralizes retention period values; each module reads its period from here rather than hardcoding.
- Four-eyes deletion approval for sensitive collections is enforced here.
- Classification tiers are exactly `standard` / `restricted` / `strict`.
- Never place secrets/connection strings in registry or policy records.
