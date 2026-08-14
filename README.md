# AI Knowledge Assistant Architecture Docs

Documentation-first repository for MVP architecture, requirements, and API contracts.

## Source-of-Truth Precedence

Canonical order is in `AGENTS.md`. Summary:

1. `docs/BRD.md`
2. `docs/NFR.md`
3. `docs/adr/` (ADR-001..019)
4. `docs/Solution_Architecture.md`
5. `docs/Module_Boundaries.md` + `docs/Shared_Abstractions.md`
6. `docs/Database_Schema.md`
7. `docs/API_Contracts.md` + `openapi/*.yaml`
8. `docs/Communication_Patterns.md`
9. `docs/prd/*.md`
10. `docs/Design_System.md`
11. `docs/Architecture_Options.md` (historical only)

On conflict, report — do not silently choose. `docs/` wins over this README.

## Trusted loop (docs phase)

See `docs/qa/verification-manifest.json`, `docs/checklists/quality-gates.md`,
and the slice implementation runbook `docs/qa/slice-implementation-runbook.md`.

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs
```

## Key Paths

- Business scope: `docs/BRD.md`
- Non-functional targets: `docs/NFR.md`
- Delivery plan: `docs/mvp-capability-plan.md`
- Architecture baseline: `docs/Solution_Architecture.md`
- Module ownership: `docs/Module_Boundaries.md`
- Shared contracts: `docs/Shared_Abstractions.md`
- Data model: `docs/Database_Schema.md`
- Feature PRDs: `docs/prd/`
- Architecture decisions: `docs/adr/`
- API specs: `openapi/`
- OpenSpec changes: `openspec/changes/`

## MVP Defaults

- Runtime: modular Spring Boot monolith with separate `api` and `worker` profiles.
- Frontend: React + TypeScript SPA.
- Storage/search: PostgreSQL 16 + pgvector + PostgreSQL FTS.
- Chat transport: REST + SSE.
- Auth: OIDC/OAuth2 resource-server model.
- Queueing: database-backed queues with lease/retry semantics.
