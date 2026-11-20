# S-R1-072 — Build dashboard screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-020, S-R1-065, S-R1-067, S-R1-068, S-R1-069 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — the main screen with optimistic task completion |
| Platforms | web |
| Parallel-safe with | S-R1-071, S-R1-073 to S-R1-081 |

## 1. Why
Home answers "What should I do next?" in one glance: countdown, up to four ranked priorities and one next action (spec §3.4, §25.5–6).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3 (hierarchy, states, copy, accessibility — binding), §9 (wireframe "Home").
- **Files to read first:** `apps/web/src/screens/dashboard/{dashboard-screen.tsx,countdown-hero.tsx}`, `apps/web/src/lib/queries/use-dashboard.ts`, `apps/web/src/ui/{task-row.tsx,banner.tsx,state-block.tsx,toast.tsx}`, `packages/contracts/src/{dashboard.ts,tasks.ts}`; `legacy/prototype/src/app/(main)/dashboard/page.tsx`.
- **Files to create:** `apps/web/src/screens/dashboard/priority-list.tsx`, `apps/web/src/screens/dashboard/next-action-card.tsx`, `apps/web/src/lib/mutations/use-set-task-status.ts`, `apps/web/src/lib/mutations/use-set-task-status.test.tsx`.
- **Files to modify:** `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `countdown-hero.tsx` (three phase lines), `apps/web/src/i18n/locales/en/dashboard.json`, `apps/web/src/screens/dashboard/dashboard-screen.test.tsx`.
- **Files you must NOT touch:** API code, `ui/*`.
- Env vars: none.

## 3. Design notes
- Hero line by `journeyPhase` (i18n keys `dashboard:hero.*`, plural-aware): PRE_ARRIVAL "{n} days until you land in {destination}" (numeral = n); ARRIVAL_DAY "Today you land in {destination}" (numeral = 0 hidden, show the word "Today"); FIRST_WEEK and SETTLING "Day {k} in {destination}" where `k = 1 − daysUntilArrival`. The numeral and its line form one `<h1>`.
- Greeting eyebrow from `greetingKey(new Date())` and `greetingName`.
- Housing banner when `housingStatus === "SEARCHING"`: `Banner tone="urgent"` title "Housing not secured — evaluate your options", action link "Fix this" → `/housing`.
- `PriorityList`: heading "Top priorities" (`<h2>`), up to four `TaskRow`s built from `topPriorities` (`showPhase` off; meta shows priority, estimate, and the "why?" toggle); one row expanded at a time; the first row is expanded when router state has `justOnboarded`.
- `NextActionCard`: one solid accent block (`bg-accent text-on-accent`), eyebrow "Next", the `nextAction.title`, and a button-styled link by `screen`: housing → "Open Housing" (`/housing`), places → "Open Places" (`/places`), tasks → "Open Tasks" (`/tasks`). Hidden when `nextAction` is null.
- `useSetTaskStatus()` (shared with Tasks and Plan):

```ts
export function useSetTaskStatus(): UseMutationResult<Task, ApiClientError, { id: string; status: "OPEN" | "DONE" | "DISMISSED"; title: string }>;
```

  Optimistic update in `onMutate`: cancel queries for `["tasks"]`, `["dashboard"]`, `["plan"]`; snapshot them; update the cached task lists (set status) and remove the task from `dashboard.topPriorities` when completing; `onError` → restore the snapshots and toast "That didn't save. Try again."; `onSuccess` when completing → toast "Done" with action "Undo" (calls the mutation with `OPEN`); `onSettled` → `invalidate(client, "taskChanged")`.
- States (from `07` §2.3): loading skeleton (numeral block + three rows) via `QueryBoundary`; empty priorities → `StateBlock kind="empty"` "All caught up." / "Open the Plan tab for what's next in your journey."; error → "We couldn't load your plan." / "Check your connection and try again." + "Try again"; first time → toast "Your plan is ready." once (clear the router state after showing).
- The top-bar "N DAYS" tag and the sidebar arrival block (S-R0-030) keep working from the same query.
- Edge cases: `onboarded` user from R0 without tasks → empty state plus a link "Open your plan" (the plan route creates it); `greetingName` null → greeting without a name; very long destination wraps.

## 4. Steps
1. Mutation hook with optimistic logic and tests (mock client).
2. `PriorityList`, `NextActionCard`, hero lines, banner, states.
3. Screen tests → pass.
4. Commit: `feat(web): build dashboard screen (S-R1-072)`.

## 5. Acceptance criteria
- AC1: Given dashboard data with four priorities, then four rows render with accessible checkbox names "Complete: {title}" and the Next card links to the right screen.
- AC2: Given a row's checkbox is clicked, then the row disappears immediately (optimistic), a `PATCH` is sent, and the toast "Done" with "Undo" appears; pressing "Undo" sends a second `PATCH` with `OPEN`.
- AC3 (negative): Given the `PATCH` fails, then the row returns and the toast "That didn't save. Try again." appears.
- AC4: Given `journeyPhase: "ARRIVAL_DAY"`, then the heading reads "Today you land in Phoenix"; given `daysUntilArrival: -2`, then "Day 3 in Phoenix".
- AC5: Given `housingStatus: "SECURED"`, then no housing banner.
- AC6: Given the populated screen, then axe reports no violations and there is exactly one `<h1>`.

## 6. Tests to write
`use-set-task-status.test.tsx`: optimistic update, rollback, invalidation. `dashboard-screen.test.tsx`: AC1–AC6; "empty state"; "error state retry"; "first-time toast shows once".

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
- You are about to add Life Readiness or the My Life grid: stop — R2 (`S-R2-011`).
- You are about to add more than one solid accent block to the screen: stop — one per screen (`07` §5 rule).

## 10. Rollback / undo note
`git revert` restores the R0 dashboard.

## 11. Out of scope
Readiness (`S-R2-010`, `S-R2-011`); notifications bell (`S-R2-034`).
