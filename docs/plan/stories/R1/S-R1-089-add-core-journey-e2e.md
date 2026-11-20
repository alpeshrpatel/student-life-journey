# S-R1-089 — Add core journey E2E

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-071, S-R1-072, S-R1-073, S-R1-074, S-R1-076, S-R1-077, S-R1-078, S-R1-079, S-R1-080, S-R1-081 |
| Blocks | S-R1-090 |
| Executor tier | Tier-3 — a long browser test that must stay stable |
| Platforms | web, backend |
| Parallel-safe with | S-R1-085 to S-R1-088, S-R1-091, S-R1-092 |

## 1. Why
The thirteen acceptance criteria of spec §25 describe one journey. One automated browser run proves that journey works end to end on every pull request.

## 2. Context pack
- Relevant docs: spec §25 (acceptance criteria 1–13); `docs/plan/02_PRODUCT_STRATEGY.md` §5 (MVP done criteria); `docs/plan/09_TEST_QA_OBSERVABILITY.md` (E2E section: one journey, no sleeps, role-based selectors).
- **Files to read first:** `apps/web/playwright.config.ts`, `apps/web/e2e/smoke.spec.ts`, `apps/web/e2e/helpers/session.ts`, `apps/api/src/http/routes/test-support.ts`.
- **Files to create:** `apps/web/e2e/core-journey.spec.ts`, `apps/web/e2e/helpers/journey.ts`.
- **Files to modify:** `apps/web/playwright.config.ts` (two projects: `chromium-desktop` 1280×800 and `chromium-mobile` using the `Pixel 7` device), `apps/api/package.json` (`dev:e2e` passes `--var FLAGS:…` so that `aiEnabled`, `conciergeEnabled`, `listingPasteEnabled` are true and `placesLiveEnabled` is false).
- **Files you must NOT touch:** application source — a failing step is a bug to report or fix in the owning story's files.
- Env vars: none new (chains default to `heuristic`; places use the demo provider; no network beyond localhost).

## 3. Design notes
- The run uses only deterministic parts: heuristic AI, demo places, demo geocoder. Sign-in uses `POST /api/test/session` with a unique email per test (`e2e-<timestamp>-<worker>@example.test`).
- One `test.describe.serial("core journey")` with `test.step` blocks (one per spec criterion), in this order:
  1. Sign in (test session) → land on onboarding.
  2. Onboard: Chicago → Phoenix (pick the autocomplete suggestion with the keyboard), arrival in 12 days at 15:40, budget 2400, searching, housing budget 1250, transit + rideshare, tick age → "Show my plan".
  3. Dashboard: heading contains "12 days until you land in Phoenix"; first priority is "Find housing"; housing banner visible; toast "Your plan is ready."
  4. Open the reason for the first priority → reason text visible.
  5. Plan: tabs present; "24 hours" shows 12 checklist items; "7 days" shows seven day items.
  6. Tasks: add "Buy a desk lamp" → appears; complete it → moves to Completed; reopen it → back in To do.
  7. Housing: enter rent 1100, utilities 90, internet 50, transportation 70, laundry 30 → "Run the numbers" → "Tight on your budget" (1,340 against 1,250), move-in total visible with the "assumed" tag on Deposit; tick "offer no written lease" and run again → the risk warning sentence is visible; "Save option" → appears in the switcher.
  8. Paste flow: open the dialog, paste a synthetic advert ("Rent $950/month. Security deposit $950. Application fee $40."), "Find the numbers" → three found fields with quotes → "Use these" → form filled → run → save as a second option → "Compare" shows a table and a recommendation sentence.
  9. Places: Grocery list shows demo rows and the demo banner; save one; switch to Pharmacy.
  10. Concierge: send "What should I do today?" → an assistant reply appears that mentions "Find housing"; send "Can you help with my visa interview?" → the out-of-scope reply.
  11. Settings: change housing status to "Already secured" → save → toast "Saved. Your plan is updating."
  12. Dashboard again: no housing banner; the first priority is no longer "Find housing".
  13. Settings: move the arrival date one day earlier → dashboard countdown reads "11 days".
  14. Sign out → `/signin`; visiting `/dashboard` redirects to `/signin`.
- Selector rules: `getByRole`, `getByLabel`, `getByText` only; no CSS or test-id selectors unless a role is impossible; no `waitForTimeout`; rely on web-first assertions with the default 5 s timeout (10 s for the first load).
- On the mobile project the same steps run through the bottom tabs; helper `nav(page, "Plan")` clicks the tab or the sidebar link depending on viewport.
- Failure artefacts: trace `on-first-retry`, screenshot `only-on-failure`, `retries: 1` in CI and 0 locally.
- Time budget: under 90 seconds per project locally.

## 4. Steps
1. Helper functions (`signInFresh`, `nav`, `fillMoney`).
2. Write the journey step by step, running `pnpm e2e --project=chromium-desktop` after each step.
3. Enable the mobile project; fix selectors that depend on layout.
4. Run the spec five times in a row (`--repeat-each=5`) → all green.
5. Commit: `test(web): add core journey E2E (S-R1-089)`.

## 5. Acceptance criteria
- AC1: Given `pnpm e2e`, then `core-journey.spec.ts` passes on both projects.
- AC2: Given `--repeat-each=5`, then all runs pass (no flakiness).
- AC3 (negative): Given the spec source, then it contains no `waitForTimeout` and no selector starting with `.` or `#`.
- AC4 (negative): Given the run, then no request leaves localhost (assert with `page.on("request")` collecting hosts and expecting only the local origin).
- AC5: Given a deliberate break (for example renaming the "Run the numbers" button locally), then the spec fails at the housing step with a readable step name.

## 6. Tests to write
`apps/web/e2e/core-journey.spec.ts` as described.

## 7. Verification commands
```bash
pnpm e2e                                                     # expected: smoke + core journey pass on two projects
pnpm --filter @slj/web exec playwright test core-journey --repeat-each=5   # expected: all pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A step fails because the product is wrong (not the test): record the criterion number on the board, fix it through the owning story's files if it is small, otherwise mark this story BLOCKED.
- The spec is flaky after two fixes of the same step: stop and report the trace; do not add sleeps or raise timeouts above 15 s.

## 10. Rollback / undo note
`git revert` (tests only).

## 11. Out of scope
Accessibility assertions (`S-R1-090`); mobile shells (`S-R3-036`); visual regression (parked).
