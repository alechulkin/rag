# Prompt — Admin Slice Implementation Spec

Create `docs/specs/04_Admin_Spec.md` — a detailed implementation
specification for the **admin slice** (Solution_Architecture.md §8 track 4).
Assumes foundation + ingestion + chat slice specs exist.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries or conventions; reference
  `docs/Module_Boundaries.md`, `.claude/rules/admin-module.md`,
  `.claude/rules/web-module.md`.
- Scope: MVP only. No SCIM, no IdP group sync beyond read-only stub.
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

`admin` full CRUD: collections, ACLs, workspace AI policy, provider
registry, audit viewer, NotificationService; `web` rate-limit filter.
(Four-eyes deletion approval belongs to the hardening slice, SAD §8 track 6.)

## The specification must include

1. **Domain model**
   - access_policies (scope_type, scope_id, subject_type, subject_id,
     action), workspace_ai_policies, provider_configs, notifications,
     notification_deliveries mapped to Database_Schema
   - Provider approval status enum exact (including `revoked`)
   - Classification tiers exact: standard / restricted / strict

2. **ACL semantics (PRD 05 §5.4, BA §7.1.b)**
   - Collection-level ACL mandatory; document-level optional override
   - Resolution: most-specific-wins; explicit deny beats allow; otherwise
     inherit collection default
   - Bindings: workspace role default, explicit user grant, IdP group grant
     (read-only stub)
   - Every ACL change: audit event in-transaction + permission cache
     invalidation (`perm_cache_version` bump + NOTIFY)

3. **Workspace AI policy & provider registry**
   - Registry global, Platform-Admin-owned; workspaces select from approved
     entries only (BA §7.6.a)
   - Provider declares: region, retention, training policy, capabilities,
     models, streaming, embedding dimensions, auth method, approval status,
     cross-border flag (BRD §4.3)
   - Classification rules: restricted → approved-region + retention none +
     training disallowed; strict → no cross-border + private provider
   - Cross-border opt-in: standard-only + justification + four-eyes co-sign
     (BA §7.6.e)

4. **Audit viewer (read side)**
   - Workspace-scoped audit query endpoints (filter by actor, event type,
     time range; cursor pagination); `audit` remains the sole writer —
     admin only reads
   - Sensitive-collection flag on collections (schema + CRUD); the
     four-eyes approval workflow itself is specified in the hardening slice

5. **NotificationService (class inside `admin`, not a module)**
   - `notify(recipients, category, payload)`; in-app primary, SMTP
     secondary; 5x retry exponential backoff to 30 min; persistent failure →
     admin banner + `notifications.delivery.failed` metric (BA §7.8.c)
   - Platform-level notifications: nullable workspace_id + tenant_id

6. **API endpoints (openapi/admin.yaml + API_Contracts.md §3.5)**
   - Tenant/workspace/user/membership/role/capability CRUD
   - Collection CRUD + ACL editor endpoints
   - AI policy + provider registry endpoints
   - Audit viewer endpoints
   - Java records; ProblemDetails; cursor pagination on lists; role +
     capability requirements per endpoint

7. **Rate limiting (`web`, SAD §7.8 Concern 2)**
   - Spring filter on /api/chat + /api/search: 30 chat req/min,
     200 req/hour per user
   - MVP in-memory counters (single replica); fail-closed 503 + Retry-After
     when counter store unavailable

8. **Test plan**
   - ACL precedence matrix tests (deny-beats-allow, most-specific-wins)
   - Cache invalidation on role/ACL change ≤ 60s
   - Provider validation fail-closed per classification tier
   - Last-admin revocation blocked
   - Notification retry + fallback path
   - Audit viewer scoping (no cross-workspace reads)

Deliverable format: entities → ACL algorithm → registry/policy → endpoints
→ rate limit → tests.
