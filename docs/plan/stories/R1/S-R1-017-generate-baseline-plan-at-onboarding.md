# S-R1-017 — Generate baseline plan at onboarding

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-010, S-R1-011, S-R1-012, S-R1-014 |
| Blocks | S-R1-019, S-R1-021, S-R1-059, S-R1-085, S-R1-092 |
| Executor tier | Tier-2 — one atomic use case across four repositories |
| Platforms | backend |
| Parallel-safe with | S-R1-022 to S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
The aha moment is "I answered a few questions and my plan is already there". The prototype generated the plan twice (defect D-06) and outside the onboarding write. Here the profile, the plan version, the tasks and the events are written in one atomic batch.

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7 (`PUT /api/v1/onboarding`); `docs/plan/05_AI_ARCHITECTURE.md` §5 (`PLAN_ENHANCE` trigger); `docs/plan/06_DATA_AND_AUTH.md` §6.
- **Files to read first:** `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/modules/planning/ports.ts`, `apps/api/src/modules/events/event-bus.ts`, `packages/domain/src/planning/{build-baseline-plan.ts,reconcile.ts}`; `legacy/prototype/src/modules/plans/life-plan-service.ts`.
- **Files to create:** `apps/api/src/modules/planning/plan-service.ts`, `apps/api/test/onboarding-plan.test.ts`.
- **Files to modify:** `apps/api/src/modules/relocation/onboarding-service.ts`, `apps/api/src/modules/relocation/ports.ts` (add `RelocationRepository.stageUpsert(uow, profile)`), `apps/api/src/infra/db/repositories/relocation-repository.ts`, `apps/api/src/composition/container.ts` (add `plans: PlanService`).
- **Files you must NOT touch:** `packages/domain/**`, the onboarding contract.
- Env vars: none.

## 3. Design notes
- `PlanService` (exact public surface):

```ts
export interface StageBaselineArgs { userId: string; profile: RelocationProfile; locale: string; trigger: PlanTrigger; existing: Task[]; latestVersion: number }
export class PlanService {
  /** Adds statements to `uow`: new plan row, task inserts/updates/dismissals from reconcilePlan, pruning to 10 versions,
   *  and a PlanEnhancementRequested event. Does not commit. Returns the new version. */
  stageBaseline(uow: UnitOfWork, args: StageBaselineArgs): Promise<{ version: number; contextHash: string; inserted: number; updated: number; dismissed: number }>;
}
```

- Steps inside `stageBaseline`: `draft = buildBaselinePlan({...from profile, locale})` → `result = reconcilePlan(existing, draft)` → new tasks get `id = ids.next()`, `status "OPEN"`, `source "BASELINE"`, timestamps → `plan` row `{ version: latestVersion + 1, summary: draft.summary, generatedBy: "baseline", trigger, contextHash }` where `contextHash` is the hex SHA-256 of `planContextKey(...)` → `events.publish(uow, { type: "PlanEnhancementRequested", userId, planVersion, contextHash })`.
- `OnboardingService.complete(user, body)` becomes:
  1. One read batch: existing profile, all tasks for the user, latest plan (1 database call).
  2. Build the profile; `uow = container.uow()`; `relocation.stageUpsert(uow, profile)`; `plans.stageBaseline(uow, { trigger: "onboarding", … })`; when the profile did not exist before, `events.publish(uow, { type: "OnboardingCompleted", userId })`.
  3. `await uow.commit()` (1 database call).
- Repeating the PUT with the same body: reconciliation yields no inserts; a new plan version is still written only when `contextHash` differs from the latest plan's hash (otherwise skip the plan row and the enhancement event).
- Locale is `"en"` until S-R1-022 adds the profile table.
- Budget: the route stays at `x-db-calls` ≤ 4 (session, read batch, commit, optional drain is in `waitUntil` and not counted).
- Edge cases: first onboarding (no tasks); repeat with changed housing status (find-housing task dismissed, confirm task added); commit failure leaves the old profile untouched.

## 4. Steps
1. Add `stageUpsert` to the relocation repository (same SQL as `upsert`, added to a unit of work).
2. Implement `PlanService.stageBaseline`.
3. Rewrite `OnboardingService.complete` as above; wire the container.
4. Tests → pass; existing `onboarding.test.ts` still passes.
5. Commit: `feat(api): generate baseline plan at onboarding (S-R1-017)`.

## 5. Acceptance criteria
- AC1: Given a new user, when `PUT /api/v1/onboarding` succeeds, then the user has plan version 1, 30 or more OPEN tasks, one `OnboardingCompleted` and one `PlanEnhancementRequested` outbox row.
- AC2: Given the same body sent again, then there is still exactly one plan version and no duplicate tasks.
- AC3: Given a second PUT that changes `housingStatus` to `SECURED`, then plan version 2 exists, `before.housing.find` is `DISMISSED` and `before.housing.confirm_move_in` is `OPEN`.
- AC4 (negative): Given a task insert that fails inside the batch (simulate with a duplicate template key seeded for the user), then the profile is not saved and the response is 500 with the error envelope.
- AC5: `x-db-calls` ≤ 4.

## 6. Tests to write
`apps/api/test/onboarding-plan.test.ts`: AC1–AC5; "a DONE task stays DONE after re-onboarding".

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
- The batch needs more than about 30 statements: check the chunking in `insertMany`; if a batch-size limit is hit, stop and report the exact error.
- You are about to call an LLM here: stop — enhancement is asynchronous (S-R1-059).

## 10. Rollback / undo note
`git revert`; onboarding then saves only the profile, as in R0.

## 11. Out of scope
Plan read and regenerate routes (`S-R1-019`); enhancement (`S-R1-059`); age attestation (`S-R1-032`).
