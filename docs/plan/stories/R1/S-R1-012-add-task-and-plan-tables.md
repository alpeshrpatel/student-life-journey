# S-R1-012 — Add task and plan tables

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-005, S-R1-013 |
| Blocks | S-R1-017, S-R1-018, S-R1-045 |
| Executor tier | Tier-2 — schema, migration and two repositories with ownership filters |
| Platforms | backend |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-006 to S-R1-011, S-R1-033 |

## 1. Why
Tasks and plan versions need storage. These two tables carry the core loop.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (`plan`, `task` — copy the Drizzle code exactly), §6 (repository rules 1–8), §7 (indexes).
- **Files to read first:** `apps/api/src/infra/db/schema/relocation.ts`, `apps/api/src/infra/db/repositories/relocation-repository.ts`, `apps/api/src/infra/db/unit-of-work.ts`, `apps/api/test/helpers/db.ts`.
- **Files to create:** `apps/api/src/infra/db/schema/planning.ts`, `apps/api/migrations/NNNN_task_and_plan.sql` (generated), `apps/api/src/modules/planning/ports.ts`, `apps/api/src/infra/db/repositories/task-repository.ts`, `apps/api/src/infra/db/repositories/plan-repository.ts`, `apps/api/test/task-repository.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts` (add `taskRepo`, `planRepo`), `apps/api/test/helpers/db.ts` (add `aTask(overrides)` and `aPlan(overrides)` builders).
- **Files you must NOT touch:** existing migration files.
- Env vars: none.

## 3. Design notes
- Ports (exact):

```ts
// modules/planning/ports.ts
export interface TaskRepository {
  listByUser(userId: string, filter?: { status?: TaskStatus }): Promise<Task[]>;   // ordered by sortOrder, then createdAt
  findById(userId: string, taskId: string): Promise<Task | null>;
  insertMany(uow: UnitOfWork, tasks: NewTask[]): void;                             // chunked: ≤ 100 bound parameters per statement (5 rows of 17 columns)
  update(uow: UnitOfWork, userId: string, taskId: string, patch: Partial<Pick<Task, "title" | "reason" | "priority" | "phase" | "dayIndex" | "category" | "estimateMinutes" | "dueDate" | "sortOrder">>, now: number): void;
  setStatus(uow: UnitOfWork, userId: string, taskId: string, status: TaskStatus, now: number): void; // completedAt = now when DONE, null otherwise
  dismissMany(uow: UnitOfWork, userId: string, taskIds: string[], now: number): void;
  deleteUserTask(uow: UnitOfWork, userId: string, taskId: string): void;           // WHERE source = 'USER'
}
export interface PlanRecord { id: string; userId: string; version: number; summary: string; generatedBy: string; trigger: PlanTrigger; contextHash: string; createdAt: number }
export type PlanTrigger = "onboarding" | "manual" | "arrival_date_changed" | "housing_status_changed" | "profile_changed" | "enhancement";
export interface PlanRepository {
  latest(userId: string): Promise<PlanRecord | null>;
  insert(uow: UnitOfWork, plan: PlanRecord): void;
  pruneOld(uow: UnitOfWork, userId: string, keep: number): void;                   // deletes versions <= (max − keep)
}
```

- Every statement filters by `user_id`. `setStatus` and `update` put ownership in the `WHERE` clause; callers check the affected-row count from `commit()` and throw `NotFoundError` on 0.
- Add `CHECK` constraints by hand to the generated SQL for `priority`, `phase`, `category`, `status`, `source` and `day_index BETWEEN 1 AND 7` (see `06` §3 last paragraph).
- Generate: `pnpm --filter @slj/api db:generate -- --name task_and_plan`.
- Edge cases: inserting 60 tasks produces 12 statements in one batch; `(user_id, template_key)` uniqueness with `NULL` keys (user tasks) allows many rows.

## 4. Steps
1. Add the schema file exactly as in `06` §2; export it from `schema/index.ts`.
2. Generate the migration; add the `CHECK` constraints; `pnpm --filter @slj/api db:migrate:local` → applies.
3. Implement both repositories; wire them in the container; add the builders.
4. Tests → `pnpm --filter @slj/api test` passes.
5. Commit: `feat(api): add task and plan tables (S-R1-012)`.

## 5. Acceptance criteria
- AC1: Given 60 new tasks, when inserted through one unit of work, then all 60 exist and the commit used one database call.
- AC2: Given user A's task, when user B calls `findById`, then the result is `null`; when B calls `setStatus` and commits, then zero rows change.
- AC3: Given a DONE status, then `completedAt` is set; given OPEN again, then it is `null`.
- AC4 (negative): Given two tasks with the same `(userId, templateKey)`, when inserted, then the commit rejects and neither row exists.
- AC5 (negative): Given `deleteUserTask` on a BASELINE task, then zero rows are deleted.

## 6. Tests to write
`apps/api/test/task-repository.test.ts`: AC1–AC5; "listByUser filters by status and orders by sortOrder"; "pruneOld keeps the newest N versions".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local   # expected: migration applied
pnpm --filter @slj/api test               # expected: pass
pnpm typecheck && pnpm lint               # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- drizzle-kit wants to alter or drop an existing table: stop; the schema file differs from an earlier migration.
- A statement needs more than 100 bound parameters: reduce the chunk size; never raise the limit.

## 10. Rollback / undo note
Before deploy: `git revert` and delete the local D1 state (`rm -rf apps/api/.wrangler/state`). After deploy: forward-only — add a new migration; do not edit this one.

## 11. Out of scope
Services and routes (`S-R1-017` to `S-R1-019`).
