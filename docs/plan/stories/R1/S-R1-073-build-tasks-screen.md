# S-R1-073 — Build tasks screen

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-018, S-R1-065, S-R1-066, S-R1-067, S-R1-069, S-R1-072 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — list screen with grouping, filter and add form |
| Platforms | web |
| Parallel-safe with | S-R1-071, S-R1-074 to S-R1-081 |

## 1. Why
One place to see and manage every task, complete or reopen it, and add personal ones (spec §3.4, §25.6–7).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.5 (hierarchy, states, copy, accessibility — binding).
- **Files to read first:** `apps/web/src/ui/{task-row.tsx,segmented-control.tsx,state-block.tsx}`, `apps/web/src/lib/mutations/use-set-task-status.ts`, `apps/web/src/lib/query-keys.ts`, `packages/contracts/src/tasks.ts`, `apps/web/src/app/router.tsx`; `legacy/prototype/src/app/(main)/tasks/page.tsx`.
- **Files to create:** `apps/web/src/screens/tasks/tasks-screen.tsx`, `apps/web/src/screens/tasks/add-task-form.tsx`, `apps/web/src/lib/queries/use-tasks.ts`, `apps/web/src/lib/mutations/use-create-task.ts`, `apps/web/src/screens/tasks/tasks-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx` (replace the placeholder for `/tasks`), `apps/web/src/i18n/locales/en/tasks.json`.
- **Files you must NOT touch:** API code, `ui/*`.
- Env vars: none.

## 3. Design notes
- Data: `useTasks()` fetches **all** tasks once (`queryKeys.tasks()`), and the screen filters in memory: "To do" = `OPEN`; "Completed" = `DONE`. `DISMISSED` tasks are not shown.
- Header: `<h1>` "Tasks", counts "{open} open · {done} done", `Button` "Add task" (toggles the inline form and moves focus into it).
- `AddTaskForm`: one text input (visible placeholder "What needs doing?", screen-reader label "New task"), Save and Cancel; React Hook Form + `CreateTaskRequestSchema` (title 3–80 characters); submit via `useCreateTask()` with an `Idempotency-Key` header (`crypto.randomUUID()` generated when the form opens; a new key after each success). States: saving spinner on the button; success → form closes, toast "Task added"; error → inline "We couldn't add that. Try again." and the text stays; 429 → inline "You've added a lot of tasks today. Try again tomorrow."
- Filter: `SegmentedControl` (radio variant) "To do" / "Completed".
- Groups: one `<section>` per plan phase in order (Before arrival, First 24 hours, First 7 days, Ongoing) with an `<h2>` rule header and a count; phases **after** the journey's focus phase are collapsed by default behind a `<button aria-expanded>` ("Show 14 tasks"); the focus phase comes from `useDashboard().data.journeyPhase` (PRE_ARRIVAL → Before arrival, ARRIVAL_DAY → First 24 hours, FIRST_WEEK → First 7 days, SETTLING → Ongoing).
- Rows: `TaskRow` with `showPhase` off (the group already says it), `onToggleDone` → `useSetTaskStatus`. Completed rows show the reopen affordance through the same checkbox ("Reopen: {title}").
- States: loading → four skeleton rows; empty To do → "Nothing open — nice work."; empty Completed → "No completed tasks yet."; error → "We couldn't load your tasks." + "Try again".
- `useCreateTask` `onSettled` → `invalidate(client, "taskChanged")`.
- Edge cases: 60 or more tasks render without virtualisation (acceptable at this size); a newly added task appears in the focus phase group; focus returns to the "Add task" button after the form closes.

## 4. Steps
1. Hooks; add form; screen; route.
2. Tests → pass.
3. Commit: `feat(web): build tasks screen (S-R1-073)`.

## 5. Acceptance criteria
- AC1: Given tasks in three phases while the journey is PRE_ARRIVAL, then "Before arrival" is expanded and later phases are collapsed with their counts.
- AC2: Given "Add task" → typing "Buy a desk lamp" → Save, then a `POST /api/v1/tasks` with an `Idempotency-Key` header is sent, the form closes, the toast "Task added" shows and the task is listed.
- AC3: Given the Completed filter, when a row's checkbox is clicked, then a `PATCH` with `OPEN` is sent and the row leaves the list.
- AC4 (negative): Given a title of two characters, then a field error is shown and no request is sent.
- AC5 (negative): Given the list request failing, then the error block is shown and "Try again" refetches.
- AC6: Given the populated screen, then axe reports no violations; group headers are `<h2>`.

## 6. Tests to write
`tasks-screen.test.tsx`: AC1–AC6; "empty states per filter"; "429 on create shows the limit message".

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
- You are about to add due-date pickers, drag-and-drop ordering or categories to the add form: stop — parked.

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Deleting personal tasks from the UI (API exists; UI parked until asked for); offline queueing (`S-R2-004`).
