# S-R2-014 — Run accessibility audit and fixes

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Quality |
| Type | test |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-090 |
| Blocks | S-R2-015, S-R2-062 |
| Executor tier | Tier-3 with HUMAN help — screen-reader testing needs a person and real assistive technology |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-001 to S-R2-013, S-R2-016 to S-R2-062 |

## 1. Why
Automated checks find roughly a third of accessibility problems. WCAG 2.2 AA is a stated requirement, so a manual audit with a keyboard and two screen readers is needed before the product is called trustworthy (`07_UX_DESIGN_SYSTEM.md` §4).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §4 (rules and the per-screen accessibility notes in §2); WCAG 2.2 quick reference (https://www.w3.org/WAI/WCAG22/quickref/?levels=aaa — filter to A and AA).
- **Files to read first:** `apps/web/e2e/a11y.spec.ts`, each screen's "Accessibility" bullet in `07` §2.
- **Files to create:** `docs/runbooks/release-checks/accessibility-R2.md` (audit report), regression tests for each fixed issue (in the owning component's test file or `a11y.spec.ts`).
- **Files to modify:** components and screens that fail.
- **Files you must NOT touch:** token colour values without a recorded decision.
- Env vars: none.

## 3. Design notes
- Tools: keyboard only; VoiceOver on macOS Safari **or** iOS Safari; NVDA on Windows with Firefox or Chrome (free); browser zoom; a contrast checker for anything not token-based.
- Audit script per screen (Sign in, Onboarding ×3, Home, Plan ×4 tabs, Tasks, Housing form/result/paste dialog/compare, Places, Chat, Settings, Legal, error and empty states). For each, record pass/fail with a note:
  1. **Page title and heading:** the document title changes per screen ("Tasks · Student Life Journey"); one `<h1>`; heading levels do not skip.
  2. **Landmarks:** `header`, `nav` (labelled "Primary"), `main`, and they are announced.
  3. **Focus:** visible focus ring on every interactive element; focus moves to the `<h1>` on navigation; no focus loss after dialogs, toasts, deletes or tab switches; focus is never obscured by the sticky bottom bar (WCAG 2.4.11).
  4. **Names, roles, values:** every control has a meaningful name; state (`aria-pressed`, `aria-expanded`, `aria-checked`, `aria-current`) is announced.
  5. **Forms:** labels, required state, error announcement on submit (focus moves to the first invalid field), `autocomplete` attributes where they apply (none for city fields; `name` for display name).
  6. **Dynamic content:** toasts, the offline bar, the streaming chat reply, the housing result and loading states are announced once, politely, without stealing focus.
  7. **Target size and dragging:** targets ≥ 24 px (aim 44); nothing requires dragging (2.5.7).
  8. **Colour and contrast:** nothing conveyed by colour alone (priority, verdict, overdue, selected tab).
  9. **Authentication:** sign-in needs no memory or puzzle test (3.3.8) — Google sign-in satisfies it.
  10. **Consistent help and redundant entry:** settings pre-fill what onboarding collected (3.3.7).
- Severity: **blocker** (a task cannot be completed with keyboard or screen reader), **major** (possible but confusing or wrong information), **minor**. Fix all blockers and majors in this story if the total fix time fits half a day; otherwise fix blockers, and create follow-up stories for the rest (IDs recorded in the report and on the board).
- Every fix gets a regression test (unit or E2E).
- Report format: summary counts; table (screen, check, result, severity, fix commit or follow-up story); tools and versions; date; who tested.

## 4. Steps
1. Add document titles per route if missing (a `useDocumentTitle` hook in the shell).
2. Run the audit; fill the report.
3. Fix; add regression tests; re-test the fixed items.
4. Commit: `test(web): run accessibility audit and fixes (S-R2-014)`.

## 5. Acceptance criteria
- AC1: Given the report, then every listed screen has results for the ten checks, with the tools, versions and date.
- AC2: Given the report, then zero blockers remain open; every open major has a follow-up story ID.
- AC3: Given the core journey performed with a screen reader by a person (or a recorded session), then it can be completed without sighted help — stated in the report with the tester's initials.
- AC4: Given each fix, then a test exists that fails without it.
- AC5 (negative): Given `pnpm e2e`, then the automated a11y spec still passes.

## 6. Tests to write
One regression test per fix; a unit test for `useDocumentTitle`.

## 7. Verification commands
```bash
pnpm test && pnpm e2e                                              # expected: pass
test -f docs/runbooks/release-checks/accessibility-R2.md && echo ok   # expected: ok
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (report)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No screen reader is available to the executor: do the keyboard and inspection parts, mark screen-reader checks "NOT RUN — needs HUMAN", and keep the story IN PROGRESS until a person completes them.
- A blocker needs a redesign of a flow: stop and raise it under "Decisions needed".

## 10. Rollback / undo note
`git revert` of individual fixes if they regress behaviour.

## 11. Out of scope
Zoom, reflow and text spacing (`S-R2-015`); native shell accessibility (checked in `S-R2-054`, `S-R2-055`); a formal third-party audit or VPAT (parked).
