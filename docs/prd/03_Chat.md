# PRD — Chat (RAG, MVP)

**Status:** Draft v1.0
**Owner:** Product
**Source:** [docs/BRD.md §3.3, §4.3, §4.4, §7](../BRD.md) · [docs/BA_Analysis.md §3.3, §7.4](../BA_Analysis.md)

---

## 1. Objective

Provide a grounded conversational interface over a workspace's indexed documents. Every answer is permission-filtered, cites its sources, and refuses when retrieval is insufficient. Streaming token-by-token to keep TTFT low. Inspectable diagnostics for every answer.

## 2. In-Scope (MVP)

- Scoped Q&A over **workspace**, **one or more collections**, or **a single document**.
- Hybrid retrieval (reuses Search §02).
- Clickable inline citations to source chunk (with highlight).
- "I don't know" refusal on insufficient retrieval.
- Streaming responses (SSE).
- Per-answer feedback (thumbs ±, comment).
- Per-answer diagnostics: provider, model, prompt version, retrieved chunk IDs, cited chunk IDs, latency, token usage.

## 3. Out-of-Scope (MVP)

- Multi-turn agentic tool use.
- Cross-workspace chat.
- Voice / multi-modal input.
- Long-term personal memory.
- Custom system prompts per user (workspace-level prompt templates only).

## 4. Personas & Permissions

- **USER, CONTRIBUTOR, ADMIN**: can use chat over permitted content.
- **VIEWER**: read existing conversations (own + shared by ADMIN, if any) but cannot ask new questions in MVP.

## 5. Functional Requirements

### 5.1 Scope Selection
- Default scope: **current workspace** (BA §7.4.d).
- Last-used scope per `(user, workspace)` remembered.
- Scope-picker in chat input allows narrowing to one or more collections or a single document.

### 5.2 Conversation Object
- `ChatConversation` per `(user, workspace)` is explicit. Listed in left rail.
- New conversation auto-created after 30 min inactivity (configurable).
- Memory window per conversation: min(last 10 turns, 2,000 tokens) — older turns truncated with a UI indicator (BA §7.4.e).
- Chat content persistence governed by workspace retention policy (default: disabled, metadata-only).

### 5.3 RAG Pipeline (per question)
1. Validate user + JWT + workspace + scope.
2. Resolve allowed filter set (tenant, workspace, collections, documents).
3. Run hybrid retrieval (PRD §02). topK = 8 by default (workspace-configurable 3–20).
4. Apply "I don't know" refusal criterion (BA §7.4.f): zero permitted chunks **or** all top-K below threshold (default cosine 0.55) **or** combined context tokens < 200.
5. If insufficient → emit refusal answer template + audit `refused.insufficient_context`. End.
6. If sufficient → resolve provider via workspace AI policy. Pre-call validation (region, retention, training, approval). Fail-closed.
7. Build prompt: system template (versioned) + minimized retrieved context + citations placeholders + recent memory window.
8. Stream tokens to client via SSE.
9. Persist diagnostic metadata at completion or on interruption.

### 5.4 Citation Behavior
- Inline citation markers `[1]`, `[2]` etc., each backed by `chunkId` + `documentId` + version + section/page.
- UI renders clickable citations; clicking opens the source document at the highlighted chunk (audit event `citation.clicked`).
- Citation must be present whenever the answer references retrieved content. Refusal answers may have zero citations.

### 5.5 Refusal Template
- "I don't have enough information in the documents you have access to to answer that. You can refine your question, broaden the scope, or ask an administrator about access."
- Workspace ADMIN can override the template text.

### 5.6 Streaming Topologies
- Two supported topologies (BA §7.4.g):
  - Cloud default: **React → Node BFF → Spring Boot**.
  - Local/minimal: **React → Spring Boot SSE** directly.
- The same streaming protocol (SSE events) is used in both; the BFF is a thin pass-through with AI gateway responsibilities.

### 5.7 Feedback
- One feedback per `(user, answer)` (BA §7.4.h).
- Fields: thumbs up/down + free-text comment.
- Editable within 24 h, locked thereafter. No deletion.
- Feeds the evaluation feedback queue (PRD §04 §5.4).

### 5.8 Per-Answer Diagnostics (Inspectability)
- Stored: question, scope, allowed filter, retrieved chunk IDs, cited chunk IDs, provider, region, model, prompt version, prompt token count, completion token count, total latency, TTFT, refusal flag, error reason if any, feedback IDs.
- Visible to CONTRIBUTOR+ via UI ("Why this answer?").

## 6. Non-Functional Requirements

- **Latency p95** (BRD §4.4):
  - Retrieval + prompt construction < 1.5 s.
  - Full non-streaming answer < 8 s.
  - TTFT (streaming) < 2 s.
- 10 concurrent chats / tenant.
- Fail-closed on any provider/policy violation.
- Provider outage → user-visible "AI provider currently unavailable" + audit `provider.outage`.
- Permission revocation effective on next request (cache TTL ≤ 60 s).
- Streaming interruption must still produce an audit record.

## 7. Data Model Touchpoints

- `chat_conversations`, `chat_messages`, `citations`, `feedback`, `answer_diagnostics`, `audit_events`.

## 8. APIs (illustrative)

- `POST /api/v1/workspaces/{wsId}/conversations` (create).
- `GET /api/v1/conversations/{convId}` / `DELETE` (soft delete).
- `POST /api/v1/conversations/{convId}/ask` — SSE stream.
- `POST /api/v1/messages/{msgId}/feedback`.
- `GET /api/v1/messages/{msgId}/diagnostics` (CONTRIBUTOR+).

## 9. Telemetry & Audit

- Metrics: p95 retrieval latency, p95 TTFT, p95 full answer, refusal rate, citation count distribution, feedback rate (positive/negative), provider failure rate, token usage by model.
- Audit: `chat.question.asked`, `chat.context.retrieved` (chunk IDs only), `chat.answer.generated`, `chat.answer.refused`, `chat.feedback.submitted`, `citation.clicked`, `chat.streaming.interrupted`, `provider.call.denied`.

## 10. Acceptance Criteria

1. Answer cites only chunks the user is permitted to read (verified by negative ACL tests).
2. When retrieval is insufficient, the answer is the refusal template, not a hallucination (verified by golden negative-case suite).
3. p95 TTFT < 2 s on a tenant under nominal load.
4. Diagnostics record retrieved + cited chunk IDs for every answer including refusals.
5. Provider region mismatch detected mid-flight blocks the call with a fail-closed error and full audit.
6. Permission revoked mid-conversation takes effect on the next question.
7. Streaming interruption produces an audit record and partial citations.

## 11. Open Items

- Prompt template format and version-bump policy (handled in evaluation governance — PRD §04).
- Reranker option post-MVP.
