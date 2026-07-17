# Prompt — Chat / RAG Slice Implementation Spec

Create `docs/specs/03_Chat_Spec.md` — a detailed implementation
specification for the **chat slice** (Solution_Architecture.md §8 track 3).
Assumes foundation + ingestion slice specs exist.

## Ground rules

- `docs/` and `openapi/` are authoritative. On conflict, report — do not pick.
- Do not restate module boundaries or conventions; reference
  `docs/Module_Boundaries.md`, `.claude/rules/rag-chat-evaluation-modules.md`.
- Scope: MVP only. No conversational query rewriting (ADR-012), no BFF
  (ADR-018), no long-term memory.
- Spec maps 1:1 to `docs/Database_Schema.md` — do not invent tables or columns.

## Scope of this slice

`rag` (orchestrator, PromptRegistry, diagnostics, refusal), `chat`
(conversations, memory window, feedback), SSE streaming.

## The specification must include

1. **Domain model**
   - chat_conversations, chat_messages, citations, feedback,
     answer_diagnostics mapped to Database_Schema
   - `citations.chunk_id` nullable FK (`ON DELETE SET NULL`) — survives
     hard deletes
   - `rag` projections per Module_Boundaries: `DiagnosticRef`,
     `RetrievalTrace`, `DiagnosticsView`; `AnswerDiagnosticsEntity` private

2. **RAG pipeline contract (`rag.executeRag`)**
   - Signature: `(userId, question, scope, priorTurns, aiPolicy): RagResult`
     — resolves `AllowedFilterSet` internally via `policy.access`; callers
     never supply one (Module_Boundaries v2.1)
   - Pipeline: retrieve (hybrid, topK=8 default, 3–20 configurable) →
     refusal check → provider pre-call validation (fail-closed) → prompt
     build (PromptRegistry, versioned classpath templates) → stream →
     diagnostics persist
   - Refusal criterion exact (BA §7.4.f): zero permitted chunks OR all
     top-K below cosine 0.55 (0.4–0.8 configurable) OR context < 200 tokens
   - `executeAndCollect()` variant for evaluation — same pipeline, no SSE

3. **Chat orchestration (`chat`)**
   - Conversation lifecycle: explicit object, 30-min inactivity auto-create
   - Memory window: min(last 10 turns, 2000 tokens), truncation indicator
   - `chat` does not call `policy` — permission resolution is `rag`'s job
   - Content persistence per workspace retention policy (default: metadata only)

4. **API endpoints (openapi/chat.yaml + API_Contracts.md §3.3)**
   - `POST /workspaces/{id}/conversations` — create
   - `POST /conversations/{id}/ask` — SSE stream
   - `POST /messages/{id}/feedback` — one per (user, answer), editable 24h,
     locked after, no deletion (BA §7.4.h)
   - Java records; ProblemDetails; status codes per endpoint

5. **SSE contract (ADR-011)**
   - Events exact: `token`, `citation`, `heartbeat`, `done`, `error`
   - `error` carries ProblemDetails payload
   - Reconnect never resumes — client re-asks
   - Cancellation/disconnect still persists diagnostics + audit (ADR-015
     split-transaction rule for streaming)

6. **Diagnostics & audit**
   - Per answer: question, scope, filter, retrieved chunk IDs, cited chunk
     IDs, provider, region, model, prompt version, token counts, latency,
     TTFT, refusal flag, error reason
   - Audit events: chat.question.asked, chat.context.retrieved (chunk IDs
     only), chat.answer.generated, chat.answer.refused,
     chat.feedback.submitted, citation.clicked, chat.streaming.interrupted,
     provider.call.denied

7. **NFR targets in scope**
   - p95: retrieval+prompt < 1.5s; TTFT < 2s; full answer < 8s
   - 10 concurrent chats/tenant; permission revocation ≤ 60s effective

8. **Test plan**
   - Negative ACL tests: answer cites only permitted chunks; canary never
     in context
   - Refusal golden negatives (no hallucination)
   - Interrupted-stream diagnostics persisted
   - Fail-closed: provider denied, budget exhausted, policy store down
   - Same-pipeline guarantee: `executeRag` vs `executeAndCollect` produce
     identical retrieval traces for identical inputs

Deliverable format: entities → rag contract → chat orchestration →
endpoints → SSE → tests.
