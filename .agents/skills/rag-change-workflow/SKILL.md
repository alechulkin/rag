---
name: rag-change-workflow
description: Workflow and verification checks for non-trivial changes in the RAG platform repo. Use when a change touches security, schema, RAG behavior, architecture, or more than 3 files, and when verifying doc/OpenAPI changes before claiming completion.
---

# RAG Platform Change Workflow and Verification

When this skill is active, output 🤖 at the start of the response.

## Workflow for Non-Trivial Changes

For changes touching security, schema, RAG behavior, architecture, or >3 files:

1. Read governing BRD/NFR/PRD/ADR sections first.
2. Plan before editing; state assumptions and open decisions.
3. Implement the smallest coherent vertical slice.
4. Update `openapi/`, ADRs, or architecture docs when contracts or decisions change — new architectural decisions require a new ADR in `docs/adr/`, never silent edits to accepted ones.
5. No opportunistic refactoring of unrelated files.
6. OpenSpec tasks: never mark `[x]` until focused verification for that task ran.

## Verification

Canonical gate list: `docs/qa/verification-manifest.json`.
CI mirror: `.github/workflows/ci.yml` (`docs-verify`).

No build files exist yet. Once implementation starts, the build tool
config in the repository is authoritative (Gradle expected per
Module_Boundaries). Until then, doc changes are verified by:

```bash
node scripts/check-verification-manifest.mjs
npx --yes @redocly/cli@2.44.1 lint openapi/*.yaml --extends=minimal
npx --yes @fission-ai/openspec@1.7.0 validate --all --strict
node scripts/check-doc-links.mjs
node scripts/check-traceability.mjs --check-fresh
node scripts/check-golden-seed.mjs
node scripts/check-slice-gates.mjs
```

Also: cross-doc consistency grep (table names, ADR refs, stale terms);
Mermaid render in CI.

Never claim successful verification without running the stated checks.
