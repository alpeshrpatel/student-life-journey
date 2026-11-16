# S-R1-018 — Add tasks API

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-012, S-R1-016 |
| Blocks | S-R1-020, S-R1-073, S-R1-085, S-R1-087 |
| Executor tier | Tier-2 — four routes with ownership and conflict rules |
| Platforms | backend |
| Parallel-safe with | S-R1-017, S-R1-022 to S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
Movers complete, reopen, dismiss and add tasks (spec §3.4, §25.6–7). The spec's own API list lacked "reopen" (discrepancy M-11); one `PATCH` covers every state change.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (four task routes), §11 (error codes).
- **Files to read first:** `apps/api/src/http/routes/relocation.ts` (route style), `apps/api/src/modules/planning/ports.ts`, `apps/api/src/http/middleware/idempotency.ts`; `legacy/prototype/src/modules/tasks/task-service.ts`.
- **Files to create:** `packages/contracts/src/tasks.ts`, `apps/api/src/modules/planning/task-service.ts`, `apps/api/src/http/routes/tasks.ts`, `apps/api/test/tasks.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts` (add `tasks: TaskService`), `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (methods `listTasks`, `createTask`, `updateTask`, `deleteTask`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const TaskSchema = z.object({
  id: z.string(), title: z.string(), reason: z.string().nullable(),
  priority: PrioritySchema, phase: PlanPhaseSchema, dayIndex: z.number().int().min(1).max(7).nullable(),
  category: TaskCategorySchema, status: TaskStatusSchema, source: TaskSourceSchema,
  estimateMinutes: z.number().int().nullable(), dueDate: IsoDateSchema.nullable(),
  sortOrder: z.number().int(), completedAt: IsoInstantSchema.nullable(),
});
export const TaskListResponseSchema = z.object({ tasks: z.array(TaskSchema) });
export const TaskListQuerySchema = z.object({ status: TaskStatusSchema.optional() });
export const CreateTaskRequestSchema = z.object({
  title: z.string().trim().min(3).max(80),
  priority: PrioritySchema.default("MEDIUM"),
  category: TaskCategorySchema.default("DAILY_LIVING"),
  dueDate: IsoDateSchema.nullable().default(null),
});
export const UpdateTaskRequestSchema = z.object({
  status: TaskStatusSchema.optional(),
  title: z.string().trim().min(3).max(80).optional(),
}).refine((v) => v.status !== undefined || v.title !== undefined, { message: "Nothing to change" });
```

- Routes (all behind `requireSession`; `POST` also behind `idempotent()`):
  - `GET /api/v1/tasks?status=OPEN` → 200 `TaskListResponseSchema`.
  - `POST /api/v1/tasks` → 201 `TaskSchema`. New task: `source "USER"`, `status "OPEN"`, `templateKey null`, `reason null`, `phase` = `journeyPhaseFor(daysUntilArrival).focusPlanPhase`, `dayIndex` = `currentDayIndex(...)` only when that phase is `FIRST_7_DAYS` (otherwise `null`; if the phase is `FIRST_7_DAYS` and the index is `null`, use phase `ONGOING`), `sortOrder = 1_000_000 + floor((now − Date.UTC(2026,0,1)) / 1000)`.
  - `PATCH /api/v1/tasks/{id}` → 200 `TaskSchema`. `status` may move between any of the three values. `title` may change only on `USER` tasks; on other tasks respond 422 with message "Only your own tasks can be renamed".
  - `DELETE /api/v1/tasks/{id}` → 204. Only `USER` tasks; a `BASELINE` or `AI` task → 409 `CONFLICT` with message "Dismiss this task instead".
- Service rules: ownership is in every `WHERE`; zero affected rows → `NotFoundError`. A status change publishes `{ type: "TaskStatusChanged", userId, taskId, status }` in the same unit of work. The task-creating route needs a relocation profile → `OnboardingRequiredError` otherwise.
- `PATCH` flow: `findById` (1 call) → validate rules → commit (1 call) → respond with the merged object (no re-read).
- Example: `PATCH /api/v1/tasks/t_42 {"status":"DONE"}` → `{"id":"t_42","title":"Connect to internet","status":"DONE","completedAt":"2026-11-16T22:10:00.000Z",…}`.
- Edge cases: completing a task twice (second call returns 200, same state); unknown id and another user's id both → 404; title of 2 characters → 422.

## 4. Steps
1. Contract; service; routes; container; client methods.
2. Tests → pass.
3. Commit: `feat(api): add tasks API (S-R1-018)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user, when listing with `status=OPEN`, then only OPEN tasks are returned in `sortOrder`.
- AC2: Given an OPEN task, when patched to `DONE` and then to `OPEN`, then `completedAt` is set and then `null`, and two `TaskStatusChanged` events exist.
- AC3: Given `POST` with the same `Idempotency-Key` twice, then one task exists.
- AC4 (negative): Given user B and user A's task id, when B patches or deletes it, then 404 and the task is unchanged.
- AC5 (negative): Given a BASELINE task, when its title is patched → 422; when deleted → 409.
- AC6: `x-db-calls` ≤ 3 on every route.

## 6. Tests to write
`apps/api/test/tasks.test.ts`: AC1–AC6; "created task gets phase from the journey"; "not onboarded → 409 ONBOARDING_REQUIRED on create".

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You need a new error code: stop — use the codes in `03_ARCHITECTURE.md` §11.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Daily creation limit (`S-R1-023`); the tasks screen (`S-R1-073`); editing due dates or priority of existing tasks (parked).
