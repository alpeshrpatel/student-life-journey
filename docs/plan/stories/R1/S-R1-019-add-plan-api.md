# S-R1-019 — Add plan API

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Plan and Tasks |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-017, S-R1-018 |
| Blocks | S-R1-074, S-R1-087 |
| Executor tier | Tier-2 — two routes reusing existing services |
| Platforms | backend |
| Parallel-safe with | S-R1-020 to S-R1-032, S-R1-033 to S-R1-049 |

## 1. Why
The plan screen needs the current plan summary with its tasks, and a way to rebuild it on demand (spec §3.2, §25.3).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §7; `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.4.
- **Files to read first:** `apps/api/src/modules/planning/plan-service.ts`, `apps/api/src/http/routes/tasks.ts`, `packages/contracts/src/tasks.ts`.
- **Files to create:** `packages/contracts/src/plan.ts`, `apps/api/src/http/routes/plan.ts`, `apps/api/test/plan.test.ts`.
- **Files to modify:** `apps/api/src/modules/planning/plan-service.ts` (add `get` and `regenerate`), `packages/contracts/src/index.ts`, `apps/api/src/app.ts`, `packages/api-client/src/client.ts` (methods `getPlan`, `regeneratePlan`).
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Contract (exact):

```ts
export const PlanResponseSchema = z.object({
  version: z.number().int(),
  summary: z.string(),
  enhanced: z.boolean(),                 // true when generatedBy starts with "ai:"
  generatedAt: IsoInstantSchema,
  lateArrival: z.boolean(),
  journeyPhase: JourneyPhaseSchema,
  currentDayIndex: z.number().int().min(1).max(7).nullable(),
  tasks: z.array(TaskSchema),            // every status except DISMISSED, ordered by sortOrder
});
```

- `GET /api/v1/plan` → 200; no profile → `ONBOARDING_REQUIRED`. One read batch: profile, latest plan, tasks.
- `POST /api/v1/plan/regenerate` (no body) → 200 `PlanResponseSchema`. One read batch → `uow` → `plans.stageBaseline(uow, { trigger: "manual", … })` → commit → respond from in-memory state (apply the reconcile result to the loaded tasks; do not re-read).
- Regenerating with an unchanged context still writes a new version and requests enhancement (the mover asked for it explicitly); the enhancement handler skips the LLM call when its own cache key matches (S-R1-059).
- `pruneOld(uow, userId, 10)` keeps the last ten versions (already inside `stageBaseline`).
- Edge cases: user with a profile but no plan (created in R0 before this release) → `GET` performs the same work as regenerate with trigger `"onboarding"` once, then returns it.

## 4. Steps
1. Contract; `PlanService.get` and `.regenerate`; routes; client methods.
2. Tests → pass.
3. Commit: `feat(api): add plan API (S-R1-019)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user, when `GET /api/v1/plan` is called, then version 1 is returned with tasks in order and `enhanced: false`.
- AC2: Given a DONE task, when regenerate is called, then the version is 2 and the task is still DONE in the response.
- AC3: Given twelve regenerations, then only ten `plan` rows remain for the user.
- AC4 (negative): Given a user without a profile, then both routes return 409 `ONBOARDING_REQUIRED`.
- AC5: `GET` uses ≤ 2 database calls; regenerate ≤ 3.

## 6. Tests to write
`apps/api/test/plan.test.ts`: AC1–AC5; "late arrival flag follows the arrival time"; "R0 user without a plan gets one on first GET".

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
- The response would need a second read to be correct: stop and reconsider — the merged in-memory state must be enough; report if not.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Daily regenerate limit (`S-R1-023`); AI enhancement (`S-R1-059`); plan history UI (parked).
