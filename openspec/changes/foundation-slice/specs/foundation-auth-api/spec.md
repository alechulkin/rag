## ADDED Requirements

<!-- trace: FND-3 FND-4 -->

### Requirement: OIDC JWT validation as OAuth2 Resource Server

The api profile SHALL validate JWT tokens via Spring Security OAuth2 Resource Server. Unauthenticated requests to protected endpoints MUST receive 401. Invalid or expired tokens MUST be rejected.

#### Scenario: Valid JWT grants access

- **WHEN** request includes valid Bearer JWT from configured IdP
- **THEN** Spring Security establishes authenticated principal
- **AND** request proceeds to authorization layer

#### Scenario: Missing JWT returns 401

- **WHEN** request to protected endpoint lacks Authorization header
- **THEN** response status is 401 with RFC 7807 ProblemDetails

### Requirement: JIT provisioning per BA section 7.2.a

JIT user provisioning on first SSO SHALL be allowed only when:

1. JWT issuer matches an entry in `tenants.idp_issuer` for the resolved tenant, AND
2. Email domain (part after `@`) matches an entry in `tenants.jit_email_domains` (canonical column, `docs/Database_Schema.md` §2.1).

Otherwise provisioning MUST be denied. Provisioned user starts with no workspace memberships until ADMIN grants them.

#### Scenario: JIT allowed with matching issuer and domain

- **WHEN** unknown user authenticates with issuer in `tenants.idp_issuer` and email domain in `tenants.jit_email_domains`
- **THEN** user record is created with `status=active` and no workspace memberships

#### Scenario: JIT denied for unbound issuer

- **WHEN** unknown user authenticates with IdP issuer not in any tenant's `idp_issuer`
- **THEN** application returns 403 with ProblemDetails

#### Scenario: JIT denied for domain not on allow-list

- **WHEN** unknown user authenticates with valid issuer but email domain not in `tenants.jit_email_domains`
- **THEN** application returns 403 with ProblemDetails

### Requirement: Disabled user denial

Users with `status=disabled` MUST be denied on all subsequent requests even when JWT is still valid within TTL.

#### Scenario: Disabled user blocked

- **WHEN** disabled user sends request with otherwise valid JWT
- **THEN** response status is 403 with ProblemDetails

### Requirement: Role model with capability flags

Authorization SHALL support workspace roles ADMIN, CONTRIBUTOR, USER, VIEWER plus additive capability flags on memberships (e.g., `platform:admin`, `audit:read`). Fail-closed defaults apply when permission resolution is ambiguous.

#### Scenario: Ambiguous permission resolves to deny

- **WHEN** permission resolution encounters ambiguity
- **THEN** access is denied (fail-closed)

### Requirement: GET workspaces endpoint

The api SHALL expose `GET /api/v1/workspaces` with cursor pagination per `openapi/admin.yaml`. Response MUST include `items` array and optional `nextCursor`. Every response MUST include `X-Request-Id` header.

#### Scenario: Authenticated user lists workspaces

- **WHEN** authenticated user calls GET /api/v1/workspaces
- **THEN** response is 200 with workspace items visible to caller
- **AND** X-Request-Id header is present

#### Scenario: Cursor pagination returns nextCursor

- **WHEN** more workspaces exist than requested limit
- **THEN** response includes nextCursor for subsequent page

### Requirement: Bootstrap endpoints with OpenAPI contract

Foundation slice SHALL expose bootstrap endpoints per PRD Admin §8 (foundation subset). All endpoints MUST be defined in `openapi/admin.yaml` before implementation merges. Request/response bodies MUST use Java records. Errors MUST use RFC 7807 ProblemDetails with exact HTTP status codes. Retry-sensitive writes MUST accept `Idempotency-Key` header per API_Contracts.md.

| Method | Path | Authorization | Idempotency-Key | Purpose |
|--------|------|---------------|-----------------|---------|
| `POST` | `/api/v1/admin/tenants` | `platform:admin` capability | Required | Create tenant with `idp_issuer` + `jit_email_domains` |
| `POST` | `/api/v1/admin/tenants/{tenantId}/workspaces` | `platform:admin` capability | Required | Create workspace under tenant, atomically provisions its canary chain |
| `POST` | `/api/v1/workspaces/{workspaceId}/members` | Workspace role `admin` | Required | Invite/add member by email |
| `PUT` | `/api/v1/workspaces/{workspaceId}/members/{userId}/role` | Workspace role `admin` | Required | Assign workspace role |

Foundation slice MUST NOT expose full admin CRUD (collections ACL, AI policy, provider registry) — those belong to admin slice (prompt 04).

#### Scenario: Platform admin creates tenant

- **WHEN** caller with `platform:admin` capability POSTs to `/api/v1/admin/tenants` with valid body and Idempotency-Key
- **THEN** response is 201 with tenant record including `idp_issuer` and `jit_email_domains`
- **AND** duplicate request with same Idempotency-Key returns same result without duplicate tenant

#### Scenario: Workspace creation atomically provisions its canary chain

- **WHEN** caller with `platform:admin` capability POSTs to `/api/v1/admin/tenants/{tenantId}/workspaces` with valid body
- **THEN** the workspace row, its canary collection, canary document/version/profile/chunk/embedding, and its persisted `access_policies` deny rows are all committed in the same database transaction
- **AND** if any part of canary provisioning fails, the entire workspace creation rolls back — no workspace can exist without its canary chain

#### Scenario: Workspace admin assigns role

- **WHEN** caller with workspace role `admin` PUTs to `/api/v1/workspaces/{workspaceId}/members/{userId}/role` with valid role
- **THEN** response is 200 with updated membership
- **AND** `perm_cache_version` increments triggering cache invalidation

#### Scenario: Unauthorized bootstrap denied

- **WHEN** caller without required capability or role invokes bootstrap endpoint
- **THEN** response is 403 with ProblemDetails

#### Scenario: Bootstrap endpoints documented in OpenAPI

- **WHEN** `openapi/admin.yaml` is parsed
- **THEN** all four bootstrap paths exist with request/response schemas, security requirements, and Idempotency-Key parameter on write operations

### Requirement: Bootstrap CUD operations are audited in-transaction

Per PRD Admin §9 ("Audit: every CUD operation in this PRD's scope"), every bootstrap create/update/delete operation MUST call `audit.record()` in the same database transaction as the mutation it records, per ADR-005/ADR-015. This applies to tenant creation, workspace creation (including its canary provisioning), member creation, and role changes.

#### Scenario: Tenant creation is audited

- **WHEN** `POST /api/v1/admin/tenants` succeeds
- **THEN** a `tenant.created` audit event is committed in the same transaction as the tenant row

#### Scenario: Workspace creation audits both the workspace and its canary provisioning

- **WHEN** `POST /api/v1/admin/tenants/{tenantId}/workspaces` succeeds
- **THEN** a `workspace.created` audit event is committed in the same transaction as the workspace and canary rows

#### Scenario: Audit failure rolls back the mutation

- **WHEN** `audit.record()` throws during a bootstrap CUD operation
- **THEN** the entire transaction (mutation + audit) rolls back and the caller receives an error response
