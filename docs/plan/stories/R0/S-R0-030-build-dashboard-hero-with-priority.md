# S-R0-030 — Build dashboard hero with priority

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-027, S-R0-028 |
| Blocks | S-R0-034, S-R1-072 |
| Executor tier | Tier-2 — first data-driven screen with all states |
| Platforms | web |
| Parallel-safe with | S-R0-029, S-R0-031 to S-R0-033 |

## 1. Why
This screen is the visible end of the walking skeleton: the mover sees their countdown and the one thing to do first.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3 (hierarchy, states, copy), §3 (R0 scope: hero and one read-only priority), §9 (wireframe).
- **Files to read first:** `packages/contracts/src/dashboard.ts`, `apps/web/src/app/app-shell.tsx`, `apps/web/src/lib/format.ts`, `apps/web/src/lib/api.ts`.
- **Files to create:** `apps/web/src/lib/queries/use-dashboard.ts`, `apps/web/src/screens/dashboard/dashboard-screen.tsx`, `apps/web/src/screens/dashboard/countdown-hero.tsx`, `apps/web/src/i18n/locales/en/dashboard.json`, `apps/web/src/screens/dashboard/dashboard-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`, `apps/web/src/app/app-shell.tsx` (fill `topBarEnd` with the "N DAYS" tag and `sidebarFooter` with the arrival block, both from `useDashboard()`).
- **Files you must NOT touch:** `apps/api/**`, `packages/**`.
- Env vars: none.

## 3. Design notes
- Hook: `export function useDashboard() { return useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard() }); }`.
- `CountdownHero` props: `{ greetingName: string | null; daysUntilArrival: number; destination: string; origin: string; arrivalDate: string; arrivalTime: string | null }`. It renders one `<h1>` whose accessible text is the full sentence. Copy keys: `hero.before` "{{count}} days until you land in {{city}}" (with `_one`), `hero.today` "Today you land in {{city}}", `hero.after` "Day {{count}} in {{city}}" (count = `-daysUntilArrival`). The numeral is `text-hero lg:text-hero-lg font-extrabold text-accent`.
- Priority block in R0: section header "Top priorities" over a 2 px rule; one row with a square priority marker (inline for now; the component arrives in S-R1-067), title, meta line with the translated priority word, and the reason text shown expanded. No checkbox in R0.
- States: loading (skeleton blocks: numeral, two lines, one row), populated, empty priorities ("All caught up." / "Open the Plan tab for what's next in your journey."), error ("We couldn't load your plan." / "Check your connection and try again." + Try again → `refetch()`), `ONBOARDING_REQUIRED` → `<Navigate to="/onboarding" />`.
- Edge cases: `greetingName` null (no comma, no name); 1 day (singular); arrival today; arrived 3 days ago.

## 4. Steps
1. Locale file and hook; hero component; screen with states; route.
2. Fill the shell slots.
3. Tests with a fake `api.dashboard` → pass.
4. Manual: sign in, onboard, see the dashboard with your own data.
5. Commit: `feat(web): build dashboard hero with priority (S-R0-030)`.

## 5. Acceptance criteria
- AC1: Given dashboard data with 12 days and "Phoenix", when rendered, then the `h1` reads "12 days until you land in Phoenix" and the priority row shows "Find housing" with the word "Critical" and its reason.
- AC2: Given the query is pending, when rendered, then skeletons are shown and no text from the populated state.
- AC3 (negative): Given the query fails with `INTERNAL`, when rendered, then the error copy and a "Try again" button are shown; clicking it refetches.
- AC4: Given `daysUntilArrival` of 0 and −3, when rendered, then the headings are "Today you land in Phoenix" and "Day 3 in Phoenix".
- AC5: Given empty `topPriorities`, then the empty copy is shown.

## 6. Tests to write
`dashboard-screen.test.tsx`: the five criteria.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck && pnpm build   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (states: loading, populated, empty, error)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The design shows blocks that are not in R0 (housing banner, Next card, readiness, My Life): do not build them (`07_UX_DESIGN_SYSTEM.md` §3).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Task completion, reason toggle, Next card, housing banner (`S-R1-072`).
