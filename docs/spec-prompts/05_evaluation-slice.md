# Prompt — Evaluation Slice Implementation Spec

Create `docs/specs/05_Evaluation_Spec.md` — a detailed implementation
specification for the **evaluation slice** (Solution_Architecture.md §8
track 5). Assumes foundation + ingestion + chat + admin slice specs exist.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries or conventions; reference
  `docs/Module_Boundaries.md`, `.claude/rules/rag-chat-evaluation-modules.md`.
- Scope: MVP only. Ad-hoc runs (UI + REST); scheduled runs and CI
  integration are roadmap (BA §7.5.b).
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

`evaluation` (golden Q&A, suite runner, layered oracle, regression
detection, feedback promotion), `worker.runtime` extension for eval runs.

## The specification must include

1. **Domain model**
   - golden_questions, eval_suites, eval_suite_cases, eval_runs,
     eval_results, eval_human_reviews mapped to Database_Schema
   - Golden question fields: question, scope, expected answer, expected
     sources, required/forbidden keywords, expected behavior incl. refusal
     (BRD §3.5)
   - Case lifecycle: active → stale (source soft-deleted) → disabled
     (30 days unreviewed; BA §7.5.f)

2. **Run execution (worker profile)**
   - eval_runs dequeued via same DB queue semantics as ingestion (ADR-010:
     lease columns, SKIP LOCKED, dead-letter)
   - Eval executes on worker, never on API JVM (SAD §9.2); rate-limited
     provider quota separate from live chat
   - Per case: `rag.executeAndCollect()` — same permission-aware pipeline
     as live chat, no streaming
   - Provider unavailable → case SKIPPED with reason; re-run resumes
     skipped only (BA §7.5.e); all skipped → run INCOMPLETE

3. **Layered oracle (BA §7.5.a)**
   - Layer 1 deterministic (always): required keywords present, forbidden
     absent, citation overlap ≥ threshold, refusal-behavior match
   - Layer 2 LLM-as-judge: separate evaluator model via
     `policy.callProvider()`; rubric template from `rag.PromptRegistry`
     (`judge-rubric` family); output pass/fail/partial + rationale
   - Layer 3 optional human review queue (CONTRIBUTOR/ADMIN override)

4. **Regression detection & alerts**
   - Overall pass rate drop > 5pp vs previous run on same suite, or
     retrieval pass rate drop > 10pp → notify workspace ADMINs + suite
     owners via `admin.NotificationService` (BA §7.5.c)

5. **Feedback → golden promotion workflow (BA §7.5.d)**
   - Feedback queue → reviewer edits (expected answer/sources/keywords/scope)
     → publish → audit event

6. **API endpoints (openapi/evaluation.yaml + API_Contracts.md §3.4)**
   - Golden question CRUD; suite CRUD
   - `POST /workspaces/{id}/eval/suites/{suiteId}/runs` — 202 + runId
   - Run status/results endpoints (cursor pagination)
   - Human review endpoints
   - Java records; ProblemDetails; role requirements (CONTRIBUTOR+ authoring)

7. **Metrics & audit**
   - Dashboard metrics: retrieval pass rate, citation match rate,
     correctness, refusal behavior, run-over-run regression
   - Audit: evaluation.run.started/completed, case verdicts, promotion events

8. **Test plan**
   - Same-pipeline guarantee: eval retrieval trace identical to chat for
     identical inputs/scope
   - Eval isolation: long suite does not degrade live chat p95 (PRD 04 §6)
   - Stale-flag on source soft-delete; auto-disable after 30 days
   - Judge model distinct from answer model where possible
   - SKIPPED/INCOMPLETE semantics; resume-skipped re-run

Deliverable format: entities → run execution → oracle → endpoints →
alerts → tests.
