# S-R1-074 — Build plan screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-019, S-R1-059, S-R1-065, S-R1-066, S-R1-067, S-R1-069, S-R1-072 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — tabbed screen with three layouts |
| Platforms | web |
| Parallel-safe with | S-R1-071, S-R1-073, S-R1-075 to S-R1-081 |

## 1. Why
The plan shows the whole journey in four phases — before arrival, first 24 hours, first 7 days, ongoing — without overwhelming (spec §3.2–3.3, §25.3, §25.11–12).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.4 (hierarchy, states, copy, accessibility — binding), §9 (wireframe "Plan").
- **Files to read first:** `packages/contracts/src/plan.ts`, `apps/web/src/ui/{segmented-control.tsx,task-row.tsx,checkbox.tsx,state-block.tsx}`, `apps/web/src/lib/mutations/use-set-task-status.ts`; `legacy/prototype/src/app/(main)/plan/{page.tsx,plan-parts.tsx}`.
- **Files to create:** `apps/web/src/screens/plan/plan-screen.tsx`, `apps/web/src/screens/plan/plan-summary.tsx`, `apps/web/src/screens/plan/first-day-checklist.tsx`, `apps/web/src/screens/plan/first-week-grid.tsx`, `apps/web/src/lib/queries/use-plan.ts`, `apps/web/src/lib/mutations/use-regenerate-plan.ts`, `apps/web/src/i18n/locales/en/plan.json`, `apps/web/src/screens/plan/plan-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`.
- **Files you must NOT touch:** API code, `ui/*`.
- Env vars: none.

## 3. Design notes
- Header: `<h1>` "Your relocation plan" + `Button variant="secondary"` "Regenerate".
- `PlanSummary`: eyebrow "Summary · v{version}", the summary paragraph, meta "Based on your saved details" and, when `enhanced`, "Written with AI from your details".
- Phase tabs: `SegmentedControl variant="tabs"` with labels "Before", "24 hours", "7 days", "Ongoing"; default tab from `journeyPhase` (PRE_ARRIVAL → Before; ARRIVAL_DAY → 24 hours; FIRST_WEEK → 7 days; SETTLING → Ongoing); the selected tab is kept in the URL (`?phase=before`). Each panel is a `role="tabpanel"` with `aria-labelledby`.
- Panels (tasks filtered from `plan.tasks` by `phase`):
  - **Before:** line "{done} of {total} done · tap a task to see why it matters"; `TaskRow`s.
  - **24 hours:** arrival note — when `lateArrival` "You land late ({arrivalTime}). We've added a first-night plan." else "Daylight arrival ({arrivalTime}). Save your home address offline before you fly." (no time known → "Save your home address offline before you fly."); `FirstDayChecklist`: an ordered list (`<ol>`) of `Checkbox` items with the number, in two columns from 1024 px; footer "{done} of {total} checked".
  - **7 days:** `FirstWeekGrid`: a list of seven items; each has an `<h3>` "Day {n} · {theme}" (themes from `plan:days.*`: Survive, Home, Food, Mobility, Money, Neighbourhood, Life) and its `TaskRow`s (`dayIndex === n`); the cell for `currentDayIndex` carries a `Tag` "Today".
  - **Ongoing:** `TaskRow`s; meta shows no due date.
  - Footer line under every panel: "Your plan updates when your arrival date or housing status changes."
- Completing uses `useSetTaskStatus` (same optimistic behaviour as Home).
- `useRegeneratePlan()`: `POST /plan/regenerate`; while pending the button reads "Regenerating…" and is disabled (icon spins unless reduced motion); success → set the plan query data from the response, `invalidate(client, "planRegenerated")`, toast "Plan updated from your latest details."; 429 → toast "You've refreshed the plan a few times today. It will be available again tomorrow."; other errors → toast "We couldn't refresh the plan. Try again."
- Enhancement arrives asynchronously: refetch the plan once 8 seconds after a regenerate or a first visit when `enhanced` is false (one timed refetch, no polling loop).
- States: loading skeleton blocks; empty phase "Nothing here yet."; error "We couldn't load your plan." + "Try again".
- The arrival time comes from `useDashboard()` (already cached) to avoid another request.
- Edge cases: a task with `dayIndex` null in FIRST_7_DAYS (user-created) is listed under a last item "Any day"; DONE tasks stay visible in their phase with the done style.

## 4. Steps
1. Hooks; summary; three phase layouts; screen and route.
2. Tests → pass.
3. Commit: `feat(web): build plan screen (S-R1-074)`.

## 5. Acceptance criteria
- AC1: Given `journeyPhase: "PRE_ARRIVAL"`, then the "Before" tab is selected; ArrowRight moves to "24 hours" and shows the twelve-item checklist.
- AC2: Given `lateArrival: true`, then the late-arrival note with the arrival time is shown in the 24-hours panel.
- AC3: Given the 7-days panel, then seven day items with headings render and the item matching `currentDayIndex` has the "Today" tag.
- AC4: Given "Regenerate" pressed, then the button is disabled with "Regenerating…", one POST is sent, and the toast "Plan updated from your latest details." appears.
- AC5 (negative): Given a 429 response, then the limit toast appears and the plan stays as it was.
- AC6: Given `enhanced: true`, then "Written with AI from your details" is visible; given false, it is absent.
- AC7: Given each panel, then axe reports no violations and the tabs follow the WAI-ARIA pattern (roles and `aria-selected`).

## 6. Tests to write
`plan-screen.test.tsx`: AC1–AC7; "checking a checklist item sends a PATCH"; "empty phase text"; "error state".

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add plan editing (reordering, renaming baseline tasks, version history): stop — parked.

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Calendar export, sharing a plan (parked); offline behaviour (`S-R2-005`).
