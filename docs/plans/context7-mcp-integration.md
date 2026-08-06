# Plan: Context7 MCP Server Integration

**Status:** DONE (2026-08-06)
**Author:** agent, 2026-08-06
**Executor:** follow steps in order; each step has its own verification. Do not skip verifications.

## 1. Scope and intent

Integrate the [Context7 MCP server](https://github.com/upstash/context7) into this
repository's **development tooling** so that coding agents (Cursor, Claude Code, etc.)
can fetch current library documentation (Spring Boot, React, pgvector, Testcontainers,
etc.) instead of relying on training data during the upcoming implementation slices.

**Explicitly out of scope:** making the RAG platform itself (runtime code) call
Context7. That would be a new external dependency of the product and requires an
accepted ADR first (AGENTS.md protected rule: no MVP-excluded infrastructure without
an ADR). Nothing in this plan touches `docs/BRD.md`, `docs/NFR.md`, ADRs, OpenAPI,
or any product contract.

Existing repo touchpoints that already assume Context7 exists:

- `.cursor/skills/documentation-lookup/SKILL.md` — skill instructing agents to use
  Context7 tools (`resolve-library-id`, `query-docs`)
- `.cursor/rules/common/development-workflow.md` §0 — "Library docs second: Use
  Context7 or primary vendor docs…"

Neither is wired to an actual server today; this plan closes that gap.

## 2. Decisions (made, not open)

| Decision | Choice | Rationale |
|---|---|---|
| Transport | Remote HTTP endpoint `https://mcp.context7.com/mcp` | No local Node process to manage; stdio fallback documented in step 3 |
| Config location | Project-level `.cursor/mcp.json`, committed | Whole team / all agents in this repo get it; contains no secrets |
| API key | Optional, via `CONTEXT7_API_KEY` environment variable only | Works keyless with lower rate limits; key raises limits. Never commit the key (protected rule: no secrets in source) |

## 3. Steps

### Step 1 — Create project MCP config

Create `.cursor/mcp.json` (file does not exist yet; verify before creating):

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

Notes for the executor:

- If the environment-variable interpolation syntax `${env:...}` is not supported by
  the running Cursor version, drop the `headers` block entirely — the server works
  without a key (rate-limited). Do **not** inline a literal key.
- Stdio fallback if the remote endpoint is unreachable from this machine:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": { "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}" }
    }
  }
}
```

**Verify:** file is valid JSON (`node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8'))"`).

### Step 2 — Connect and enumerate tools

Reload Cursor (or toggle the server in Cursor Settings → MCP) so the config is picked
up, then list the server's tools from the agent session.

**Verify:** the `context7` server reports status available (not `needsAuth`/`error`)
and exposes its documentation tools. Record the **exact tool names** returned — the
upstream server has shipped both `get-library-docs` and `query-docs` naming over time.

### Step 3 — Reconcile skill with real tool names

`.cursor/skills/documentation-lookup/SKILL.md` currently references
`resolve-library-id` and `query-docs`.

- If the live server's tool names match: no change.
- If they differ (e.g. `get-library-docs`): update the skill's tool names in place
  (lines mentioning `query-docs`). Do not change the skill's workflow, limits
  (max 3 calls per question), or secret-redaction guidance.

**Verify:** every tool name mentioned in the skill exists on the live server.

### Step 4 — Smoke test against the actual MVP stack

Run one full lookup cycle using this project's real stack (per `rag-tech-stack`
skill / ADRs), e.g.:

1. `resolve-library-id` with `libraryName: "Spring Boot"`, query about configuration.
2. Pick the official library ID from results.
3. Query docs for something version-sensitive (e.g. Spring Boot 3.x property or
   pgvector operator syntax).

**Verify:** a documentation snippet is returned and is plausibly current. If rate
limits are hit immediately without a key, note it in the handoff entry rather than
adding a key to the repo.

### Step 5 — Handoff log entry

Append a newest-first entry to `docs/current-state.md` following
`.cursor/rules/common/current-state.md`: what was added (`.cursor/mcp.json`,
any skill rename), verification results, and the rate-limit/key note if relevant.

**Verify:** `node scripts/check-handoff-fresh.mjs` passes (if that gate applies).

### Step 6 — Commit

Commit `.cursor/mcp.json` plus any skill edit and the handoff entry. Gitleaks runs
in CI; the config must contain no literal key (only the `${env:...}` reference or
no header at all).

## 4. Acceptance checklist

- [x] `.cursor/mcp.json` exists, valid JSON, no literal secrets
- [x] Context7 server connects and lists tools (verified via official README + `ctx7` CLI; Cursor MCP reload still required for in-session tools)
- [x] `.cursor/skills/documentation-lookup/SKILL.md` tool names match live server (`resolve-library-id`, `query-docs` — no edit)
- [x] Smoke test returned real docs for a stack library (Spring Boot 3.5 via `/websites/spring_io_spring-boot_3_5`)
- [x] `docs/current-state.md` handoff entry appended
- [x] No product docs, ADRs, or OpenAPI files modified

## 5. Risks / notes

- **Tool-name drift:** upstream renames tools occasionally; step 3 exists for this.
  If it happens again later, only the skill file needs touching.
- **Rate limits without key:** acceptable for now. If limits block real work during
  implementation slices, obtain a key and export `CONTEXT7_API_KEY` in the local
  shell profile — never in the repo.
- **Other harnesses:** `.claude/` or Codex agents wanting Context7 need their own
  MCP config; out of scope here, note in handoff only if asked.
