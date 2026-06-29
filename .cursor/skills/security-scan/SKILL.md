---

name: security-scan
description: Scan your Cursor configuration (.cursor/ directory and related Cursor agent files) for security vulnerabilities, misconfigurations, prompt-injection risks, MCP risks, unsafe hooks, and secret exposure using AgentShield.
metadata:
origin: ECC
target: cursor
--------------

# Security Scan Skill

Audit your Cursor agent configuration for security issues using [AgentShield](https://github.com/affaan-m/agentshield).

This skill is focused on Cursor project-level configuration, especially `.cursor/` assets used by Cursor Agent, rules, hooks, MCP servers, agents, skills, and commands.

## When to Activate

* Setting up a new Cursor project
* After modifying `.cursor/rules/`, `.cursor/mcp.json`, `.cursor/hooks.json`, `.cursor/hooks/`, `.cursor/agents/`, `.cursor/skills/`, or `.cursor/commands/`
* After adding or changing MCP servers
* After installing ECC assets into Cursor
* Before committing Cursor agent configuration changes
* When onboarding to a repository with existing Cursor configs
* Before enabling powerful tools, shell access, or project automation
* Periodic security hygiene checks

## What It Scans

| File / Directory        | Checks                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.cursor/rules/*.mdc`   | Prompt injection patterns, unsafe auto-run instructions, secret exposure, overbroad behavioral rules       |
| `.cursorrules`          | Legacy Cursor rules, prompt injection surface, hardcoded secrets, unsafe instruction hierarchy             |
| `.cursor/mcp.json`      | Risky MCP servers, hardcoded environment secrets, `npx -y` supply-chain risks, shell-running servers       |
| `~/.cursor/mcp.json`    | Global MCP servers that may affect multiple projects; scan explicitly when relevant                        |
| `.cursor/hooks.json`    | Dangerous hook registration, overly broad hook triggers, unsafe command execution paths                    |
| `.cursor/hooks/`        | Command injection, interpolation risks, data exfiltration, silent error suppression                        |
| `.cursor/agents/*.md`   | Overbroad tool access, missing scope boundaries, prompt injection surface, unclear model/tool expectations |
| `.cursor/skills/`       | Unsafe scripts, executable helper files, hidden instructions, tool escalation risks                        |
| `.cursor/commands/`     | Dangerous command templates, unsafe shell usage, unvalidated arguments                                     |
| `.cursorignore`         | Missing exclusions for secrets, private keys, build artifacts, local credentials, generated files          |
| `.cursorindexingignore` | Sensitive files accidentally indexed into Cursor context                                                   |
| `AGENTS.md`             | Repository-level or nested agent instructions that may override or pollute Cursor context                  |

## Prerequisites

AgentShield must be installed or available through `npx`.

```bash
# Check if installed
npx ecc-agentshield --version

# Install globally
npm install -g ecc-agentshield

# Or run directly via npx
npx ecc-agentshield scan --path .cursor
```

## Usage

### Basic Scan

Run against the current project's Cursor configuration:

```bash
# Scan Cursor project config
npx ecc-agentshield scan --path .cursor

# Scan the whole repository for Cursor-related files
npx ecc-agentshield scan --path .

# Scan global Cursor MCP config, if used
npx ecc-agentshield scan --path ~/.cursor

# Scan with minimum severity filter
npx ecc-agentshield scan --path .cursor --min-severity medium
```

Use `--path .` when the repository may contain relevant files outside `.cursor/`, such as `.cursorrules`, `AGENTS.md`, `.cursorignore`, `.cursorindexingignore`, `.vscode/settings.json`, or project-specific scripts referenced by hooks.

## Output Formats

```bash
# Terminal output
npx ecc-agentshield scan --path .cursor

# JSON for CI/CD integration
npx ecc-agentshield scan --path .cursor --format json

# Markdown for PR comments or documentation
npx ecc-agentshield scan --path .cursor --format markdown

# HTML report
npx ecc-agentshield scan --path .cursor --format html --output security-report.html

# SARIF for code scanning integrations
npx ecc-agentshield scan --path .cursor --format sarif --output agentshield-results.sarif
```

## Auto-Fix

Apply safe automatic fixes only:

```bash
npx ecc-agentshield scan --path .cursor --fix
```

This may:

* Replace hardcoded secrets with environment variable references
* Tighten wildcard permissions where the fix is safely inferable
* Preserve manual-only findings for human review
* Avoid rewriting risky logic when intent is ambiguous

Review all changes before committing.

## Deep Analysis

Run deeper adversarial analysis:

```bash
# Requires ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=your-key

npx ecc-agentshield scan --path .cursor --opus --stream
```

For a broader security pass:

```bash
npx ecc-agentshield scan --path .cursor --deep
```

Deep analysis may include:

1. **Attacker / Red Team** — identifies exploitable prompt-injection, tool-abuse, hook, and MCP attack paths
2. **Defender / Blue Team** — evaluates existing guardrails and recommends hardening
3. **Auditor** — produces a prioritized risk assessment

## Initialize Cursor-Safe ECC Config

For Cursor projects, prefer ECC’s Cursor target installer rather than `agentshield init`, because `agentshield init` is primarily documented for Claude Code `.claude/` scaffolding.

```bash
# macOS/Linux
./install.sh --target cursor typescript

# Windows PowerShell
.\install.ps1 --target cursor typescript
```

Depending on selected profiles and languages, this can install Cursor-compatible:

* `.cursor/rules/`
* `.cursor/hooks.json`
* `.cursor/hooks/`
* `.cursor/agents/`
* `.cursor/skills/`
* `.cursor/commands/`
* `.cursor/mcp.json`

After installation, scan the generated configuration:

```bash
npx ecc-agentshield scan --path .cursor
```

## GitHub Action

Add AgentShield to CI:

```yaml
- name: AgentShield Security Scan
  uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
    format: 'sarif'
    sarif-output: 'agentshield-results.sarif'
```

Use `path: '.'` instead of `path: '.cursor'` when you want CI to catch `.cursorrules`, `AGENTS.md`, `.cursorignore`, `.cursorindexingignore`, scripts referenced by hooks, or other repository-level agent surfaces.

## Severity Levels

| Grade |  Score | Meaning                  |
| ----- | -----: | ------------------------ |
| A     | 90-100 | Secure configuration     |
| B     |  75-89 | Minor issues             |
| C     |  60-74 | Needs attention          |
| D     |  40-59 | Significant risks        |
| F     |   0-39 | Critical vulnerabilities |

## Interpreting Results

### Critical Findings

Fix immediately:

* Hardcoded API keys, tokens, cloud credentials, SSH keys, or private keys
* MCP servers that execute arbitrary shell commands
* Hooks that execute untrusted input
* Prompt instructions that force the agent to ignore safety rules
* Commands that allow unvalidated shell interpolation
* Rules that instruct Cursor to auto-run destructive commands
* Sensitive files not excluded from Cursor context or indexing

### High Findings

Fix before production or team rollout:

* Overbroad MCP access without clear project scope
* `npx -y` MCP servers without pinned versions
* Hooks that send repository data to external services
* Agents with unnecessary shell, filesystem, network, or MCP access
* Missing deny rules for dangerous files such as `.env`, `.pem`, `.key`, credentials, and local secrets
* Ambiguous rules that allow the agent to override security boundaries

### Medium Findings

Recommended hardening:

* Silent error suppression in hooks, such as `2>/dev/null` or `|| true`
* Missing hook logging for security-sensitive actions
* Rules without clear scope, `globs`, or activation boundaries
* Commands without argument validation
* MCP server descriptions missing trust or data-access expectations
* Missing `.cursorignore` or `.cursorindexingignore` coverage for generated or sensitive files

### Info Findings

Awareness items:

* Good prohibitive instructions detected
* Well-scoped rules
* MCP servers with clear descriptions and limited permissions
* Hooks that fail closed
* Explicit data-isolation notes
* Project-specific agent definitions with clear scope boundaries

## Recommended Cursor Hardening Checklist

Before marking the scan clean, verify:

* `.env`, `.env.*`, `*.pem`, `*.key`, private credentials, and local secrets are ignored
* MCP servers are pinned, reviewed, and limited to required tools
* No MCP server receives unnecessary tokens through committed config
* Hooks validate all interpolated input
* Hooks fail closed for security-sensitive operations
* Agents and skills do not request broad shell access unless justified
* Cursor rules are scoped with `globs` where possible
* No rule instructs Cursor to ignore security warnings or bypass review
* Dangerous commands require explicit user approval
* Generated files, build output, and dependency directories are excluded from indexing where appropriate

## Links

* **AgentShield GitHub**: https://github.com/affaan-m/agentshield
* **AgentShield npm**: https://www.npmjs.com/package/ecc-agentshield
* **Cursor Docs**: https://cursor.com/docs
* **Cursor Rules**: https://cursor.com/docs/rules
* **Cursor MCP**: https://cursor.com/docs/mcp
* **Cursor Hooks**: https://cursor.com/docs/hooks
* **Cursor Skills**: https://cursor.com/docs/skills
