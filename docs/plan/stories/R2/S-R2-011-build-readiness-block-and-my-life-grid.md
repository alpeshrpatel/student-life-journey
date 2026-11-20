# S-R2-011 — Build readiness block and My Life grid

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-010 |
| Blocks | S-R2-062 |
| Executor tier | Tier-2 — two dashboard blocks and one new primitive |
| Platforms | web |
| Parallel-safe with | S-R2-001 to S-R2-008, S-R2-012 to S-R2-062 |

## 1. Why
Seeing "Life readiness 34 — Survive" move after each completed task gives progress a shape, and the nine-category grid shows where the gaps are (vision §6, §32; design artboards "Home" in the supplied design).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3 (R2 additions: Life readiness, My Life grid; toast "Done · Life readiness 34"), §6 (`ProgressBar`), §3 (design-to-release map).
- **Files to read first:** `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `packages/contracts/src/dashboard.ts`, `apps/web/src/lib/mutations/use-set-task-status.ts`, `apps/web/src/lib/queries/use-config.ts`.
- **Files to create:** `apps/web/src/ui/progress-bar.tsx`, `apps/web/src/ui/progress-bar.test.tsx`, `apps/web/src/screens/dashboard/readiness-block.tsx`, `apps/web/src/screens/dashboard/my-life-grid.tsx`, `apps/web/src/screens/dashboard/readiness.test.tsx`.
- **Files to modify:** `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `apps/web/src/lib/mutations/use-set-task-status.ts` (toast text), `apps/web/src/i18n/locales/en/dashboard.json`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- `ProgressBar` props: `{ value: number /* 0–100 */; label: string; size?: "md" | "sm" /* 6 px, 3 px */; showValue?: boolean }` → `<div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>` with a `bg-track` rail and a `bg-accent` fill; square ends; width transition disabled under reduced motion.
- `ReadinessBlock` (below the Next card): `<h2>` "Life readiness"; the score as a numeral with "/ 100"; the stage word (`dashboard:stage.SURVIVE` "Survive", "Settle", "Discover", "Thrive") with a one-line meaning ("Survive — the essentials first."; "Settle — home, food and money are taking shape."; "Discover — the basics are in place; explore your area."; "Thrive — your routines are working."); a `ProgressBar`; a meta line "Based on your completed tasks. It is a planning aid, not a grade."
- `MyLifeGrid`: `<h2>` "My life"; a list of nine cells in the fixed category order with labels (`dashboard:category.*`: Travel, Housing, Connectivity, Food, Transportation, Money, Safety, Health, Daily living); each cell shows the label, "{done} of {total}" and a small `ProgressBar`; a category with no tasks shows "No tasks yet"; each cell is a link to `/tasks?category=<CATEGORY>` (the tasks screen filters its groups by category when the parameter is present — add that small filter and a "Showing {category} · Clear" chip there). Grid: two columns on mobile, three from 640 px.
- Render both blocks only when `flags.readinessEnabled` and `dashboard.readiness` is not null (treat a missing field from an old persisted cache as null).
- Toast after completing a task: when readiness is available, "Done · Life readiness {score}" using the score from the refetched dashboard (show "Done" immediately and update the text when the new score arrives within 3 seconds; otherwise leave "Done").
- No colour changes by score (no red/amber/green); the amber `urgent` colour is not used here.
- Accessibility: stage is text; each cell's link name is "{label}: {done} of {total} tasks done".
- Edge cases: score 0 with tasks → bar empty and the Survive text; score 100 → Thrive; long translated labels wrap inside cells.

## 4. Steps
1. `ProgressBar` with tests.
2. Blocks and the tasks category filter.
3. Toast update; tests.
4. Enable `readinessEnabled` in preview, check, then production (edit `FLAGS`, deploy) and note it on the board.
5. Commit: `feat(web): build readiness block and My Life grid (S-R2-011)`.

## 5. Acceptance criteria
- AC1: Given `readiness: { score: 34, stage: "SURVIVE", … }`, then the block shows "34", "Survive" and a progressbar with `aria-valuenow="34"`.
- AC2: Given nine categories, then nine cells render in the fixed order with "{done} of {total}" and links to the filtered tasks screen.
- AC3: Given a completed task and a refetched score of 38, then the toast reads "Done · Life readiness 38".
- AC4 (negative): Given `readiness: null` or the flag off, then neither block is rendered and the rest of the dashboard is unchanged.
- AC5 (negative): Given the two components' source, then no `urgent` token and no colour keyed to the score is used.
- AC6: Given the dashboard with both blocks, then axe reports no violations.

## 6. Tests to write
`progress-bar.test.tsx`: role and values; clamps outside 0–100. `readiness.test.tsx`: AC1–AC6; "category with no tasks".

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm e2e && pnpm size   # expected: pass
pnpm typecheck && pnpm lint                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add confetti, streaks, badges or a leaderboard: stop — refused.

## 10. Rollback / undo note
Flag off, or `git revert`.

## 11. Out of scope
Readiness trend chart; category detail pages (R4 agents own those domains).
