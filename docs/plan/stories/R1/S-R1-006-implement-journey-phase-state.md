# S-R1-006 — Implement journey phase state

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-005 |
| Blocks | S-R1-007, S-R1-009, S-R2-035 |
| Executor tier | Tier-1 — four small classes and a factory |
| Platforms | backend, web |
| Parallel-safe with | S-R1-001 to S-R1-004, S-R1-008, S-R1-013, S-R1-033 |

## 1. Why
What matters depends on where the mover is in time. The prototype repeated `if (days > 0)` in services and screens. One State object per phase keeps that behaviour in one place (`03_ARCHITECTURE.md` §6).

## 2. Context pack
- Relevant docs: `docs/plan/GLOSSARY.md` (Journey phase); `docs/plan/03_ARCHITECTURE.md` §6 (pattern catalogue, State row).
- **Files to read first:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/time/dates.ts`.
- **Files to create:** `packages/domain/src/journey/phase.ts`, `packages/domain/src/journey/phase.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** other domain folders.
- Env vars: none.

## 3. Design notes
- Pattern: State. Public interface (exact):

```ts
export const JourneyPhaseSchema = z.enum(["PRE_ARRIVAL", "ARRIVAL_DAY", "FIRST_WEEK", "SETTLING"]);
export type JourneyPhase = z.infer<typeof JourneyPhaseSchema>;
export interface JourneyPhaseState {
  readonly phase: JourneyPhase;
  /** The plan phase the dashboard and plan screen open on. */
  readonly focusPlanPhase: PlanPhase;
  /** Points added by PhaseRelevanceSpec for a task in each plan phase. */
  relevance(taskPhase: PlanPhase): number;
  /** i18n key suffix for the hero line, e.g. "preArrival". */
  readonly heroKey: "preArrival" | "arrivalDay" | "firstWeek" | "settling";
}
export function journeyPhaseFor(daysUntilArrival: number): JourneyPhaseState;
/** 1–7 while the mover is in the themed first week, else null. Day 1 is the arrival date. */
export function currentDayIndex(daysUntilArrival: number): number | null;
```

- Mapping (GLOSSARY): `days > 0` → `PreArrival`; `0` → `ArrivalDay`; `−1 … −7` → `FirstWeek`; `< −7` → `Settling`.
- `focusPlanPhase`: PreArrival → `BEFORE_ARRIVAL`; ArrivalDay → `FIRST_24_HOURS`; FirstWeek → `FIRST_7_DAYS`; Settling → `ONGOING`.
- `relevance` table (rows = journey phase, columns = task plan phase):

| | BEFORE_ARRIVAL | FIRST_24_HOURS | FIRST_7_DAYS | ONGOING |
|---|---|---|---|---|
| PreArrival | 18 | 6 | 2 | 0 |
| ArrivalDay | 12 | 18 | 6 | 0 |
| FirstWeek | 8 | 14 | 18 | 4 |
| Settling | 4 | 6 | 10 | 12 |

  (Overdue earlier-phase tasks stay relevant, so they never drop to 0 after their phase.)
- `currentDayIndex(d)` = `1 − d` when that value is between 1 and 7, else `null` (`d = 0` → 1; `d = −6` → 7; `d = −7` → `null`).
- Implement the four states as frozen objects or classes in this one file; no `switch` on the phase outside this file (later stories call the state).

## 4. Steps
1. Tests for the mapping table and both functions → fail.
2. Implement → `pnpm --filter @slj/domain test` passes.
3. Commit: `feat(domain): implement journey phase state (S-R1-006)`.

## 5. Acceptance criteria
- AC1: Given days 12, 1 → `PRE_ARRIVAL`; 0 → `ARRIVAL_DAY`; −1, −7 → `FIRST_WEEK`; −8 → `SETTLING`.
- AC2: Given `journeyPhaseFor(0).relevance("FIRST_24_HOURS")`, then 18.
- AC3: Given `currentDayIndex(0)` → 1; `(-6)` → 7.
- AC4 (negative): Given `currentDayIndex(3)` or `(-7)`, then `null`.

## 6. Tests to write
`phase.test.ts`: boundary table for `journeyPhaseFor`; full `relevance` table (16 assertions via `it.each`); `currentDayIndex` cases; "focusPlanPhase per state".

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
- You need the current time inside this file: stop — callers pass `daysUntilArrival` computed with `daysUntilArrival()` from `time/dates.ts`.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Lifecycle stage Survive/Settle/Discover/Thrive (`S-R2-009`); reminders (`S-R2-035`).
