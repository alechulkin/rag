# .claude/rules

Module-scoped architecture rules for Claude Code and compatible agents.
Each file has `paths:` frontmatter and applies only to matching module code.

## Precedence

1. **`docs/` + `openapi/`** — canonical source of truth. On any conflict, docs win.
2. **`.claude/rules/`** — architecture invariants scoped per module (this folder).
3. **`.cursor/rules/`** — language/style conventions (Java, React, TypeScript, Python, common).

`AGENTS.md` (repo root) is the cross-tool entry point and links to all three.

## Tool applicability

- These files apply in Claude Code / agents that read `.claude/rules/` `paths:` frontmatter.
- Cursor's own engine reads `.cursor/rules/*.mdc` (`globs:` / `alwaysApply:`) — it does not auto-attach these. Mirror a rule there if Cursor must enforce it.

## Files

| Rule | Scope |
|---|---|
| `policy-module.md` | `policy` (access + provider-gate + budget) |
| `search-module.md` | `search` (sole pgvector/FTS path) |
| `ai-provider-module.md` | `ai.provider` (SDK isolation) |
| `audit-module.md` | `audit` (append-only, single writer) |
| `documents-module.md` | `documents` (mgmt/pipeline/connector wall) |
| `rag-chat-evaluation-modules.md` | `rag`, `chat`, `evaluation` |
| `admin-module.md` | `admin` (RBAC data, notification, retention) |
| `web-module.md` | `web` (controllers, ProblemDetails, rate limit) |
| `worker-runtime-module.md` | `worker.runtime` (queue lease semantics) |
