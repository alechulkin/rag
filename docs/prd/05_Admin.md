# PRD — Admin, RBAC & Workspace Management (MVP)

**Status:** Draft v1.0
**Owner:** Product + Platform
**Source:** [docs/BRD.md §2, §3.6, §5.1](../BRD.md) · [docs/BA_Analysis.md §1, §7.1, §7.2, §7.6](../BA_Analysis.md)

---

## 1. Objective

Provide ADMINs with the tools to onboard tenants, workspaces, users, collections, and AI providers; assign roles and ACLs; and configure workspace-level policy — all subject to the platform's hard requirements on permission-aware retrieval and fail-closed provider validation.

## 2. In-Scope (MVP)

- Tenant + workspace creation by ADMIN with `platform:admin` capability.
- User membership and role assignment within a workspace.
- Capability flags: `platform:admin`, `audit:read`, `cross_border_opt_in`.
- Collection CRUD + ACL bindings.
- Document-level ACL overrides.
- Workspace AI policy editor.
- Global provider registry (Platform Admin).
- Classification level per workspace: `standard` / `restricted` / `strict`.
- Soft-delete + restore for documents (within 7-day window).

## 3. Out-of-Scope (MVP)

- Self-service tenant or workspace creation by end users.
- SCIM 2.0 provisioning (roadmap).
- Group-to-role synchronization (read-only stub only in MVP).
- Cross-tenant user accounts.
- Field-level redaction.

## 4. Personas & Permissions

- **ADMIN (with `platform:admin`)**: tenant + workspace creation, provider registry management, cross-tenant audit.
- **ADMIN (workspace-scoped)**: workspace settings, user/role assignment, collections, ACLs, AI policy, soft-delete restore.
- **CONTRIBUTOR**: see §01–§04 PRDs.
- **USER / VIEWER**: no admin actions.

## 5. Functional Requirements

### 5.1 Tenant & Workspace
- Create tenant (Platform Admin only). Inputs: name, residency region, default classification level, IdP binding(s).
- Create workspace within tenant. Inputs: name, default collection, AI policy reference, classification level, cross-border flag (off by default).
- Update / archive workspace. Archive does not delete data; data follows retention rules.

### 5.2 Membership & Roles
- Invite user by email (pre-invitation). JIT provisioning allowed if IdP issuer is bound to tenant AND email domain on allow-list (BA §7.2.a).
- Assign **at most one role per workspace** per user (BA §7.1.c).
- Capabilities are additive flags attached to membership.
- Remove user → membership flagged disabled; subsequent access denied (BA §7.2.c).
- Audit every change.

### 5.3 Collections
- CRUD operations within a workspace.
- Each collection has:
  - Name, description, tags.
  - **Sensitive** flag (controls four-eyes deletion approval).
  - ACL bindings (see 5.4).
  - Default classification inherited from workspace.

### 5.4 ACL Bindings
- Three binding types (BA §7.1.b):
  1. Workspace role default (broad).
  2. Explicit user grant.
  3. IdP group grant (stored; activated post-MVP via SCIM).
- Per-binding: `allow` / `deny`. Most-specific binding wins; explicit deny beats explicit allow; otherwise inherit collection default.
- Per-document ACL override available (allow or deny).
- ACL editor in the admin UI: search users, choose binding type, action, and scope.

### 5.5 Workspace AI Policy
- Choose primary chat provider (+ optional failover).
- Choose primary embedding provider.
- Allowed regions, retention setting, training setting (each declared on the provider registry; the UI shows only compatible providers given workspace classification).
- Toggle cross-border processing (requires four-eyes co-sign by Platform Admin for `restricted+` workspaces — BA §7.6.e).
- Enable/disable prompt/response logging (off by default).
- Set chat-content retention (off by default; if on, default 30 days).

### 5.6 Provider Registry (Platform-scoped)
- Each provider config declares (BRD §4.3, §5.3):
  - Supported operations (chat / embedding / rerank).
  - Model / deployment names.
  - Processing region.
  - Retention behavior (`none` / `transient` / `persistent`).
  - Customer-data training policy (`disallowed` / `allowed`).
  - Logging behavior.
  - Streaming support.
  - Embedding dimensions.
  - Authentication method (managed identity, API key in secret store).
  - Approval status (`approved` / `pending` / `rejected`).
  - Cross-border transfer flag.
- Platform Admin can add / approve / revoke. Revoking a provider deactivates dependent workspace policies until the workspace ADMIN chooses an alternative.

### 5.7 Soft Delete & Restore
- Document soft-delete by CONTRIBUTOR/ADMIN; 7-day window.
- Sensitive collection (5.3) requires four-eyes — initiator + second ADMIN approval before delete proceeds (BA §7.7.d).
- ADMIN restore action within the 7-day window. After the window, hard delete proceeds (PRD §01 §5.4).

### 5.8 Notifications
- In-app + SMTP for:
  - Failed ingestion, failed deletion, provider outage, provider-policy block, reindex failure, evaluation regression.
- Delivery fallback policy in BA §7.8.c.

### 5.9 Audit Log Viewer
- Filterable by tenant (Platform Admin), workspace, user, event type, date.
- Visible to ADMIN (workspace scope) and VIEWER with `audit:read`.
- Read-only. Export via Platform Admin (PRD §06).

## 6. Non-Functional Requirements

- All admin actions audited.
- Permission cache TTL ≤ 60 s and invalidated on membership/ACL changes.
- Admin UI must clearly indicate fail-closed states (e.g., a workspace with an unapproved provider blocks chat).

## 7. Data Model Touchpoints

- `tenants`, `workspaces`, `users`, `memberships`, `capabilities`, `collections`, `access_policies`, `workspace_ai_policies`, `provider_configs`, `audit_events`.

## 8. APIs (illustrative)

- `POST /api/v1/admin/tenants` (platform).
- `POST /api/v1/admin/tenants/{tId}/workspaces`.
- `POST /api/v1/workspaces/{wsId}/members`.
- `PUT /api/v1/workspaces/{wsId}/members/{userId}/role`.
- `POST /api/v1/workspaces/{wsId}/collections`.
- `POST /api/v1/collections/{colId}/access`.
- `PUT /api/v1/workspaces/{wsId}/ai-policy`.
- `POST /api/v1/admin/providers` (platform).
- `POST /api/v1/admin/providers/{pId}:approve`.
- `POST /api/v1/documents/{docId}:approve-delete` (four-eyes).

## 9. Telemetry & Audit

- Audit: every CUD operation in this PRD's scope.
- Metrics: pending invitations, ACL change rate, provider approval queue depth, four-eyes pending count, workspace count by classification.

## 10. Acceptance Criteria

1. Assigning a user a workspace role allows them to use search/chat within seconds (cache invalidation works).
2. Revoking a user denies them on the next request (≤ 60 s).
3. Sensitive-collection delete cannot complete without a second ADMIN approval.
4. Workspace cannot select a provider not on the approved registry.
5. Toggling cross-border processing on a `restricted+` workspace requires four-eyes co-sign and is fully audited.
6. ACL "explicit deny" overrides "explicit allow" for the same user on the same collection.

## 11. Open Items

- Self-service ADMIN registration flow (out of MVP; ticket-based).
- UX for bulk role assignment.
