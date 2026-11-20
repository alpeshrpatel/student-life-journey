# S-R0-025 — Add onboarding endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Onboarding |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-004, S-R0-014, S-R0-024 |
| Blocks | S-R0-027, S-R0-029, S-R1-017 |
| Executor tier | Tier-2 — contract, service and two routes |
| Platforms | backend |
| Parallel-safe with | S-R0-016 to S-R0-023, S-R0-026 |

## 1. Why
Saving the mover's five facts is the first half of the walking-skeleton slice.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (routes), §11; `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §5 ("a route handler does four things only").
- **Files to read first:** `apps/api/src/modules/relocation/ports.ts`, `apps/api/src/http/middleware/session.ts`, `apps/api/src/http/routes/me.ts`, `packages/contracts/src/me.ts`; `legacy/prototype/src/modules/relocation/onboarding-service.ts` (schema and flow to port).
- **Files to create:** `packages/contracts/src/relocation.ts`, `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/http/routes/relocation.ts`, `apps/api/test/onboarding.test.ts`.
- **Files to modify:** `packages/contracts/src/me.ts` (add `onboarded: z.boolean()`), `apps/api/src/http/routes/me.ts` (fill it), `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts` (add `onboarding: OnboardingService`), `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (methods `completeOnboarding`, `getRelocation`).
- **Files you must NOT touch:** repositories, migrations.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
const MoneyMinor = z.number().int().positive().max(100_000_000);
export const OnboardingRequestSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  arrivalDate: IsoDateSchema,
  arrivalTime: TimeOfDaySchema.nullable().default(null),
  monthlyBudgetMinor: MoneyMinor.nullable(),
  housingStatus: HousingStatusSchema,
  housingBudgetMinor: MoneyMinor.nullable(),
  transportPrefs: z.array(TransportPrefSchema).max(5).default(["PUBLIC_TRANSIT"]),
}).refine((v) => v.housingStatus !== "SEARCHING" || v.housingBudgetMinor !== null,
  { path: ["housingBudgetMinor"], message: "Required while searching" });
export const RelocationResponseSchema = z.object({
  origin: z.string(), destination: z.string(), arrivalDate: IsoDateSchema, arrivalTime: z.string().nullable(),
  monthlyBudgetMinor: z.number().int().nullable(), housingStatus: HousingStatusSchema,
  housingBudgetMinor: z.number().int().nullable(), transportPrefs: z.array(TransportPrefSchema),
  homeLabel: z.string().nullable(), currency: z.string().length(3), onboardingCompletedAt: IsoInstantSchema.nullable(),
});
```

- Service: `class OnboardingService { constructor(repo: RelocationRepository, clock: Clock); complete(userId, input): Promise<RelocationProfile>; isOnboarded(userId): Promise<boolean> }`. `complete` upserts with `onboardingCompletedAt = now` and stores `housingBudgetMinor` as `null` when the status is `SECURED`. Geo fields stay `null` in R0. Duplicate transport preferences are removed.
- Routes: `PUT /api/v1/onboarding` (body `OnboardingRequestSchema`, 200 → `RelocationResponseSchema`); `GET /api/v1/relocation` (200, or `ONBOARDING_REQUIRED` when no profile). `currency` is `"USD"` until S-R1-022.
- Request example: `{"origin":"Chicago","destination":"Phoenix","arrivalDate":"2026-11-16","arrivalTime":"15:40","monthlyBudgetMinor":240000,"housingStatus":"SEARCHING","housingBudgetMinor":125000,"transportPrefs":["PUBLIC_TRANSIT","RIDESHARE"]}`. Failure example: omitting `housingBudgetMinor` while searching → 422 with `details.issues[0].path` = `housingBudgetMinor`.
- Edge cases: repeating the PUT is idempotent; an arrival date in the past is accepted; whitespace-only cities are rejected.

## 4. Steps
1. Write the contract and export it.
2. Implement the service and routes; extend `/me`.
3. Add the two client methods.
4. Tests → pass.
5. Commit: `feat(api): add onboarding endpoint (S-R0-025)`.

## 5. Acceptance criteria
- AC1: Given a signed-in user, when the example body is PUT, then the response is 200, parses with the response schema, and `GET /api/v1/me` now returns `onboarded: true`.
- AC2: Given `housingStatus: "SECURED"` with a housing budget, when saved, then the stored `housingBudgetMinor` is `null`.
- AC3 (negative): Given `SEARCHING` without a housing budget, when PUT, then 422 naming `housingBudgetMinor`.
- AC4 (negative): Given no session, when PUT, then 401. Given user B, when `GET /api/v1/relocation` is called, then B never sees A's profile.
- AC5: Each route answers with `x-db-calls` ≤ 3.

## 6. Tests to write
`apps/api/test/onboarding.test.ts`: the five criteria plus "second PUT updates, does not duplicate".

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm --filter @slj/api-client test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A field seems to be missing from the contract (for example interests): it is deliberate (`02_PRODUCT_STRATEGY.md` §9, decision 3). Do not add it.

## 10. Rollback / undo note
`git revert`; no schema change.

## 11. Out of scope
Baseline plan creation (`S-R1-017`); geocoding (`S-R1-027`); age attestation (`S-R1-032`); `PATCH /relocation` (`S-R1-021`).
