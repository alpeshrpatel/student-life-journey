# S-R1-007 — Implement priority specifications

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-005, S-R1-006 |
| Blocks | S-R1-020 |
| Executor tier | Tier-2 — six rules with interactions; the prototype's version had an inverted rule |
| Platforms | backend, web |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-008, S-R1-013 to S-R1-016, S-R1-033 |

## 1. Why
The dashboard promises "what matters most right now" (spec §3.4). Ranking must be explainable and testable rule by rule. The prototype's `scoreTask` added points for arrival being far away (defect D-08).

## 2. Context pack
- Relevant docs: spec §3.4 (priority factors); `docs/plan/03_ARCHITECTURE.md` §6 (Specification row); `docs/plan/GLOSSARY.md` (Priority score, Top priorities).
- **Files to read first:** `legacy/prototype/src/modules/tasks/priority.ts`, `packages/domain/src/journey/phase.ts`, `packages/domain/src/tasks/types.ts`.
- **Files to create:** `packages/domain/src/tasks/priority/specifications.ts`, `packages/domain/src/tasks/priority/rank.ts`, `packages/domain/src/tasks/priority/specifications.test.ts`, `packages/domain/src/tasks/priority/rank.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/src/priority/first-priority.ts`.
- Env vars: none.

## 3. Design notes
- Pattern: Specification — each rule is an object that returns points for one task in one context.

```ts
// specifications.ts
export interface RankContext { daysUntilArrival: number; housingStatus: HousingStatus; today: string /* YYYY-MM-DD in destination zone */ }
export interface RankableTask { priority: Priority; phase: PlanPhase; category: TaskCategory; dueDate: string | null; sortOrder: number }
export interface PrioritySpec { readonly name: string; points(task: RankableTask, ctx: RankContext): number }
export const BASE_POINTS: Record<Priority, number>;      // CRITICAL 40, HIGH 30, MEDIUM 20, LOW 10
export const SafetySpec: PrioritySpec;
export const ArrivalDependencySpec: PrioritySpec;
export const DeadlineSpec: PrioritySpec;
export const FinancialImpactSpec: PrioritySpec;
export const HousingBlockerSpec: PrioritySpec;
export const PhaseRelevanceSpec: PrioritySpec;
export const DEFAULT_SPECS: readonly PrioritySpec[];     // the six above, in this order
// rank.ts
export interface ScoredTask<T> { task: T; score: number; breakdown: { name: string; points: number }[] }
export function scoreTask<T extends RankableTask>(task: T, ctx: RankContext, specs?: readonly PrioritySpec[]): ScoredTask<T>;
export function rankTasks<T extends RankableTask>(tasks: readonly T[], ctx: RankContext, limit?: number): ScoredTask<T>[];
```

- Score = `BASE_POINTS[priority]` + sum of spec points. Rules:

| Spec | Points |
|---|---|
| `SafetySpec` | +8 when category is `SAFETY` or `HEALTH` |
| `ArrivalDependencySpec` | For `BEFORE_ARRIVAL` tasks while `daysUntilArrival >= 0`: `clamp(14 − daysUntilArrival, 0, 14)` — closer arrival means more points (this fixes D-08). Otherwise 0 |
| `DeadlineSpec` | `dueDate` null → 0; overdue or due today → +20; due in 1–2 days → +15; due in 3–7 days → +8; later → 0 (`daysBetween(ctx.today, dueDate)`) |
| `FinancialImpactSpec` | +6 when category is `MONEY` or `HOUSING` |
| `HousingBlockerSpec` | +25 when `housingStatus` is `SEARCHING` and category is `HOUSING` |
| `PhaseRelevanceSpec` | `journeyPhaseFor(daysUntilArrival).relevance(task.phase)` |

- `rankTasks` sorts by score descending, then `PRIORITY_ORDER`, then `sortOrder` ascending (stable and deterministic); `limit` defaults to all.
- Only pass OPEN tasks; the function does not filter by status.
- Edge cases: empty list → `[]`; two tasks with equal score keep `sortOrder` order; arrival in the past (`days < 0`) gives 0 arrival points.

## 4. Steps
1. Write one test block per spec from the table → fail.
2. Implement specs, then `scoreTask` and `rankTasks`.
3. Add the scenario tests of section 6 → pass.
4. Commit: `feat(domain): implement priority specifications (S-R1-007)`.

## 5. Acceptance criteria
- AC1: Given a `BEFORE_ARRIVAL` task and `daysUntilArrival` 2, then `ArrivalDependencySpec` gives 12; with 30 days it gives 0.
- AC2: Given housing `SEARCHING`, 12 days out, tasks "Find housing" (CRITICAL, HOUSING, BEFORE_ARRIVAL) and "Buy bedding" (LOW, DAILY_LIVING, FIRST_7_DAYS), then "Find housing" ranks first and its breakdown contains `HousingBlockerSpec: 25`.
- AC3: Given a task due yesterday, then `DeadlineSpec` gives 20.
- AC4 (negative): Given two contexts that differ only in `daysUntilArrival` (3 vs 20), then a `BEFORE_ARRIVAL` task never scores lower at 3 days than at 20.

## 6. Tests to write
`specifications.test.ts`: every row of the table, both firing and not firing. `rank.test.ts`: AC2; "ties broken by priority then sortOrder"; "limit caps the result"; property-style loop for AC4 over days 0–30.

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
- A rule needs data that `RankContext` does not hold (for example weather or flight status): stop; it is out of scope.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Using the ranking in the dashboard (`S-R1-020`); user-tunable weights (parked).
