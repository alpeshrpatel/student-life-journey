# S-R1-044 — Define AI task schemas

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-004, S-R1-005, S-R1-033 |
| Blocks | S-R1-037, S-R1-049, S-R1-050, S-R1-052 to S-R1-054 |
| Executor tier | Tier-2 — schemas are the contract between the model and the code |
| Platforms | backend |
| Parallel-safe with | S-R1-034 to S-R1-036, S-R1-038 to S-R1-043, S-R1-045 to S-R1-048 |

## 1. Why
Raw model output never reaches the product: every structured task has a Zod schema, and nothing passes without validation (spec §23 "never let raw LLM output bypass Zod").

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §9 (copy the four schema blocks exactly, and the business-rules table).
- **Files to read first:** `packages/domain/src/tasks/types.ts`, `packages/domain/src/housing/{types.ts,risk-checklist.ts}`; `legacy/prototype/src/ai/schemas/{index.ts,relocation-plan.ts}`.
- **Files to create:** `packages/ai/src/schemas/index.ts`, `packages/ai/src/schemas/intent.ts`, `packages/ai/src/schemas/plan-enhancement.ts`, `packages/ai/src/schemas/housing-explanation.ts`, `packages/ai/src/schemas/listing-extraction.ts`, `packages/ai/src/schemas/schemas.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- The four schemas are exactly those in `05` §9: `IntentSchema`, `IntentClassificationSchema`, `PlanEnhancementSchema`, `HousingExplanationSchema`, `ListingExtractionSchema`. Import `PrioritySchema`, `PlanPhaseSchema`, `TaskCategorySchema`, `HousingFieldSchema`, `RiskKeySchema` from `@slj/domain`.
- Export inferred types: `Intent`, `IntentClassification`, `PlanEnhancement`, `HousingExplanation`, `ListingExtraction`.
- Design rules (keep them true):
  - `HousingExplanationSchema` has **no** verdict and no numeric field — the verdict and every number come from code.
  - `ListingExtractionSchema` carries `evidence` for every value so that S-R1-054 can verify it against the paste.
  - `PlanEnhancementSchema.extraTasks` is capped at 5; `reasons` refer to existing `templateKey`s only.
  - No schema contains a free-form `url`, `address`, `price` or `availability` field.
- All schemas must convert with `z.toJSONSchema(schema)` without throwing (needed for `response_format`), and must be "strict"-compatible: no `.transform()`, no `.refine()` at the top level; optional fields are allowed.
- Edge cases: unknown extra keys in model output are stripped by Zod's default object behaviour (do not use `.passthrough()`).

## 4. Steps
1. Create the files from `05` §9; export.
2. Tests → pass.
3. Commit: `feat(ai): define AI task schemas (S-R1-044)`.

## 5. Acceptance criteria
- AC1: Given each schema, when passed to `z.toJSONSchema`, then a JSON Schema object is produced.
- AC2: Given `{ explanation: "ok", tips: [], verdict: "COMPATIBLE" }`, when parsed with `HousingExplanationSchema`, then the result has no `verdict` key.
- AC3 (negative): Given six `extraTasks`, then `PlanEnhancementSchema` rejects.
- AC4 (negative): Given a listing field with `amount: -5` or `field: "parking"`, then `ListingExtractionSchema` rejects.
- AC5 (negative): Given `intent: "VISA_HELP"`, then `IntentClassificationSchema` rejects.

## 6. Tests to write
`schemas.test.ts`: AC1–AC5; one valid sample per schema.

## 7. Verification commands
```bash
pnpm --filter @slj/ai test       # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A schema in `05` §9 does not compile against the domain types: stop and report the mismatch; do not loosen the schema.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Business rules after Zod (`S-R1-052`, `S-R1-054`); prompts.
