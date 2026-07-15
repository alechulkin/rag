# PRD — Evaluation Framework (MVP)

**Status:** Draft v1.0
**Owner:** Product + Quality
**Source:** [docs/BRD.md §3.5, §4.5](../BRD.md) · [docs/BA_Analysis.md §3.4, §7.5](../BA_Analysis.md)

---

## 1. Objective

Provide a permission-aware evaluation framework that judges quality across the **whole RAG chain** — permissions → retrieval → citations → answer → refusal behavior → feedback — not just final answer text. Make AI behavior measurable and inspectable.

## 2. In-Scope (MVP)

- Golden Q&A authoring (UI + REST).
- Evaluation runner that **reuses the live RAG pipeline** with permission filtering.
- Layered correctness oracle: deterministic checks + LLM-as-judge + optional human review.
- Per-case results stored with full diagnostics.
- Dashboard for retrieval pass rate, citation match rate, answer correctness, refusal correctness, regression delta.
- Feedback → golden-question promotion workflow.
- Auto-stale flagging when source documents are deleted/replaced.

## 3. Out-of-Scope (MVP)

- Scheduled/CI-triggered evaluation runs (roadmap).
- A/B testing prompt templates in production traffic.
- Cross-workspace eval suites.
- Crowd-sourced human labelling.

## 4. Personas & Permissions

- **CONTRIBUTOR**: author/edit golden questions, run evals, review feedback queue.
- **ADMIN**: all CONTRIBUTOR actions + configure evaluator-model selection, regression thresholds, alert recipients.
- **USER**: submits feedback via chat; not a direct evaluation actor.
- **VIEWER**: read evaluation dashboards if granted.

## 5. Functional Requirements

### 5.1 Golden Question Schema
- `question` (text), `scope` (workspace / collections[] / document?), `expectedAnswer` (text), `expectedSources` (documentId / chunkId list with required-count), `requiredKeywords` (array), `forbiddenKeywords` (array), `expectedBehavior` (`answer` | `refuse`), `tags`, `createdBy`, `createdAt`, `status` (`active` | `stale` | `disabled`).

### 5.2 Run Execution
- Ad-hoc only in MVP. Triggered by UI button or `POST /api/v1/eval/suites/{suiteId}/runs`.
- For each case:
  1. Execute the **same RAG pipeline** as live chat using the case's scope and the workspace AI policy.
  2. Record retrieved chunks, citations, answer text, latency, token usage, provider, model, prompt version.
  3. Run correctness oracle (see 5.3).
  4. Update per-case result with overall pass/fail/partial and per-check breakdown.

### 5.3 Correctness Oracle (Layered)
1. **Deterministic checks** (always):
   - Required keywords present in answer.
   - Forbidden keywords absent.
   - Expected citations: overlap ≥ `min_expected_citations` (default 1).
   - Refusal-behavior: if `expectedBehavior = refuse`, answer must match refusal template; if `answer`, must not.
2. **LLM-as-judge** (semantic correctness):
   - Runs only when deterministic checks pass OR when assessing the *quality* of a non-refusal answer.
   - Evaluator model is a separate approved provider/model from the answer model where possible.
   - Structured rubric: factual alignment, citation grounding, refusal appropriateness, harmful-content check.
   - Output: `pass | fail | partial` with rationale persisted on `EvaluationResult`.
3. **Optional human review queue**:
   - All cases marked `fail` or `partial` flow to a queue.
   - Reviewer (CONTRIBUTOR/ADMIN) can confirm/override the judge's verdict with comments.
   - Reviewer overrides update the case verdict and the run aggregate.

### 5.4 Feedback → Golden Promotion
1. USER submits feedback on a chat answer.
2. Reviewer (CONTRIBUTOR/ADMIN) sees the feedback in a review queue with full diagnostics.
3. Reviewer adds expected answer + expected sources + keywords + scope.
4. Reviewer publishes the case to the golden suite; audit event `eval.golden.promoted`.

### 5.5 Stale & Disabled Handling
- When a source document is soft-deleted or replaced (PRD §01 §5.4), dependent cases auto-flag `stale`.
- Default owners (creator + workspace ADMIN) receive a notification.
- SLA: review within 14 days. After 30 days unreviewed, auto-`disabled`. Audit recorded.

### 5.6 Regression Alerts
- Trigger when (BA §7.5.c):
  - overall pass rate drops by > 5 absolute pp vs previous same-suite run, OR
  - retrieval pass rate drops by > 10 pp.
- Recipients: workspace ADMINs + suite owner CONTRIBUTORs.

### 5.7 Dashboards
- Per suite: pass rate trend, retrieval pass rate, citation match rate, refusal correctness, regression delta.
- Per case: history of results, latest answer, retrieved/cited chunk IDs.
- Per run: pass/fail/skip counts, duration, token usage, provider mix.

### 5.8 Provider Unavailable
- Affected cases marked `SKIPPED` with reason; run summary indicates partial completion (BA §7.5.e). Re-run resumes only the skipped cases.

## 6. Non-Functional Requirements

- Evaluation runs must not degrade live chat p95 latency — use a separate worker pool and rate-limited provider quota.
- Evaluation data retention: 180 days (BRD §4.5).
- Permission isolation: evaluation cases inherit scope ACL; cross-workspace eval is forbidden.

## 7. Data Model Touchpoints

- `golden_questions`, `eval_suites`, `eval_suite_cases`, `eval_runs`, `eval_results`, `eval_human_reviews`, `feedback`, `audit_events`.

## 8. APIs (illustrative)

- `POST /api/v1/workspaces/{wsId}/golden-questions`.
- `POST /api/v1/eval/suites/{suiteId}/runs`.
- `GET /api/v1/eval/runs/{runId}`.
- `POST /api/v1/eval/results/{resultId}:human-review`.
- `POST /api/v1/feedback/{fbId}:promote-to-golden`.

## 9. Telemetry & Audit

- Metrics: overall pass rate by suite, retrieval pass rate, citation match rate, refusal correctness, run latency, evaluator-model token usage, regression counts.
- Audit: `eval.suite.created`, `eval.golden.created`, `eval.golden.promoted`, `eval.run.started`, `eval.run.completed`, `eval.case.stale`, `eval.human.review.recorded`, `eval.regression.alerted`.

## 10. Acceptance Criteria

1. Evaluation runner uses the same permission-aware RAG pipeline as live chat (verified by negative ACL test cases in the suite).
2. Refusal expectations are enforced: a case expecting refusal that gets an answer is marked `fail` regardless of LLM-judge verdict.
3. Regression alert fires on a synthetic drop of > 5 pp pass rate and reaches workspace ADMINs.
4. Promoting feedback to a golden question requires expected-answer and expected-sources fields.
5. Soft-deleting a source document marks all dependent cases `stale` in the same transaction as the soft-delete action.

## 11. Open Items

- Choice of evaluator model and rubric prompt versioning (SAD).
- UI affordance for partial / disputed verdicts.
