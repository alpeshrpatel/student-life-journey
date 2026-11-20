# S-R0-027 — Add dashboard endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-025, S-R0-026 |
| Blocks | S-R0-030, S-R1-020 |
| Executor tier | Tier-2 — service combining repository data with domain functions |
| Platforms | backend |
| Parallel-safe with | S-R0-016 to S-R0-023, S-R0-028 |

## 1. Why
The dashboard answers "What should I do next?". In R0 it returns the countdown and one computed priority, completing the end-to-end slice on the server.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7; `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.3.
- **Files to read first:** `packages/domain/src/priority/first-priority.ts`, `packages/domain/src/time/dates.ts`, `apps/api/src/modules/relocation/ports.ts`, `apps/api/src/http/routes/relocation.ts`; `legacy/prototype/src/modules/tasks/dashboard-service.ts`.
- **Files to create:** `packages/contracts/src/dashboard.ts`, `apps/api/src/modules/planning/dashboard-service.ts`, `apps/api/src/http/routes/dashboard.ts`, `apps/api/test/dashboard.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (method `dashboard()`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract (exact; fields marked R1 are nullable now and filled later, so the change in R1 is additive):

```ts
export const DashboardPrioritySchema = z.object({
  id: z.string().nullable(),            // null in R0 (not a stored task yet)
  key: z.string(),
  title: z.string(), reason: z.string(),
  priority: PrioritySchema, category: TaskCategorySchema,
  estimateMinutes: z.number().int().nullable(),
});
export const DashboardResponseSchema = z.object({
  greetingName: z.string().nullable(),
  origin: z.string(), destination: z.string(),
  arrivalDate: IsoDateSchema, arrivalTime: z.string().nullable(),
  daysUntilArrival: z.number().int(),
  housingStatus: HousingStatusSchema,
  housingBudgetMinor: z.number().int().nullable(),
  currency: z.string().length(3),
  topPriorities: z.array(DashboardPrioritySchema).max(4),
});
```

- Service: `class DashboardService { constructor(relocation: RelocationRepository, clock: Clock); get(user: SessionUser): Promise<DashboardResponse> }`. It throws `OnboardingRequiredError` when no completed profile exists. `daysUntilArrival` uses `daysUntilArrival(arrivalDate, clock.now(), destinationTz)` (zone is `null` in R0, so UTC). `greetingName` is the first word of the user's name or `null`. `topPriorities` is `[computeFirstPriority(...)]` mapped with `id: null`, `estimateMinutes: null`.
- Route: `GET /api/v1/dashboard` behind `requireSession`.
- Example: `{"greetingName":"Alex","origin":"Chicago","destination":"Phoenix","arrivalDate":"2026-11-16","arrivalTime":"15:40","daysUntilArrival":12,"housingStatus":"SEARCHING","housingBudgetMinor":125000,"currency":"USD","topPriorities":[{"id":null,"key":"housing.find","title":"Find housing","reason":"You arrive in Phoenix in 12 days without secured housing — this blocks everything else.","priority":"CRITICAL","category":"HOUSING","estimateMinutes":null}]}`.
- Edge cases: not onboarded → 409 `ONBOARDING_REQUIRED`; name missing; arrival today.

## 4. Steps
1. Contract; service; route; container wiring; client method.
2. Tests with a fixed clock injected through a test container override (add `buildApp({ clock })` optional parameter if not present) → pass.
3. Commit: `feat(api): add dashboard endpoint (S-R0-027)`.

## 5. Acceptance criteria
- AC1: Given the example profile and a clock 12 days before arrival, when `GET /api/v1/dashboard` is called, then the body equals the example.
- AC2: Given a `SECURED` profile 5 days out, then the single priority key is `arrival.airport_transport`.
- AC3 (negative): Given a signed-in user without a profile, then 409 `ONBOARDING_REQUIRED`; given no session, then 401.
- AC4: `x-db-calls` ≤ 2.

## 6. Tests to write
`apps/api/test/dashboard.test.ts`: the four criteria.

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Injecting a clock requires changing more than `app.ts` and `container.ts`: stop and report.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Ranked tasks, next action, journey phase (`S-R1-020`); readiness (`S-R2-010`).
