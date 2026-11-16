# S-R1-020 — Rank dashboard priorities

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-007, S-R1-018 |
| Blocks | S-R1-047, S-R1-072 |
| Executor tier | Tier-2 — replaces a slice without breaking the R0 contract |
| Platforms | backend |
| Parallel-safe with | S-R1-019, S-R1-021 to S-R1-032, S-R1-033 to S-R1-046 |

## 1. Why
The R0 dashboard showed one computed priority. Now it shows the top four real tasks, ranked by the specifications, with a next action (spec §3.4, §25.5).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3; `docs/plan/03_ARCHITECTURE.md` §7.
- **Files to read first:** `apps/api/src/modules/planning/dashboard-service.ts`, `packages/contracts/src/dashboard.ts`, `packages/domain/src/tasks/priority/rank.ts`; `legacy/prototype/src/agents/shared/user-context.ts` (loader to replace; note defect D-05: its ordering was wrong).
- **Files to create:** `apps/api/src/modules/planning/user-context-service.ts`, `apps/api/test/dashboard-ranked.test.ts`.
- **Files to modify:** `apps/api/src/modules/planning/dashboard-service.ts`, `packages/contracts/src/dashboard.ts` (additive fields), `apps/api/src/composition/container.ts`, `packages/domain/src/index.ts` (remove the first-priority export), `apps/api/test/dashboard.test.ts` (update expectations).
- **Files to delete:** `packages/domain/src/priority/first-priority.ts`, `packages/domain/src/priority/first-priority.test.ts`.
- **Files you must NOT touch:** `apps/web/**` (the R0 screen keeps working because changes are additive).
- Env vars: none.

## 3. Design notes
- `UserContextService` is the single loader of "everything about this mover" (later reused by the AI layer, S-R1-045):

```ts
export interface UserSnapshot {
  user: SessionUser;
  relocation: RelocationProfile;
  locale: string; currency: string;                 // "en" / "USD" until S-R1-022
  today: IsoDate; daysUntilArrival: number;
  journey: JourneyPhaseState; lateArrival: boolean;
  openTasks: Task[]; doneCount: number;
  ranked: ScoredTask<Task>[];                       // all open tasks, ranked
}
export class UserContextService { load(user: SessionUser): Promise<UserSnapshot>; }   // throws OnboardingRequiredError
```

  One read batch: profile, open tasks, `count(*)` of DONE tasks. Ranking happens in memory over all open tasks (never `ORDER BY priority … LIMIT` in SQL).
- Contract additions to `DashboardResponseSchema`:

```ts
journeyPhase: JourneyPhaseSchema,
lateArrival: z.boolean(),
openTaskCount: z.number().int(), doneTaskCount: z.number().int(),
nextAction: z.object({ taskId: z.string(), title: z.string(), reason: z.string().nullable(), screen: z.enum(["housing", "places", "tasks"]) }).nullable(),
```

- `topPriorities` = first four of `ranked`, mapped with `id` = task id, `key` = `templateKey ?? id`.
- `nextAction` = the first ranked task; `screen`: category `HOUSING` while housing is `SEARCHING` → `"housing"`; template key starting with `day0.locate_` or `week.d6.` → `"places"`; otherwise `"tasks"`. `null` when there are no open tasks.
- A user with a profile and no tasks (onboarded in R0): `topPriorities` is empty and `nextAction` is `null`; the plan route creates the plan on first visit (S-R1-019).
- Edge cases: fewer than four open tasks; all tasks done; arrival in the past.

## 4. Steps
1. Implement `UserContextService`; refactor `DashboardService` to use it.
2. Extend the contract; delete the first-priority files and their export.
3. Update old tests; add new ones → pass. `pnpm --filter @slj/web typecheck` still passes.
4. Commit: `feat(api): rank dashboard priorities (S-R1-020)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user searching for housing 12 days out, then `topPriorities[0].key` is `before.housing.find`, it has a non-null `id`, and `nextAction.screen` is `"housing"`.
- AC2: Given that task completed, then it no longer appears and `doneTaskCount` is 1.
- AC3: Given all tasks done, then `topPriorities` is `[]` and `nextAction` is `null`.
- AC4 (negative): Given the repository after this story, when searching for `computeFirstPriority`, then there are no matches outside `legacy/` and `docs/`.
- AC5: `x-db-calls` ≤ 2.

## 6. Tests to write
`apps/api/test/dashboard-ranked.test.ts`: AC1–AC3, AC5; "at most four priorities"; "journeyPhase is ARRIVAL_DAY on the arrival date in the destination time zone".

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                                         # expected: pass
git grep -n "computeFirstPriority" -- apps packages ; echo "exit=$?"             # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Removing the old export breaks `apps/web`: stop — the web app must not import it (it reads priorities from the API); report what imports it.

## 10. Rollback / undo note
`git revert` restores the R0 behaviour.

## 11. Out of scope
The full dashboard screen (`S-R1-072`); readiness (`S-R2-010`).
