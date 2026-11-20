# S-R2-009 — Implement readiness score in domain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-005, S-R1-095 |
| Blocks | S-R2-010 |
| Executor tier | Tier-2 — weighted arithmetic with rounding rules |
| Platforms | backend, web |
| Parallel-safe with | S-R2-001 to S-R2-008, S-R2-012 to S-R2-062 |

## 1. Why
The vision document makes "Life Readiness" a must-have; the focused spec silently drops it (discrepancy M-09). The decision is to ship it in R2 as a simple, honest planning indicator computed from task completion — not a judgement of the person (`02_PRODUCT_STRATEGY.md` §7).

## 2. Context pack
- Relevant docs: vision §6 (stages Survive, Settle, Discover, Thrive), vision §32 (readiness idea); `docs/plan/GLOSSARY.md` (Readiness score, Lifecycle stage); `docs/plan/02_PRODUCT_STRATEGY.md` §7.
- **Files to read first:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/tasks/priority/rank.ts` (style).
- **Files to create:** `packages/domain/src/readiness/readiness.ts`, `packages/domain/src/readiness/readiness.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** other domain folders.
- Env vars: none.

## 3. Design notes
```ts
export const PRIORITY_WEIGHT: Record<Priority, number>;            // CRITICAL 4, HIGH 3, MEDIUM 2, LOW 1
export const CATEGORY_WEIGHT: Record<TaskCategory, number>;        // TRAVEL 15, HOUSING 20, CONNECTIVITY 10, FOOD 10, TRANSPORT 10, MONEY 10, SAFETY 10, HEALTH 5, DAILY_LIVING 10  (sum 100)
export const LifecycleStageSchema = z.enum(["SURVIVE", "SETTLE", "DISCOVER", "THRIVE"]);
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;
export interface CategoryReadiness { category: TaskCategory; percent: number | null; done: number; total: number }   // percent null when the category has no tasks
export interface Readiness { score: number; stage: LifecycleStage; categories: CategoryReadiness[] }               // categories in TaskCategorySchema order
export interface ReadinessTask { category: TaskCategory; priority: Priority; status: TaskStatus }
export function computeReadiness(tasks: readonly ReadinessTask[]): Readiness;
```

- Rules:
  - `DISMISSED` tasks are ignored completely.
  - Per category: `percent = round(100 × Σ weight(done tasks) / Σ weight(all counted tasks))`; `null` when there are no counted tasks.
  - Overall `score = round( Σ over categories with tasks (CATEGORY_WEIGHT × percent) / Σ CATEGORY_WEIGHT of those categories )` — categories without tasks do not pull the score down. No tasks at all → score 0.
  - Stage: score < 50 → `SURVIVE`; < 75 → `SETTLE`; < 90 → `DISCOVER`; else `THRIVE`.
  - Integer arithmetic until the final rounding; `Math.round` only.
- The score is monotonic: completing a task never lowers it; reopening never raises it (property-tested).
- No time component: the score says how much of the plan is done, not whether the mover is "late".
- Edge cases: all tasks done → 100 and `THRIVE`; only LOW tasks done in a category with a CRITICAL open task → low percent (weights matter).

## 4. Steps
1. Tests (table + property loop) → implement → export.
2. Commit: `feat(domain): implement readiness score (S-R2-009)`.

## 5. Acceptance criteria
- AC1: Given HOUSING tasks {CRITICAL open, HIGH done} and no others, then housing percent is 43 (3 of 7) and the score is 43, stage `SURVIVE`.
- AC2: Given two categories — HOUSING 100% and FOOD 0% — then the score is 67 (20×100 + 10×0 over 30), stage `SETTLE`.
- AC3: Given no tasks, then score 0, every category percent `null`.
- AC4: Given a random task list (fixed seed, 200 iterations), when one OPEN task is marked DONE, then the score does not decrease.
- AC5 (negative): Given DISMISSED tasks only, then the result equals the empty case.
- AC6: Given `CATEGORY_WEIGHT`, then the values sum to 100.

## 6. Tests to write
`readiness.test.ts`: AC1–AC6; stage boundaries at 49, 50, 74, 75, 89, 90.

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
- You are about to add streaks, points, badges or comparisons with other users: stop — refused (`14_PARKING_LOT.md`, refused list).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
API and UI (`S-R2-010`, `S-R2-011`).
