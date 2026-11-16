# S-R0-026 — Compute first priority in domain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-004 |
| Blocks | S-R0-027 |
| Executor tier | Tier-1 — pure function with a rule table and test vectors |
| Platforms | backend, web |
| Parallel-safe with | S-R0-005 to S-R0-025 |

## 1. Why
The walking skeleton must show one priority computed from the mover's own answers. This is the thinnest slice of the priority engine; S-R1-020 replaces it with ranked tasks.

## 2. Context pack
- Relevant docs: `docs/plan/GLOSSARY.md` (Priority, Task category); spec §3.4.
- **Files to read first:** `packages/domain/src/relocation/types.ts`, `packages/domain/src/index.ts`; `legacy/prototype/src/ai/providers/heuristic/plan-builder.ts` (first rules of `buildPrioritiesAndTasks`).
- **Files to create:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/priority/first-priority.ts`, `packages/domain/src/priority/first-priority.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** everything outside `packages/domain`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
// tasks/types.ts
export const PrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type Priority = z.infer<typeof PrioritySchema>;
export const TaskCategorySchema = z.enum(["TRAVEL", "HOUSING", "CONNECTIVITY", "FOOD", "TRANSPORT", "MONEY", "SAFETY", "HEALTH", "DAILY_LIVING"]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;
// priority/first-priority.ts
export interface FirstPriorityInput { housingStatus: HousingStatus; daysUntilArrival: number; destination: string }
export interface PriorityItem { key: string; title: string; reason: string; priority: Priority; category: TaskCategory }
export function computeFirstPriority(input: FirstPriorityInput): PriorityItem;
```

- Rule table (first match wins):

| # | Condition | key | title | priority | category | reason |
|---|---|---|---|---|---|---|
| 1 | `SEARCHING` and days ≥ 0 | `housing.find` | Find housing | CRITICAL | HOUSING | "You arrive in {destination} in {n} day(s) without secured housing — this blocks everything else." (`n = 0` → "You arrive in {destination} today without secured housing — make this today's focus.") |
| 2 | `SEARCHING` and days < 0 | `housing.find` | Find housing | CRITICAL | HOUSING | "You are in {destination} without secured housing — make this today's focus." |
| 3 | `SECURED` and 0 ≤ days ≤ 14 | `arrival.airport_transport` | Arrange airport transportation | HIGH | TRAVEL | "Arrival is close — decide how you get from the airport to your new home." |
| 4 | `SECURED` and days > 14 | `housing.confirm_move_in` | Confirm move-in details and keys | HIGH | HOUSING | "Confirm entry instructions, keys and what is included to avoid arrival-day surprises." |
| 5 | `SECURED` and days < 0 | `places.find_essentials` | Find groceries and a pharmacy near home | MEDIUM | DAILY_LIVING | "Knowing where the basics are makes the first week easier." |

- "day(s)": singular when `n === 1`.
- Edge cases: `daysUntilArrival` of 0, 1, 14, 15, −1; destination with spaces.

## 4. Steps
1. Create `tasks/types.ts` and the function; export both from `index.ts`.
2. Tests → `pnpm --filter @slj/domain test` passes.
3. Commit: `feat(domain): compute first priority (S-R0-026)`.

## 5. Acceptance criteria
- AC1: Given `SEARCHING`, 12 days, "Phoenix", then key `housing.find`, priority `CRITICAL`, and the reason contains "Phoenix" and "12 days".
- AC2: Given `SECURED` and 14 days, then key `arrival.airport_transport`; with 15 days, then `housing.confirm_move_in`.
- AC3: Given `SECURED` and −3 days, then key `places.find_essentials`.
- AC4 (negative): Given `SEARCHING` and 1 day, then the reason says "1 day" (not "1 days").

## 6. Tests to write
`first-priority.test.ts`: one test per rule row and the singular case.

## 7. Verification commands
```bash
pnpm --filter @slj/domain test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated (no prices, no places invented)

## 9. Stop conditions
- None expected. If `tasks/types.ts` already exists, extend it instead of replacing it.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Full task types and ranking (`S-R1-005`, `S-R1-007`); translation of these strings (`S-R1-008`).
