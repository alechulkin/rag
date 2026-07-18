# UI Review Checklist (MVP)

**Purpose:** PR review template for UI consistency, accessibility, and state coverage.  
**Primary references:** `docs/Design_System.md`, `docs/BRD.md`, `docs/NFR.md`, `docs/API_Contracts.md`

---

## PR Metadata

- PR link:
- Reviewer:
- Date:
- Scope (routes/components):
- Risk level: low / medium / high

---

## 1) Design System Consistency

- [ ] UI follows MVP direction (dense, calm, technical, scan-first).
- [ ] Page hierarchy is clear (context bar, primary action, content, secondary metadata).
- [ ] Shared tokens used for color, typography, spacing, border, radius, and elevation.
- [ ] No one-off visual styles introduced where shared component/token exists.
- [ ] New or changed components match existing app-shell/navigation/header patterns.
- [ ] Role/classification/status visuals use consistent badges/chips.
- [ ] No marketing-style hero patterns introduced in core product workflows.

Notes:

---

## 2) Component and Interaction Quality

- [ ] Primary and secondary actions are visually and behaviorally consistent.
- [ ] Forms use consistent field wrappers (label/help/error).
- [ ] Tables/lists support predictable sorting/filtering/pagination behavior.
- [ ] Dialogs/sheets used only for appropriate high-risk or detail workflows.
- [ ] Motion is functional (state clarity), not decorative.
- [ ] Reduced-motion preference is respected where motion exists.

Notes:

---

## 3) Accessibility (WCAG 2.2 AA Baseline)

- [ ] All interactive elements are keyboard reachable and operable.
- [ ] Visible focus indicator exists and is not suppressed.
- [ ] Inputs and icon-only actions have semantic labels.
- [ ] Heading structure and landmarks are valid and meaningful.
- [ ] Error text is descriptive and associated with the correct field/control.
- [ ] Contrast is sufficient for text, controls, and status indicators.
- [ ] Status meaning is not conveyed by color alone.

Notes:

---

## 4) State Coverage (Required)

For each touched route/component, verify explicit states:

- [ ] Loading state exists and is understandable.
- [ ] Empty state exists and provides actionable next step.
- [ ] Error state exists and provides safe retry or recovery action.
- [ ] Forbidden state exists and does not leak restricted resource details.
- [ ] Degraded dependency state exists (provider/search/storage disruption).
- [ ] Disabled state is visually distinct and semantically correct.

SSE/chat-specific:

- [ ] Streaming states are explicit (`connecting`, `streaming`, `done`, `error`).
- [ ] Reconnect behavior does not imply generation resume; user sees re-ask/retry path.
- [ ] Citation rendering remains usable during partial/streaming output.

Notes:

---

## 5) API and Error Contract Alignment

- [ ] User-visible error language aligns with backend `ProblemDetails` semantics.
- [ ] UI handles permission-denied responses with clear, safe messaging.
- [ ] Cursor pagination behavior in UI matches API contract.
- [ ] Request correlation (`X-Request-Id`) is preserved in visible error/debug UX where applicable.

Notes:

---

## 6) Responsive and Layout Stability

- [ ] Core flows remain usable at `sm`, `md`, `lg`, and `xl`.
- [ ] Layout does not jump unexpectedly when labels/actions/states change.
- [ ] Table/action areas remain stable under long labels and error text.
- [ ] Horizontal overflow is intentional and controlled.

Notes:

---

## 7) Security and Permission-Aware UX

- [ ] UI never exposes cross-workspace/tenant data in labels, previews, or metadata.
- [ ] Permission context is visible before sensitive actions.
- [ ] Destructive/high-risk actions require deliberate confirmation.
- [ ] Audit-sensitive actions have clear user feedback (success/failure).

Notes:

---

## 8) Observability and Regression Confidence

- [ ] UI changes include sufficient test coverage for new states and interactions.
- [ ] Critical regressions checked: upload flow, search flow, chat flow, admin flow (as applicable).
- [ ] No obvious performance regressions in common route interactions.
- [ ] Reviewer assessed residual risk and documented follow-up tasks if needed.

Notes:

---

## Review Outcome

- [ ] Approved
- [ ] Approved with follow-ups
- [ ] Changes requested

Blocking issues:

Follow-up tickets/tasks:
