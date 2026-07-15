# AI Knowledge Assistant Architecture Docs

Documentation-first repository for MVP architecture, requirements, and API contracts.

## Source-of-Truth Precedence
When documents conflict, use this order:
1. `docs/BRD.md`
2. `docs/NFR.md`
3. `docs/adr/` (accepted ADRs)
4. `docs/Solution_Architecture.md`
5. `docs/Module_Boundaries.md` and `docs/Shared_Abstractions.md`
6. `docs/Database_Schema.md`
7. `docs/prd/*.md`
8. `docs/Architecture_Options.md` (historical analysis)

## Key Paths
- Business scope: `docs/BRD.md`
- Non-functional targets: `docs/NFR.md`
- Architecture baseline: `docs/Solution_Architecture.md`
- Module ownership: `docs/Module_Boundaries.md`
- Shared contracts: `docs/Shared_Abstractions.md`
- Data model: `docs/Database_Schema.md`
- Feature PRDs: `docs/prd/`
- Architecture decisions: `docs/adr/`
- API specs: `openapi/`

## MVP Defaults
- Runtime: modular Spring Boot monolith with separate `api` and `worker` profiles.
- Frontend: React + TypeScript SPA.
- Storage/search: PostgreSQL 16 + pgvector + PostgreSQL FTS.
- Chat transport: REST + SSE.
- Auth: OIDC/OAuth2 resource-server model.
- Queueing: database-backed queues with lease/retry semantics.
