# S-R1-003 — Add affordability verdict rules

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-002 |
| Blocks | S-R1-004, S-R1-024, S-R1-025 |
| Executor tier | Tier-2 — boundary conditions matter |
| Platforms | backend, web |
| Parallel-safe with | S-R1-005 to S-R1-016, S-R1-033 |

## 1. Why
The verdict (compatible, tight, over) is the answer the mover came for. It is code-only: the model may explain it but never decide it (spec §3.5, §23). The prototype's rule fell back to the whole monthly budget and used a different threshold (defect D-28).

## 2. Context pack
- Relevant docs: `docs/plan/02_PRODUCT_STRATEGY.md` §7 (decision "housing verdict"); `docs/plan/GLOSSARY.md` (Verdict, Cost flag).
- **Files to read first:** `packages/domain/src/housing/{types.ts,cost.ts,move-in.ts}`, `packages/domain/src/money/money.ts`; `legacy/prototype/src/tools/calculator/housing-calculator.ts` (`evaluateAffordability`, to see what changes).
- **Files to create:** `packages/domain/src/housing/affordability.ts`, `packages/domain/src/housing/affordability.test.ts`.
- **Files to modify:** `packages/domain/src/housing/types.ts` (add the schemas below), `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `cost.ts`, `move-in.ts`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
// types.ts (additions)
export const VerdictSchema = z.enum(["COMPATIBLE", "TIGHT", "OVER", "UNKNOWN"]);
export type Verdict = z.infer<typeof VerdictSchema>;
export const CostFlagSchema = z.enum(["DEPOSIT_OVER_TWO_RENTS", "UTILITIES_ZERO", "RENT_OVER_HALF_BUDGET", "HIGH_RECURRING_FEES", "MOVE_IN_OVER_THREE_BUDGETS"]);
export type CostFlag = z.infer<typeof CostFlagSchema>;
// affordability.ts
export interface AffordabilityInput { inputs: HousingInputs; housingBudgetMinor: number | null; monthlyBudgetMinor: number | null }
export interface Affordability {
  monthly: CostBreakdown; moveIn: CostBreakdown;
  verdict: Verdict;
  budgetUsedPct: number | null;      // monthly total as a whole percent of the housing budget
  overByMinor: number | null;        // monthly total − housing budget when positive, else null
  flags: CostFlag[];                 // in the order of the table below
}
export function assessAffordability(input: AffordabilityInput): Affordability;
```

- Verdict (integer math, `T` = monthly total, `B` = housing budget): `B` is `null` or `0` → `UNKNOWN`; `T <= B` → `COMPATIBLE`; `T * 100 <= B * 110` → `TIGHT`; otherwise `OVER`. The monthly (whole-life) budget is **never** used for the verdict.
- Flags:

| Flag | Condition |
|---|---|
| `DEPOSIT_OVER_TWO_RENTS` | `deposit > 2 * rent` and `rent > 0` |
| `UTILITIES_ZERO` | `utilities === 0` |
| `RENT_OVER_HALF_BUDGET` | `monthlyBudgetMinor` set and `rent * 2 > monthlyBudgetMinor` |
| `HIGH_RECURRING_FEES` | `rent > 0` and `recurringFees * 10 > rent` (more than 10% of rent) |
| `MOVE_IN_OVER_THREE_BUDGETS` | `B` set and move-in total `> 3 * B` |

- Edge cases: `T === B` → COMPATIBLE; `T` exactly 110% → TIGHT; 110% + 1 minor unit → OVER; rent 0 with a deposit → no deposit flag.

## 4. Steps
1. Add schemas; write the boundary tests; implement.
2. `pnpm --filter @slj/domain test` → pass.
3. Commit: `feat(domain): add affordability verdict rules (S-R1-003)`.

## 5. Acceptance criteria
- AC1: Given budget 125000 and monthly total 125000 → `COMPATIBLE`, `budgetUsedPct` 100, `overByMinor` null.
- AC2: Given budget 125000 and total 137500 → `TIGHT`; total 137501 → `OVER` with `overByMinor` 12501.
- AC3: Given no housing budget → `UNKNOWN`, `budgetUsedPct` null, and `MOVE_IN_OVER_THREE_BUDGETS` never fires.
- AC4 (negative): Given a monthly budget of 240000 and no housing budget, when rent is 100000, then the verdict is still `UNKNOWN` (no fallback to the monthly budget).

## 6. Tests to write
`affordability.test.ts`: one test per verdict boundary (AC1–AC3); one test per flag firing and not firing; "flags keep table order"; AC4.

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
- You are tempted to add a "safety score" or neighbourhood judgement: stop — out of scope and forbidden without a data source.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Risk checklist and warning text (`S-R1-004`); explanation text (`S-R1-053`).
