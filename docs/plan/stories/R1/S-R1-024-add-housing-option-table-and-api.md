# S-R1-024 — Add housing option table and API

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-003, S-R1-004, S-R1-016, S-R1-022 |
| Blocks | S-R1-025, S-R1-047, S-R1-078, S-R1-087 |
| Executor tier | Tier-2 — table, repository and four routes |
| Platforms | backend |
| Parallel-safe with | S-R1-017 to S-R1-021, S-R1-026 to S-R1-032, S-R1-033 to S-R1-046 |

## 1. Why
Movers compare two or three places they found themselves (spec §3.5 "compare options"). Options are the mover's own data; the product never supplies listings (spec §23).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §2 (`housing_option` — copy exactly); `docs/plan/03_ARCHITECTURE.md` §7.
- **Files to read first:** `packages/domain/src/housing/{types.ts,affordability.ts,risk-checklist.ts}`, `apps/api/src/http/routes/tasks.ts` (route style); `legacy/prototype/src/modules/housing/housing-service.ts`.
- **Files to create:** `packages/contracts/src/housing.ts`, `apps/api/src/infra/db/schema/housing.ts`, `apps/api/migrations/NNNN_housing_option.sql`, `apps/api/src/modules/housing/ports.ts`, `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/infra/db/repositories/housing-option-repository.ts`, `apps/api/src/http/routes/housing.ts`, `apps/api/test/housing-options.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (methods `listHousingOptions`, `saveHousingOption`, `updateHousingOption`, `archiveHousingOption`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
const CostBreakdownSchema = z.object({ totalMinor: z.number().int(), lines: z.array(z.object({ field: HousingFieldSchema, amountMinor: z.number().int() })) });
export const HousingEvaluationSchema = z.object({
  currency: z.string().length(3), monthly: CostBreakdownSchema, moveIn: CostBreakdownSchema,
  verdict: VerdictSchema, budgetUsedPct: z.number().int().nullable(), overByMinor: z.number().int().nullable(),
  flags: z.array(CostFlagSchema), riskKeys: z.array(RiskKeySchema), riskWarning: z.string().nullable(), rough: z.boolean(),
});
export const HousingOptionSchema = z.object({
  id: z.string(), label: z.string(), inputs: HousingInputsSchema, riskKeys: z.array(RiskKeySchema),
  inputSource: z.enum(["MANUAL", "PASTE"]), evaluation: HousingEvaluationSchema,
  createdAt: IsoInstantSchema, updatedAt: IsoInstantSchema,
});
export const HousingOptionListResponseSchema = z.object({ options: z.array(HousingOptionSchema), housingBudgetMinor: z.number().int().nullable() });
export const SaveHousingOptionRequestSchema = z.object({
  label: z.string().trim().min(1).max(80), inputs: HousingInputsSchema,
  riskKeys: z.array(RiskKeySchema).max(5).default([]), inputSource: z.enum(["MANUAL", "PASTE"]).default("MANUAL"),
});
export const UpdateHousingOptionRequestSchema = SaveHousingOptionRequestSchema.partial();
```

- Routes (`requireSession`; `POST` with `idempotent()`): `GET /api/v1/housing/options` (active options, newest first), `POST /api/v1/housing/options` → 201, `PATCH /api/v1/housing/options/{id}` → 200, `DELETE /api/v1/housing/options/{id}` → 204 (sets `archived_at`; rows are kept for the account's lifetime).
- `evaluation` in every response is computed **on read** with `evaluateHousing({ inputs, housingBudgetMinor, monthlyBudgetMinor, riskKeys })` using the profile's current budgets, so a budget change is reflected at once. The stored `monthly_total_minor`, `move_in_total_minor` and `verdict` columns are snapshots written on save for summaries.
- Limit of 10 active options: conditional insert `INSERT INTO housing_option (…) SELECT … WHERE (SELECT count(*) FROM housing_option WHERE user_id = ? AND archived_at IS NULL) < 10`; zero rows changed → 409 `CONFLICT` "You can keep up to 10 options. Remove one first."
- `inputs.currency` must equal the profile currency → otherwise 422.
- The listing text is never stored; only numbers, the label and the checklist.
- Edge cases: `SECURED` users may still save options; archived options never appear; another user's id → 404.

## 4. Steps
1. Contract; schema + migration (`--name housing_option`, add `CHECK` on `verdict` and `input_source`); repository; service; routes; client methods.
2. Tests → pass.
3. Commit: `feat(api): add housing option table and API (S-R1-024)`.

## 5. Acceptance criteria
- AC1: Given a housing budget of 125000 and a saved option totalling 134000 a month, then the listed option's `evaluation.verdict` is `TIGHT`; after the budget changes to 140000 (PATCH relocation), the same option lists as `COMPATIBLE`.
- AC2: Given ten active options, when an eleventh is posted, then 409 and still ten rows.
- AC3: Given `DELETE`, then the option disappears from the list and the row has `archived_at` set.
- AC4 (negative): Given user B, when B patches or deletes A's option, then 404.
- AC5 (negative): Given `inputs.currency: "EUR"` and profile currency `USD`, then 422.
- AC6: `x-db-calls` ≤ 3 on every route.

## 6. Tests to write
`apps/api/test/housing-options.test.ts`: AC1–AC6; "risk keys are stored and returned with the mandated warning"; "idempotent POST".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a field for a listing URL, address, landlord name or photo: stop — out of scope and a privacy risk.

## 10. Rollback / undo note
`git revert`; table stays.

## 11. Out of scope
Stateless evaluate route (`S-R1-025`); explanation and extraction (`S-R1-060`); compare UI (`S-R1-078`).
