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

## Verification

No build files exist yet. Once implementation starts, the build tool
config in the repository is authoritative (Gradle expected per
Module_Boundaries). Until then, doc changes are verified by:

- OpenAPI parses (`openapi/*.yaml`)
- Cross-doc consistency grep (table names, ADR references, stale terms)
- Mermaid diagrams render

Never claim successful verification without running the stated checks.
