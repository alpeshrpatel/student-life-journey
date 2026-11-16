# S-R1-002 — Port housing cost calculators

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | refactor |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-001 |
| Blocks | S-R1-003 |
| Executor tier | Tier-1 — port two sums to integer math with given tests |
| Platforms | backend, web |
| Parallel-safe with | S-R1-005, S-R1-006, S-R1-013, S-R1-033 |

## 1. Why
Monthly cost and move-in cost are the core of "can I afford this place" (spec §3.5). They must be deterministic code, never LLM output (spec §23).

## 2. Context pack
- Relevant docs: spec §3.5 (formulas); `docs/plan/15_CODEBASE_DISPOSITION.md` (row for `tools/calculator/housing-calculator.ts`, verdict REFACTOR).
- **Files to read first:** `legacy/prototype/src/tools/calculator/housing-calculator.ts`, `packages/domain/src/money/money.ts`.
- **Files to create:** `packages/domain/src/housing/types.ts`, `packages/domain/src/housing/cost.ts`, `packages/domain/src/housing/move-in.ts`, `packages/domain/src/housing/cost.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `legacy/**` (read only).
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
// housing/types.ts
export const MONTHLY_FIELDS = ["rent", "utilities", "internet", "transportation", "laundry", "recurringFees"] as const;
export const MOVE_IN_FIELDS = ["deposit", "applicationFee", "connectivitySetup", "furnitureSetup", "initialGroceries", "transportationSetup"] as const;
export const HousingFieldSchema = z.enum([...MONTHLY_FIELDS, ...MOVE_IN_FIELDS]);
export type HousingField = z.infer<typeof HousingFieldSchema>;
const minor = z.number().int().min(0).max(100_000_000_00);
export const HousingInputsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  rent: minor, utilities: minor, internet: minor, transportation: minor, laundry: minor, recurringFees: minor,
  deposit: minor, applicationFee: minor, connectivitySetup: minor, furnitureSetup: minor, initialGroceries: minor, transportationSetup: minor,
});                                             // every amount is in MINOR units
export type HousingInputs = z.infer<typeof HousingInputsSchema>;
export interface CostLine { field: HousingField; amountMinor: number }
export interface CostBreakdown { totalMinor: number; lines: CostLine[] }
// housing/cost.ts
export function monthlyCost(inputs: HousingInputs): CostBreakdown;   // lines in MONTHLY_FIELDS order
// housing/move-in.ts
export function moveInCost(inputs: HousingInputs): CostBreakdown;    // first line { field: "rent" } (first month), then MOVE_IN_FIELDS order
```

- Formulas (spec §3.5): monthly = rent + utilities + internet + transportation + laundry + recurring fees. Move-in = first month's rent + deposit + application fee + connectivity setup + furniture setup + initial groceries + transportation setup.
- Use `sumMinor` from the money module. Lines with amount 0 are kept (the UI decides what to hide).
- Edge cases: all zeros → totals 0; maximum values do not overflow `Number.MAX_SAFE_INTEGER`.

## 4. Steps
1. Create `types.ts`; write tests; implement both functions.
2. Export from `index.ts` → `pnpm --filter @slj/domain test` passes.
3. Commit: `refactor(domain): port housing cost calculators (S-R1-002)`.

## 5. Acceptance criteria
- AC1: Given rent 110000, utilities 9000, internet 5000, transportation 7000, laundry 3000, recurringFees 0 (USD), then `monthlyCost(...).totalMinor === 134000` with six lines in order.
- AC2: Given the same plus deposit 110000, applicationFee 5000, connectivitySetup 4000, furnitureSetup 30000, initialGroceries 12000, transportationSetup 6000, then `moveInCost(...).totalMinor === 277000` and the first line is rent.
- AC3 (negative): Given `HousingInputsSchema.parse` with `rent: 1100.5` or `rent: -1`, then it throws.

## 6. Tests to write
`packages/domain/src/housing/cost.test.ts`: "sums monthly fields in order"; "sums move-in with first month rent"; "all zeros"; "schema rejects fractions and negatives"; "schema rejects lower-case currency".

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
- The legacy calculator contains a cost category not listed above: do not add it; note it in the PR and continue.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Verdict and flags (`S-R1-003`); risk checklist (`S-R1-004`); any UI.
