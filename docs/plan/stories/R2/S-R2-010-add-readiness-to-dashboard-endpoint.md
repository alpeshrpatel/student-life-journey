# S-R2-010 — Add readiness to dashboard endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-009 |
| Blocks | S-R2-011 |
| Executor tier | Tier-2 — additive contract change behind a flag |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-008, S-R2-012 to S-R2-062 |

## 1. Why
The dashboard needs the readiness score and the per-category percentages in the same response it already loads.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`GET /api/v1/dashboard`), §15 (flag `readinessEnabled`).
- **Files to read first:** `packages/contracts/src/dashboard.ts`, `apps/api/src/modules/planning/{dashboard-service.ts,user-context-service.ts}`, `apps/api/src/config/flags.ts`.
- **Files to create:** `apps/api/test/dashboard-readiness.test.ts`.
- **Files to modify:** `packages/contracts/src/dashboard.ts`, `apps/api/src/modules/planning/user-context-service.ts` (the snapshot must hold category, priority and status of **all** non-dismissed tasks, not only open ones), `apps/api/src/modules/planning/dashboard-service.ts`, `apps/api/test/contract/route-table.ts` (schema unchanged in name; verify strict parse still passes), `docs/api/openapi.json` (regenerate).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none (flag via `FLAGS`).

## 3. Design notes
- Contract addition (exact, additive):

```ts
readiness: z.object({
  score: z.number().int().min(0).max(100),
  stage: LifecycleStageSchema,
  categories: z.array(z.object({ category: TaskCategorySchema, percent: z.number().int().min(0).max(100).nullable(), done: z.number().int(), total: z.number().int() })),
}).nullable(),
```

- `readiness` is `null` when flag `readinessEnabled` is false or the user has no tasks.
- Snapshot change: replace the `count(*)` of DONE tasks by one query that returns `category, priority, status` for all tasks with status `OPEN` or `DONE` (three small columns; at most a few hundred rows) in the same read batch — the number of database calls does not change. `doneCount` is derived from it.
- `DashboardService`: `readiness = flags.readinessEnabled ? computeReadiness(rows) : null`.
- The client cache persisted from R1 may hold a response without `readiness`: the web hook must treat a missing field as `null` (handled in S-R2-011; mention it in the PR).
- `task_completed` analytics event is unchanged; add nothing.
- Edge cases: flag off → field present with `null` (never omitted); user with only dismissed tasks → `null`.

## 4. Steps
1. Contract; snapshot query; service; flag default `readinessEnabled: true` in dev and test, `false` in production until S-R2-011 ships (set through `FLAGS`).
2. Tests; regenerate OpenAPI.
3. Commit: `feat(api): add readiness to dashboard endpoint (S-R2-010)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user with two tasks done, then `readiness.score` equals `computeReadiness` over the same tasks and nine category entries are returned.
- AC2: Given the flag off, then `readiness` is `null` and the rest of the response is unchanged.
- AC3: Given a task completed through `PATCH`, then the next dashboard response has a higher or equal score.
- AC4: `x-db-calls` ≤ 2 (unchanged).
- AC5 (negative): Given user B, then B's readiness is computed only from B's tasks.

## 6. Tests to write
`apps/api/test/dashboard-readiness.test.ts`: AC1–AC5.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm openapi && git diff --stat docs/api/openapi.json   # expected: pass; one additive diff
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (OpenAPI file)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The contract test's strict parse fails for existing clients' expectations: the change must be additive only; if not, stop.

## 10. Rollback / undo note
Set `readinessEnabled` to false; or `git revert`.

## 11. Out of scope
UI (`S-R2-011`); readiness history over time (parked).
