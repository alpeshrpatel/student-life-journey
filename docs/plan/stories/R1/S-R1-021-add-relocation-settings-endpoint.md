# S-R1-021 — Add relocation settings endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Onboarding |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-017 |
| Blocks | S-R1-081 |
| Executor tier | Tier-2 — partial update that triggers plan reconciliation |
| Platforms | backend |
| Parallel-safe with | S-R1-018 to S-R1-020, S-R1-022 to S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
Flights move and leases get signed. Changing the arrival date or housing status must update the plan and the priorities immediately (spec §25.9–10).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`PATCH /api/v1/relocation`); spec §3.7.
- **Files to read first:** `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/modules/planning/plan-service.ts`, `packages/contracts/src/relocation.ts`; `legacy/prototype/src/modules/users/profile-service.ts`.
- **Files to create:** `apps/api/src/modules/relocation/relocation-service.ts`, `apps/api/test/relocation-update.test.ts`.
- **Files to modify:** `packages/contracts/src/relocation.ts` (add `UpdateRelocationRequestSchema`), `apps/api/src/http/routes/relocation.ts` (add `PATCH`), `apps/api/src/composition/container.ts`, `packages/api-client/src/client.ts` (method `updateRelocation`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const UpdateRelocationRequestSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  arrivalDate: IsoDateSchema,
  arrivalTime: TimeOfDaySchema.nullable(),
  monthlyBudgetMinor: MoneyMinor.nullable(),
  housingStatus: HousingStatusSchema,
  housingBudgetMinor: MoneyMinor.nullable(),
  transportPrefs: z.array(TransportPrefSchema).max(5),
  homeLabel: z.string().trim().max(80).nullable(),
}).partial().refine((v) => Object.keys(v).length > 0, { message: "Nothing to change" });
```

- `RelocationService.update(user, patch)`:
  1. Read batch: profile, all tasks, latest plan (1 call). No profile → `OnboardingRequiredError`.
  2. Merge; re-apply the rules of onboarding: `SECURED` clears `housingBudgetMinor`; `SEARCHING` requires a housing budget (422 on the merged result).
  3. `changed` = list of fields whose value differs. Nothing changed → return the profile without writing.
  4. `uow`: `stageUpsert`; if any of `destination`, `arrivalDate`, `arrivalTime`, `housingStatus`, `transportPrefs` changed → `plans.stageBaseline(uow, { trigger })` with trigger `"arrival_date_changed"` when the date or time changed, else `"housing_status_changed"` when the status changed, else `"profile_changed"`; always `events.publish(uow, { type: "RelocationChanged", userId, changed: [...] })` with the event's coarse values (`"arrivalDate"`, `"housingStatus"`, `"other"`).
  5. Commit; return `RelocationResponseSchema`.
- A changed `destination` clears `destinationLat`, `destinationLng`, `destinationTz`, `destinationCountryCode` (they are re-resolved by S-R1-031's handler when available).
- Budget-only changes do not rebuild the plan (budgets affect housing verdicts, which are computed on read).
- Edge cases: PATCH with identical values → no write, no event; switching to `SEARCHING` without a budget → 422 naming `housingBudgetMinor`.

## 4. Steps
1. Contract; service; route; client method.
2. Tests → pass.
3. Commit: `feat(api): add relocation settings endpoint (S-R1-021)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user, when `arrivalDate` moves by 3 days, then OPEN tasks' due dates move by 3 days, DONE tasks are unchanged, a new plan version exists with trigger `arrival_date_changed`, and the dashboard countdown changes.
- AC2: Given `housingStatus` changed to `SECURED`, then the find-housing task is dismissed and the dashboard's first priority is no longer housing search.
- AC3: Given only `monthlyBudgetMinor` changed, then no new plan version is written and one `RelocationChanged` event exists.
- AC4 (negative): Given identical values, then no rows change and no event is written.
- AC5 (negative): Given another user's session, then only that user's profile is ever read or written.
- AC6: `x-db-calls` ≤ 3.

## 6. Tests to write
`apps/api/test/relocation-update.test.ts`: AC1–AC6; "switching to SEARCHING without a budget → 422".

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
- You are about to store a full street address in `homeLabel`: stop — it is a coarse, user-typed label only (privacy rule in `06` §15).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Settings UI (`S-R1-081`); geocoding the destination (`S-R1-031`); display preferences (`S-R1-022`).
