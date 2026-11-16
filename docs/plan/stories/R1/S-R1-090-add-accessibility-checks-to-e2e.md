# S-R1-090 — Add accessibility checks to E2E

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-089 |
| Blocks | S-R1-095, S-R2-014 |
| Executor tier | Tier-2 — automated checks plus small fixes |
| Platforms | web |
| Parallel-safe with | S-R1-085 to S-R1-088, S-R1-091, S-R1-092 |

## 1. Why
WCAG 2.2 AA is a release requirement (`07_UX_DESIGN_SYSTEM.md` §4). Automated checks catch about a third of problems cheaply on every pull request; the manual audit follows in R2.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §4 (accessibility rules, contrast table); `docs/plan/09_TEST_QA_OBSERVABILITY.md` (accessibility testing).
- **Files to read first:** `apps/web/e2e/core-journey.spec.ts`, `apps/web/e2e/helpers/journey.ts`, `apps/web/playwright.config.ts`.
- **Files to create:** `apps/web/e2e/a11y.spec.ts`, `apps/web/e2e/helpers/axe.ts`.
- **Files to modify:** `apps/web/package.json` (devDependency `@axe-core/playwright`), and any screen or component that fails a check.
- **Files you must NOT touch:** design tokens' colour values (a contrast failure means a wrong token was used somewhere; if a token itself fails, stop — see section 9).
- Env vars: none.

## 3. Design notes
- `helpers/axe.ts`: `export async function expectNoViolations(page: Page, name: string): Promise<void>` → `new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()`; on violations attach the JSON to the test report and fail with a list of `id — help — first target`.
- No rule is disabled globally. A single exclusion is allowed only with a comment naming the story that will remove it.
- `a11y.spec.ts`: sign in with a seeded user (helper `seedJourneyUser` that runs the minimum API calls: onboard, one housing option, one chat turn), then for each state below navigate, wait for the main heading, and call `expectNoViolations`:
  - Sign-in screen (signed out); legal pages (signed out).
  - Onboarding steps 1, 2 and 3; step 2 with validation errors showing.
  - Dashboard populated; dashboard with a reason expanded.
  - Plan: each of the four tabs.
  - Tasks: To do; Completed; add form open.
  - Housing: empty form; result with the risk banner; paste dialog open (step A and step C); compare table.
  - Places: populated; saved view.
  - Concierge: with history; empty.
  - Settings: pristine; with a field error.
  - Not-found page.
- Keyboard checks (same spec, desktop project): (1) from page load, the first Tab focuses "Skip to content" and Enter moves focus to `<main>`; (2) the whole onboarding can be completed with the keyboard only; (3) the paste dialog traps focus and Escape returns focus to its trigger; (4) after each route change `document.activeElement` is the screen's `<h1>`.
- Target size check: every `button`, `a[href]`, `input`, `[role=tab]`, `[role=radio]`, `[role=checkbox]` in the bottom tab bar and the task rows has a bounding box of at least 24×24 CSS px (WCAG 2.2 AA 2.5.8); the design aims for 44 px — assert 44 for bottom tabs and primary buttons.
- Reduced motion: with `page.emulateMedia({ reducedMotion: "reduce" })` assert that the skeleton and the regenerate icon have `animation-name: none`.
- Run on both Playwright projects (desktop and mobile widths) because layouts differ.

## 4. Steps
1. Helper and spec; run; collect violations.
2. Fix each violation in the component or screen that causes it.
3. Add the keyboard, target-size and reduced-motion checks.
4. Commit: `test(web): add accessibility checks to E2E (S-R1-090)`.

## 5. Acceptance criteria
- AC1: Given `pnpm e2e`, then `a11y.spec.ts` passes with zero violations for every listed state on both projects.
- AC2: Given the keyboard-only onboarding, then the dashboard is reached without any pointer action.
- AC3 (negative): Given the helper source, then no axe rule is disabled.
- AC4 (negative): Given a deliberately removed label on the rent input (local experiment), then the housing state fails with the rule id `label`.
- AC5: Given reduced motion, then the checked animations are off.

## 6. Tests to write
`apps/web/e2e/a11y.spec.ts` as described.

## 7. Verification commands
```bash
pnpm e2e                      # expected: smoke, core journey and a11y specs pass
pnpm typecheck && pnpm lint   # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A colour-contrast violation comes from a token pair that `07` §4 lists as passing: stop and report the measured ratio and the pair — the token table must be corrected by a design decision, not patched in a component.
- More than fifteen distinct violations appear: fix the five most severe, list the rest on the board with owning stories, and mark this story BLOCKED until they are zero.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Manual screen-reader audit and fixes (`S-R2-014`); zoom and text-spacing support (`S-R2-015`).
