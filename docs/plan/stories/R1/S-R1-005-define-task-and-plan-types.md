# S-R1-005 — Define task and plan types

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-004 |
| Blocks | S-R1-006, S-R1-007, S-R1-008, S-R1-012, S-R2-009 |
| Executor tier | Tier-1 — type and schema definitions |
| Platforms | backend, web |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-013, S-R1-033 |

## 1. Why
"Everything actionable is a task" (`02_PRODUCT_STRATEGY.md` §7). Every later story (templates, ranking, tables, API, screens) shares these types. The prototype's categories were inconsistent (defect D-18).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (`task`, `plan` columns); `docs/plan/GLOSSARY.md` (Task, Plan phase, Template key).
- **Files to read first:** `packages/domain/src/tasks/types.ts` (from S-R0-026), `legacy/prototype/src/ai/schemas/relocation-plan.ts`, `legacy/prototype/src/shared/types.ts`.
- **Files to create:** `packages/domain/src/tasks/types.test.ts`.
- **Files to modify:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/src/priority/first-priority.ts` (removed later by S-R1-020).
- Env vars: none.

## 3. Design notes
- Keep `PrioritySchema` and `TaskCategorySchema` as they are. Add (exact):

```ts
export const PlanPhaseSchema = z.enum(["BEFORE_ARRIVAL", "FIRST_24_HOURS", "FIRST_7_DAYS", "ONGOING"]);
export type PlanPhase = z.infer<typeof PlanPhaseSchema>;
export const TaskStatusSchema = z.enum(["OPEN", "DONE", "DISMISSED"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export const TaskSourceSchema = z.enum(["BASELINE", "AI", "USER"]);
export type TaskSource = z.infer<typeof TaskSourceSchema>;

export interface Task {
  id: string; userId: string;
  title: string; reason: string | null;
  priority: Priority; phase: PlanPhase; dayIndex: number | null;   // 1–7 only when phase is FIRST_7_DAYS
  category: TaskCategory; status: TaskStatus; source: TaskSource;
  templateKey: string | null;                                      // set for BASELINE and AI tasks, null for USER tasks
  estimateMinutes: number | null; dueDate: string | null;          // YYYY-MM-DD
  sortOrder: number; completedAt: number | null; createdAt: number; updatedAt: number;
}
export type NewTask = Omit<Task, "completedAt">;
export interface PlanTaskDraft {
  templateKey: string; title: string; reason: string;
  priority: Priority; phase: PlanPhase; dayIndex: number | null;
  category: TaskCategory; estimateMinutes: number | null; dueDate: string | null; sortOrder: number;
}
export interface PlanDraft { summary: string; tasks: PlanTaskDraft[] }
export interface TaskSummary { id: string; title: string; reason: string | null; priority: Priority; phase: PlanPhase; category: TaskCategory; dueDate: string | null; score?: number }
export function isValidDayIndex(phase: PlanPhase, dayIndex: number | null): boolean;   // FIRST_7_DAYS ⇒ 1..7; other phases ⇒ null
export const PRIORITY_ORDER: Record<Priority, number>;   // CRITICAL 0, HIGH 1, MEDIUM 2, LOW 3
```

- Category mapping from the prototype (for porting stories): `MOBILITY` → `TRANSPORT`; `SETUP` → `DAILY_LIVING`; `STUDY_SPOTS` and anything academic are dropped (defect D-22).
- No Zod schema for `Task` here: the API shape is `TaskSchema` in `packages/contracts/src/tasks.ts` (S-R1-018).

## 4. Steps
1. Add the definitions; add `isValidDayIndex` tests.
2. `pnpm --filter @slj/domain test && pnpm typecheck` → pass.
3. Commit: `feat(domain): define task and plan types (S-R1-005)`.

## 5. Acceptance criteria
- AC1: Given `isValidDayIndex("FIRST_7_DAYS", 3)` → `true`; `("FIRST_7_DAYS", null)` → `false`; `("ONGOING", null)` → `true`.
- AC2: Given `import { PlanPhaseSchema, TaskStatusSchema } from "@slj/domain"`, then both resolve.
- AC3 (negative): Given `isValidDayIndex("FIRST_7_DAYS", 8)` or `("BEFORE_ARRIVAL", 1)` → `false`.

## 6. Tests to write
`packages/domain/src/tasks/types.test.ts`: the three AC cases; "PRIORITY_ORDER sorts CRITICAL first".

## 7. Verification commands
```bash
pnpm --filter @slj/domain test   # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- An existing export from S-R0-026 would have to change shape: stop and report — `apps/api` and `apps/web` already use it.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Tables (`S-R1-012`); API contracts (`S-R1-018`); journey phase (`S-R1-006`).
