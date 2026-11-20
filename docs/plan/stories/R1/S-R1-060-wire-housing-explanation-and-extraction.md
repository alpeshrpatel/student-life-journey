# S-R1-060 — Wire housing explanation and extraction

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-025, S-R1-053, S-R1-054, S-R1-058 |
| Blocks | S-R1-076, S-R1-077 |
| Executor tier | Tier-2 — connects existing workflows to two routes |
| Platforms | backend |
| Parallel-safe with | S-R1-059, S-R1-065 to S-R1-070 |

## 1. Why
The evaluate route gains a plain-language explanation, and a new route turns pasted listing text into a pre-filled form (spec §3.5).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7, §13 (`extractions` 20 a day); `docs/plan/05_AI_ARCHITECTURE.md` §14.
- **Files to read first:** `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/http/routes/housing.ts`, `packages/contracts/src/housing.ts`, `apps/api/src/infra/ai/ai-wiring.ts`, `packages/ai/src/agents/housing-agent.ts`, `packages/ai/src/workflows/listing-extraction.ts`.
- **Files to create:** `apps/api/test/housing-ai.test.ts`.
- **Files to modify:** `packages/contracts/src/housing.ts`, `apps/api/src/modules/housing/housing-service.ts`, `apps/api/src/http/routes/housing.ts`, `packages/api-client/src/client.ts` (method `extractListing`).
- **Files you must NOT touch:** `packages/ai/**`, `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract additions (exact):

```ts
export const ExtractListingRequestSchema = z.object({ text: z.string().trim().min(20).max(6000) });
export const ExtractListingResponseSchema = z.object({
  label: z.string().nullable(),
  fields: z.array(z.object({ field: HousingFieldSchema, amountMinor: z.number().int().nonnegative(), evidence: z.string() })).max(12),
  riskSignals: z.array(z.object({ key: RiskKeySchema, evidence: z.string() })).max(5),
  source: z.enum(["ai", "regex"]),
});
```

- `POST /api/v1/housing/evaluate` (existing): after computing the evaluation, call `explainHousing({ evaluation, housingBudgetMinor, locale, budgetLevel })` and return `explanation: { text, tips, source }`. Level: `aiEnabled` false → `EXHAUSTED` (template); else `aiBudgetLevel(userId)`. Persist the call log and cost in `waitUntil` (one batch). The numbers and verdict in the response always come from the domain result, never from the explanation.
- Latency rule: the explanation call uses the CHEAP chain with its 8 s timeout. To keep the form snappy the route accepts query `?explain=0`, which skips the model and returns the template explanation immediately; the web app calls with `explain=0` first for instant numbers and may call again without it (S-R1-076 decides).
- `POST /api/v1/housing/extract`: flag `listingPasteEnabled` false → 404 `NOT_FOUND` (feature absent); `budget.enforce(userId, "extractions")`; `extractListing({ text, currency: profile.currency, locale, budgetLevel })`; map to the response. **The text is not stored and not logged** (log only its length and `injectionSuspected`).
- Extraction saves nothing; the client pre-fills the form and the mover confirms (S-R1-077).
- Edge cases: text of 19 characters → 422; 21st extraction today → 429 with `details.resetsAt`; model failure → `source: "regex"` with whatever was found (possibly empty `fields`, still 200).

## 4. Steps
1. Contract; service methods; route changes; client method.
2. Tests with `fakeProviderSet` → pass.
3. Commit: `feat(api): wire housing explanation and extraction (S-R1-060)`.

## 5. Acceptance criteria
- AC1: Given a scripted valid explanation, then the evaluate response has `explanation.source: "ai"` and the evaluation numbers are identical to the response with `?explain=0`.
- AC2: Given `?explain=0` or `aiEnabled: false`, then `explanation.source` is `"template"` and no provider is called.
- AC3: Given a pasted advert and a scripted extraction, then the response lists verified fields in minor units with evidence.
- AC4 (negative): Given `listingPasteEnabled: false`, then 404; given the 21st extraction today, then 429.
- AC5 (negative): Given the request logs captured during the test, then no log line contains a marker string placed in the pasted text.
- AC6: Given either route, then no `housing_option` row is written.

## 6. Tests to write
`apps/api/test/housing-ai.test.ts`: AC1–AC6; "explanation with an ungrounded number falls back to the template".

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
- The request logger records request bodies: stop and fix the logger first (bodies must never be logged).

## 10. Rollback / undo note
`git revert`, or switch `listingPasteEnabled` off.

## 11. Out of scope
UI (`S-R1-076`, `S-R1-077`); caching by evaluation hash (`S-R3-020`).
