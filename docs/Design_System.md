# Design System (MVP v1)

**Status:** Draft v1.0  
**Companion to:** `docs/BRD.md`, `docs/NFR.md`, `docs/API_Contracts.md`, `docs/prd/05_Admin.md`

**Contract precedence:** This document defines frontend style and interaction conventions. If it conflicts with requirements in `docs/` or machine-readable contracts in `openapi/`, those sources take precedence.

---

## 1. Purpose

Define a minimal, shared UI contract for the React + TypeScript SPA so screens stay consistent across:

- document upload and ingestion monitoring
- semantic search
- chat with citations (SSE)
- admin/RBAC and observability surfaces

This document is intentionally small. It defines what must be consistent now and defers full design-system infrastructure until post-MVP.

---

## 2. Design Direction (MVP)

- **Primary tone:** dense, calm, technical, enterprise.
- **Scan-first layout:** prioritize fast reading and operational clarity over decoration.
- **Trust signals:** clear status, explicit errors, visible scope (workspace/collection/document), and stable interaction patterns.
- **AI transparency:** citations, model/runtime state, and degraded-mode messaging must be readable and easy to verify.

Anti-goal: marketing-page visual style inside core product workflows.

---

## 3. UX Invariants

These are non-negotiable for MVP screens:

1. Every page has stable information hierarchy: context bar, primary action, content area, secondary metadata.
2. Interactive controls preserve keyboard access and visible focus.
3. Loading, empty, partial, error, and forbidden states are explicitly designed (never left implicit).
4. Workspace and permission context are always visible before data actions.
5. Streaming chat state is explicit (`connecting`, `streaming`, `done`, `error`).
6. User-facing errors map to backend `ProblemDetails` language where applicable.
7. Chat UI state machine derives from canonical SSE events (`token`, `citation`, `heartbeat`, `done`, `error`; ADR-011).

---

## 4. Foundations (Design Tokens)

MVP uses a compact token set (CSS variables or equivalent). Names below are normative; values are implementation-defined.

### 4.1 Color tokens

- `--color-bg-canvas`
- `--color-bg-surface`
- `--color-bg-elevated`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-border-default`
- `--color-border-strong`
- `--color-accent`
- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`
- `--color-focus-ring`

Requirements:

- Meet WCAG 2.2 AA contrast for text and key UI boundaries.
- Do not rely on color alone for status meaning.

### 4.2 Typography tokens

- `--font-family-sans`
- `--font-size-xs | sm | md | lg | xl`
- `--font-weight-regular | medium | semibold`
- `--line-height-tight | normal | relaxed`

Requirements:

- Favor compact readability for dashboard/admin density.
- Avoid oversized hero-like typography in product routes.

### 4.3 Spacing and shape tokens

- `--space-1` to `--space-8` (4px base scale recommended)
- `--radius-sm | md | lg`
- `--shadow-sm | md`
- `--border-width-thin | medium`

### 4.4 Breakpoints

- `sm` (mobile)
- `md` (tablet/small laptop)
- `lg` (desktop primary target)
- `xl` (wide desktop)

Layouts must remain stable across breakpoints; controls and table actions must not shift unpredictably.

---

## 5. Core Component Set (MVP)

Only components needed for MVP workflows are in scope.

### 5.1 Structural components

- App shell (top bar, workspace context, navigation rail/header)
- Page header (title, subtitle, primary action slot)
- Section container (title + actions + body)

### 5.2 Input and action components

- Button (primary/secondary/ghost/destructive)
- Text input, search input, textarea
- Select/multi-select (for scope and filters)
- Checkbox/radio/switch
- Form field wrapper (label, help text, error text)

### 5.3 Data and feedback components

- Data table with sortable headers and empty/loading/error states
- Status badge/chip (ingestion status, role, classification tier: `standard` / `restricted` / `strict`)
- Inline alert and page alert
- Toast for non-blocking confirmations/errors
- Skeleton loader for high-latency data
- Pagination controls (cursor-oriented interaction)

### 5.4 Overlay components

- Modal/dialog for destructive or high-risk actions
- Slide-over/panel for metadata detail where full navigation is unnecessary

### 5.5 Domain components

- Document status row/card (state + timestamps + retry affordance)
- Citation item (doc title, location, snippet, open-source action)
- Chat message bubble (user/assistant/system)
- Streaming indicator and partial response container
- Permission/forbidden banner

---

## 6. State Patterns (Required)

Every route and major component must define:

- **Loading:** skeleton or progress state.
- **Empty:** actionable guidance (next step, not generic "no data").
- **Error:** clear message + retry path where safe.
- **Forbidden:** permission-aware denial language (no leakage of hidden resource details).
- **Degraded dependency state:** explicit message for provider/search/storage disruption (aligned with BRD/NFR degraded-mode behavior).
- **Stream reconnect behavior:** reconnect must not imply generation resume; present explicit re-ask/retry action.

---

## 7. Accessibility Baseline (WCAG 2.2 AA)

MVP must satisfy:

- keyboard-operable primary workflows (upload, search, ask, admin edits)
- visible focus ring on all actionable controls
- semantic labels for all form fields and icon-only actions
- correct heading order and landmark usage
- descriptive error messaging linked to fields
- contrast-compliant text, controls, and status indicators

If conflict appears between visual density and accessibility, accessibility wins.

---

## 8. Interaction and Motion Rules

- Use motion only to clarify state transitions (e.g., stream start/stop, panel open/close).
- Keep durations short and consistent; avoid decorative animation.
- Never hide latency with animation; show real progress and state.
- Preserve reduced-motion preferences.

---

## 9. Frontend Contract Conventions

1. Reuse tokenized styles and shared components before adding route-local variants.
2. New reusable UI primitives require token-based styling and state coverage (loading/empty/error/disabled/focus).
3. User-visible error copy should map to API semantics (`ProblemDetails`) where practical.
4. Components used in permission-aware flows must support explicit forbidden/degraded states.

---

## 10. Out of Scope for MVP v1

Not required in this document phase:

- standalone design-system package
- Storybook requirement
- full visual language overhaul
- multi-brand theming
- advanced motion library adoption
- comprehensive iconography doctrine

These may be added after MVP workflows stabilize.

---

## 11. Adoption Plan (Small, Incremental)

1. Implement tokens and app-shell primitives first.
2. Build core component set while delivering upload/search/chat/admin screens.
3. Enforce accessibility/state invariants in PR review.
4. Extend this document only when repeated UI patterns appear in at least two routes.

This keeps v1 small while preventing UI drift.
