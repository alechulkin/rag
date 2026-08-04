# AGENTS.md

## Project Overview

AI Knowledge Assistant for FinTech Engineering Teams — a multi-tenant,
permission-aware RAG platform: ingest technical/operational/compliance
documents, answer questions with grounded, cited responses.

Internal decision-support tool only. It does not make financial, credit,
AML/KYC, employment, or compliance decisions.

**Repository state:** documentation-first. No implementation code yet.
Specs and contracts in `docs/` and `openapi/` are the deliverable; treat
them as the source for any generated code.

## Sources of Truth (precedence on conflict)

1. `docs/BRD.md` — business scope and hard requirements
2. `docs/NFR.md` — measurable quality and cost constraints
3. `docs/adr/` — accepted architecture decisions (ADR-001..018)
4. `docs/Solution_Architecture.md` — runtime topology, sequences, cross-cutting concerns
5. `docs/Module_Boundaries.md` + `docs/Shared_Abstractions.md` — module map and shared contracts
6. `docs/Database_Schema.md` — canonical data model (DDL-level)
7. `docs/API_Contracts.md` + `openapi/*.yaml` — HTTP/SSE contract surface
8. `docs/Communication_Patterns.md` — sync/async interaction rules
9. `docs/prd/*.md` — feature requirements
10. `docs/Design_System.md` — frontend UI/UX conventions and MVP component/tokens contract (style-layer; subordinate to requirement docs above)
11. `docs/Architecture_Options.md` — historical analysis only, not authority

When documents conflict, report the conflict. Do not silently choose one.
When this file conflicts with `docs/`, `docs/` wins — report the drift.

## Skills (migrated sections — resolve before acting)

The following AGENTS.md sections moved to skills in `.agents/skills/`.
Load the matching skill before working in its area; each active skill
prints 🤖 in the response.

| Topic (former section) | Skill | Load when |
|---|---|---|
| Technology Stack (MVP, per ADRs) | `rag-tech-stack` | choosing libraries/infra, build or deployment config, MVP-exclusion questions |
| Module Map + Non-Negotiable Invariants | `rag-architecture` | writing/reviewing backend code, module/package placement, search, policy, audit, AI provider, tenant data |
| API Conventions | `rag-api-conventions` | endpoint or `openapi/*.yaml` changes, error/pagination/idempotency design |
| Verification + Workflow for Non-Trivial Changes | `rag-change-workflow` | changes touching security, schema, RAG behavior, architecture, or >3 files; verifying doc/OpenAPI changes |

## Rule Layers (precedence)

Three layers, most authoritative first:

1. `docs/` + `openapi/` — canonical source of truth. On any conflict, docs win.
2. `.claude/rules/` — architecture invariants scoped per module (`paths:` frontmatter). See `.claude/rules/README.md` for the file index.
3. `.cursor/rules/` — language/style conventions, authoritative for style only:
   - `.cursor/rules/java/` — coding style, patterns, security, testing
   - `.cursor/rules/react/` + `.cursor/rules/typescript/` — frontend
   - `.cursor/rules/python/` — tooling scripts
   - `.cursor/rules/common/` — cross-cutting workflow, review, security

Do not restate rules from these layers here or in code comments.
Tool note: Cursor auto-attaches `.cursor/rules/*.mdc`; `.claude/rules/` applies in Claude Code and compatible agents; `.agents/skills/` loads on demand via the Skills table above.

## Protected Rules

- Never expose data across tenants or workspaces.
- Never bypass pre-retrieval permission filtering.
- Never bypass AI-provider residency/policy validation.
- Never place secrets in source, logs, prompts, or test fixtures.
- Never alter BRD/NFR requirements as part of an implementation task.
- Never introduce MVP-excluded infrastructure without an accepted ADR.
- Never claim successful verification without running the stated checks.

## Domain Terminology

Glossary: see `docs/BA_Analysis.md` + `docs/Database_Schema.md`. Key terms:
chunk, embedding profile, AllowedFilterSet, fail-closed, hybrid search (RRF),
golden question, four-eyes approval, soft delete (7-day grace), classification
tiers (`standard`/`restricted`/`strict`).
