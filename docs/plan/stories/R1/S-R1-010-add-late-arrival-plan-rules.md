# S-R1-010 — Add late-arrival plan rules

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-009 |
| Blocks | S-R1-017 |
| Executor tier | Tier-1 — one predicate and one transformation |
| Platforms | backend |
| Parallel-safe with | S-R1-011, S-R1-012 to S-R1-016 |

## 1. Why
Someone landing at 23:30 needs a shorter first night: get home, eat, sleep, do the rest tomorrow (spec §3.3 "late arrival"). Acceptance criterion spec §25.12 depends on it.

## 2. Context pack
- Relevant docs: spec §3.3; `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.4 (late-arrival note on the plan screen).
- **Files to read first:** `packages/domain/src/planning/build-baseline-plan.ts`, `packages/domain/src/planning/templates.ts`.
- **Files to create:** `packages/domain/src/planning/late-arrival.ts`, `packages/domain/src/planning/late-arrival.test.ts`.
- **Files to modify:** `packages/domain/src/planning/build-baseline-plan.ts` (call the transformation as the last step), `packages/domain/src/i18n/en.ts` (two messages), `packages/domain/src/index.ts`.
- **Files you must NOT touch:** template keys.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
export function isLateArrival(arrivalTime: string | null): boolean;      // "21:00"–"23:59" or "00:00"–"05:59"; null → false
/** Keys of FIRST_24_HOURS templates that stay on the arrival night. Everything else moves to the next morning. */
export const LATE_ARRIVAL_TONIGHT_KEYS: readonly string[];
export function applyLateArrival(draft: PlanDraft, input: BaselinePlanInput): PlanDraft;
```

- `LATE_ARRIVAL_TONIGHT_KEYS`: the `day0.*` keys for reach accommodation, confirm check-in, tell family or a trusted contact, get food and water, charge devices, save home address offline. Use the exact keys from `templates.ts`.
- `applyLateArrival` when `isLateArrival(input.arrivalTime)`:
  - `FIRST_24_HOURS` tasks not in the tonight list get `dueDate = addDays(arrivalDate, 1)` and their reason gains the suffix from message `plan.lateArrival.tomorrowSuffix` (" Do this tomorrow morning — you arrive late.").
  - The task for "get food and water" becomes `CRITICAL` (shops may be closed).
  - The summary gains message `plan.lateArrival.summarySuffix` (" You arrive late, so tonight is only the essentials.").
  - Keys, phases and `sortOrder` do not change (reconciliation relies on keys).
- When not late, the draft is returned unchanged (same reference is acceptable).
- Edge cases: `"05:59"` late, `"06:00"` not, `"20:59"` not, `"21:00"` late; arrival time `null`.

## 4. Steps
1. Tests for the predicate boundaries → implement.
2. Implement the transformation; call it at the end of `buildBaselinePlan`.
3. `pnpm --filter @slj/domain test` → pass (earlier builder tests still pass because their arrival time is 15:40).
4. Commit: `feat(domain): add late-arrival plan rules (S-R1-010)`.

## 5. Acceptance criteria
- AC1: Given arrival `2026-11-16` at `23:30`, then the pharmacy and grocery `day0` tasks are due `2026-11-17` and the six tonight tasks are due `2026-11-16`.
- AC2: Given a late arrival, then the food-and-water task is `CRITICAL` and the summary ends with the late-arrival sentence.
- AC3 (negative): Given arrival time `15:40` or `null`, then the draft equals the draft without this story's change.
- AC4 (negative): Given a late arrival, then no task key, phase or `sortOrder` differs from the normal draft.

## 6. Tests to write
`late-arrival.test.ts`: predicate table (six times); AC1–AC4.

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
- A key in the tonight list does not exist in `templates.ts`: stop and align with S-R1-008 (add a test that fails when a listed key is missing).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Showing the note in the UI (`S-R1-074`); real flight tracking (parked).
