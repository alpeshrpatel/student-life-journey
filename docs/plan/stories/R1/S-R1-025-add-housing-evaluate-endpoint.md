# S-R1-025 — Add housing evaluate endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-003, S-R1-004, S-R1-024 |
| Blocks | S-R1-047, S-R1-060, S-R1-075, S-R1-085 |
| Executor tier | Tier-2 — one stateless route over domain functions |
| Platforms | backend |
| Parallel-safe with | S-R1-026 to S-R1-032, S-R1-033 to S-R1-046 |

## 1. Why
"Can I afford this place?" must be answerable without saving anything: type numbers, get costs, verdict and flags (spec §3.5, §25.8). The prototype had a second route that re-ran the same evaluation (defect D-13); there is one route here.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`POST /api/v1/housing/evaluate`, mapping note for `move-in-cost`).
- **Files to read first:** `packages/contracts/src/housing.ts`, `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/http/routes/housing.ts`.
- **Files to create:** `apps/api/test/housing-evaluate.test.ts`.
- **Files to modify:** `packages/contracts/src/housing.ts`, `apps/api/src/modules/housing/housing-service.ts` (add `evaluate`), `apps/api/src/http/routes/housing.ts`, `packages/api-client/src/client.ts` (method `evaluateHousing`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract additions (exact):

```ts
export const EvaluateHousingRequestSchema = z.object({
  inputs: HousingInputsSchema,
  riskKeys: z.array(RiskKeySchema).max(5).default([]),
});
export const HousingExplanationSchema = z.object({
  text: z.string(), tips: z.array(z.string()).max(4),
  source: z.enum(["template", "ai"]),
});
export const EvaluateHousingResponseSchema = z.object({
  evaluation: HousingEvaluationSchema,
  explanation: HousingExplanationSchema.nullable(),     // null until S-R1-060
});
```

- `HousingService.evaluate(user, body)`: load the relocation profile and the display profile (one batch) → `evaluateHousing({ inputs, housingBudgetMinor, monthlyBudgetMinor, riskKeys })` → `{ evaluation, explanation: null }`. No write.
- `inputs.currency` must equal the profile currency → 422 otherwise.
- No profile → `ONBOARDING_REQUIRED`.
- Example request: `{"inputs":{"currency":"USD","rent":110000,"utilities":9000,"internet":5000,"transportation":7000,"laundry":3000,"recurringFees":0,"deposit":110000,"applicationFee":5000,"connectivitySetup":4000,"furnitureSetup":30000,"initialGroceries":12000,"transportationSetup":6000},"riskKeys":["NO_WRITTEN_LEASE"]}` → `evaluation.monthly.totalMinor` 134000, `moveIn.totalMinor` 277000, `verdict` `"TIGHT"` (budget 125000), `riskWarning` the mandated sentence.
- Edge cases: `SECURED` user (no housing budget) → verdict `UNKNOWN`; all zeros → totals 0 and flag `UTILITIES_ZERO`.

## 4. Steps
1. Extend the contract, service, route and client.
2. Tests → pass.
3. Commit: `feat(api): add housing evaluate endpoint (S-R1-025)`.

## 5. Acceptance criteria
- AC1: Given the example request and a housing budget of 125000, then the response matches the numbers above.
- AC2: Given a risk key, then `riskWarning` equals `RISK_WARNING` and the verdict is unchanged by it.
- AC3 (negative): Given `rent: -1` or `rent: 10.5`, then 422 with the field path.
- AC4 (negative): Given the request, then no row is written to any table (`housing_option` count unchanged).
- AC5: `x-db-calls` ≤ 2.

## 6. Tests to write
`apps/api/test/housing-evaluate.test.ts`: AC1–AC5; "UNKNOWN without a housing budget"; "currency mismatch → 422".

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
- You are about to compute any number outside `@slj/domain`: stop — the route only passes values through.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Explanation text and listing extraction (`S-R1-060`); the form (`S-R1-075`).
