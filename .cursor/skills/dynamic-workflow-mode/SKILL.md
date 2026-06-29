---

name: dynamic-workflow-mode
description: "Design task-local harnesses, eval gates, handoff artifacts, and reusable skill extraction for Cursor Agent and other adaptive coding-agent workflows."
metadata:
origin: ECC
target: cursor
--------------

# Dynamic Workflow Mode

Use this skill when Cursor Agent can generate or adapt a task-local workflow instead of only following a static command sequence.

The goal is to make adaptive agent work disciplined:

```text
temporary harnesses for one-off work
shared skills for repeated work
eval gates for quality control
handoff artifacts for continuity
human approval gates for risky actions
```

This skill is especially useful when a normal “edit files → run tests” loop is not enough.

## When To Activate

Use this skill when:

* The user mentions dynamic workflows, custom harnesses, task-local harnesses, adaptive workflows, or agent-generated workflows
* A task needs a custom loop, evaluator, crawler, fixture generator, watcher, or local dashboard
* A Cursor subagent needs a repeatable process that is not yet captured as a shared skill
* Multiple agents need to follow the same workflow
* A task needs durable handoff artifacts, eval evidence, or operator approval before merge
* A workflow is likely to be reused across sessions, repositories, or teammates

Do not activate this skill for simple edits, one-file changes, or straightforward explanations.

## Core Contract

A dynamic workflow should create a task-local harness only when the harness is cheaper, safer, and more repeatable than manually driving the same steps.

Every harness must define:

* **Objective**: what the harness owns and what it explicitly does not own
* **Inputs**: files, URLs, prompts, data sources, credentials policy, and user constraints
* **Outputs**: reports, commits, screenshots, status files, generated fixtures, or handoff notes
* **Eval**: at least one pass/fail check tied to the task outcome
* **Handoff**: a short artifact explaining what happened, what is blocked, and how to resume

A harness that only proves “the script ran” is not enough.

## Dynamic Harness Decision Tree

1. **One-shot task**

   * Keep it inline.
   * Do not invent a harness.

2. **Repeated task with changing inputs**

   * Create a task-local harness.
   * Keep it under a temporary or project-local working area.

3. **Repeated task across sessions, teammates, or repositories**

   * Extract the pattern into a shared skill.

4. **Task with external state, queueing, or approvals**

   * Add visible status checkpoints before adding more automation.

5. **Task with safety risk**

   * Add an eval gate and a human approval gate before autonomous execution.

6. **Task with multiple Cursor agents or subagents**

   * Define ownership, working area, conflict policy, and merge gate before running agents in parallel.

## Task-Local Harness Template

Use this structure before writing harness code:

```markdown
# Dynamic Workflow Harness

Objective:
- Ship:
- Do not ship:

Inputs:
- Repo or workspace:
- Files/directories:
- External systems:
- Credentials policy:
- User constraints:

Loop:
1. Discover current state.
2. Generate or update the smallest useful artifact.
3. Run eval checks.
4. Record status and evidence.
5. Stop on failed gate, unclear ownership, or unsafe external action.

Eval:
- Command:
- Expected pass signal:
- Failure owner:
- Evidence location:

Handoff:
- Status:
- What changed:
- Evidence:
- Known risks:
- Next action:
```

## Recommended Project Layout

For one-off task-local harnesses:

```text
.tmp/
  harnesses/
    <task-name>/
      README.md
      run.sh
      status.md
      results/
```

Or:

```text
.tools/
  harnesses/
    <task-name>/
      README.md
      run.ts
      status.md
      results/
```

Use `.tmp/` for disposable local work.

Use `.tools/` only when the harness may become reusable.

Do not hide important decision logic inside untracked scripts if teammates need to understand or rerun the workflow.

## Cursor Agent Usage

When using Cursor Agent with this skill:

* Keep the main agent responsible for orchestration
* Use subagents for focused analysis, not uncontrolled parallel edits
* Prefer isolated branches or worktrees for independent implementation attempts
* Record what each agent owns
* Synthesize results before changing production code
* Run eval gates before claiming success

Good parallel use:

```text
Agent 1: security review
Agent 2: test gap analysis
Agent 3: performance review
Main agent: synthesis and final implementation plan
```

Bad parallel use:

```text
Agent 1 edits UserService
Agent 2 edits UserService
Agent 3 refactors UserService tests
All run in the same working tree
```

## Shared Skill Extraction

Promote a task-local harness into a shared skill only when at least two of these are true:

* The same workflow appears in multiple sessions, repositories, teams, or launches
* The workflow needs specific language, tool, or safety sequencing
* Failures repeat because operators skip a gate or lose context
* The workflow has a stable input/output contract
* The workflow benefits from a status board, handoff artifact, or team-visible checkpoint
* The harness already has a reliable eval that another teammate can rerun

When extracting, write the skill first:

```text
.cursor/skills/<name>/SKILL.md
```

Add command shims only if the project still needs a command-style entry point.

## Status Checkpoints

Dynamic workflows become team-usable when they expose state.

Record these checkpoints whenever the task spans more than one session:

### Plan

Record:

```text
objective
owner
acceptance criteria
risky external systems
files likely to change
```

### Queue

Record:

```text
work items
assigned agent role
branch or worktree
dependency edges
conflict risks
```

### Run

Record:

```text
active harness
current loop step
latest eval result
generated artifacts
known failures
```

### Gate

Record:

```text
test results
browser screenshots if UI-related
security review
lint/typecheck/build status
merge readiness
```

### Handoff

Record:

```text
what is done
what failed
what needs human decision
how to resume
```

If the repository has an ECC control pane or state-store-backed scripts, prefer those.

Otherwise, use a tracked or clearly named local artifact such as:

```text
.tmp/harnesses/<task-name>/status.md
.tools/harnesses/<task-name>/status.md
docs/handoffs/<task-name>.md
```

## Eval Gates

Every dynamic harness needs a task-specific eval.

Pick the cheapest reliable gate:

| Work Type                 | Eval Gate                                                    |
| ------------------------- | ------------------------------------------------------------ |
| Code feature              | Focused test, lint, typecheck, and one integration path      |
| UI/control pane           | Browser smoke test, screenshot, overflow/error check         |
| Agent workflow            | Fixture transcript or seeded work item with expected routing |
| Research/content          | Source checklist, claim review, publish-ready outline        |
| Integration               | Dry-run command, config validation, and no-secret scan       |
| Refactoring               | Existing tests, behavior snapshot, and diff review           |
| Security-sensitive change | Threat checklist, abuse case, and focused regression test    |

Do not claim a dynamic workflow is reusable until the eval can be rerun by another person.

## Safety Rules

Before running a dynamic harness, verify:

```text
- Does it modify files?
- Does it call external systems?
- Does it use credentials?
- Does it read secrets?
- Does it upload data?
- Does it run shell commands?
- Does it delete or overwrite anything?
- Can it be stopped safely?
```

For risky actions, require explicit human approval.

Risky actions include:

```text
database migration
deployment
destructive filesystem operation
secret access
external network upload
mass rewrite
bulk dependency update
git push
PR merge
```

## Anti-Patterns

Avoid:

```text
- Creating harnesses for simple one-shot tasks
- Generating scripts that hide decision logic from the operator
- Treating dynamic workflow mode as permission to skip tests
- Creating one-off docs when a shared skill is the real product
- Running multiple agents without ownership or conflict policy
- Letting private research data leak into public docs
- Claiming success without eval evidence
- Keeping useful repeated harnesses trapped in temporary folders forever
```

## Output Standard

Finish dynamic workflow work with:

```text
Harness or skill path:
Eval commands:
Eval results:
Handoff artifact:
Known risks:
Next reusable extraction candidate:
```

Example:

```text
Harness or skill path:
.tools/harnesses/api-contract-check/

Eval commands:
npm run typecheck
npm test -- api-contract

Eval results:
Passed locally.

Handoff artifact:
.tools/harnesses/api-contract-check/status.md

Known risks:
Only one integration path covered.

Next reusable extraction candidate:
API contract validation skill.
```

## Final Rule

For Cursor dynamic workflows:

```text
Do not automate first.
Define the loop, eval, ownership, and handoff first.
Then automate the smallest useful part.
```
