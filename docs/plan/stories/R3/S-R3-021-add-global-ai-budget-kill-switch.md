# S-R3-021 — Add global AI budget kill switch

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-023 |
| Blocks | S-R3-016, S-R3-025 |
| Executor tier | Tier-2 — extend the existing budget service with one more counter and one more level source |
| Platforms | backend, web |
| Parallel-safe with | every R3 story except S-R3-017, S-R3-018, S-R3-020, S-R3-022 |

## 1. Why
Per-user limits cap what one person can spend; they do not cap what a launch-day crowd can spend together. A monthly global budget that degrades everyone to economy and then to the heuristic provider makes the worst-case AI bill a number chosen in advance (`05_AI_ARCHITECTURE.md` §11 budget levels; RK-04; launch checklist T-7).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §11 (`NORMAL` → `ECONOMY` at 80% of the global monthly cap → `EXHAUSTED`) and §14 (`aiEnabled` kill switch); `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (tiers and chains); `docs/plan/stories/R1/S-R1-023-add-usage-counters-and-budgets.md` (`usage_counter`, `BudgetService.consume`, `enforce`, `aiBudgetLevel`, `stageAiCost`) and `S-R1-040-add-budget-decorator.md`.
- **Files to read first:** `apps/api/src/modules/budget/budget-service.ts`, `apps/api/src/infra/db/repositories/usage-counter-repository.ts`, `packages/ai/src/decorators/budget.ts`, `apps/api/src/config/env.ts`, `apps/api/src/http/routes/config.ts`, `apps/web/src/screens/concierge/` (the "Basic mode" tag).
- **Files to create:** `apps/api/test/global-ai-budget.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (`AI_MONTHLY_BUDGET_USD`, number, default `5`), `apps/api/src/modules/budget/budget-service.ts`, `packages/contracts/src/config.ts` and `apps/api/src/http/routes/config.ts` (`aiMode: "normal" | "economy" | "basic"`), `apps/web/src/lib/queries/use-config.ts`, the concierge and plan screens' basic-mode tag (read `aiMode`), `docs/runbooks/deploy-and-rollback.md` ("AI budget"), `.env.example`.
- **Files you must NOT touch:** per-user limits and their tests.
- Env vars: `AI_MONTHLY_BUDGET_USD` (variable).

## 3. Design notes
- Global counter: one `usage_counter` row with subject `"global"`, scope `ai_cost_usd_micros`, period = the UTC month `YYYY-MM`. `stageAiCost` (already called once per AI call when the cost is known) adds the same amount to the user's daily counter **and** to the global row, in the same unit of work — no extra database round trip (one more statement in the existing batch).
- Level: `aiBudgetLevel(userId, nowMs)` becomes the **more restrictive** of the per-user level and the global level:
  - global spend < 80% of `AI_MONTHLY_BUDGET_USD` → `NORMAL`;
  - 80% to < 100% → `ECONOMY` (every task uses the CHEAP chain);
  - ≥ 100% → `EXHAUSTED` (heuristic provider only) until the month changes or the variable is raised.
  - `aiEnabled: false` → `EXHAUSTED` regardless of spend (the manual kill switch; unchanged).
- Read cost: the global row is read together with the user's row in the same query (`WHERE (subject = ? AND …) OR (subject = 'global' AND …)`), so the number of database calls per AI request does not change.
- Overshoot bound: costs are recorded after each call, so concurrent requests can pass the line by at most (concurrent calls × the dearest single call). With per-task output caps that is a few cents; state this bound in the runbook. The **vendor-side** monthly limit from S-R1-094 remains the hard backstop and must be set above our own budget (for example 2×) so that ours triggers first and degrades gracefully.
- Client: `GET /api/v1/config` adds `aiMode` derived from the **global** level only (`NORMAL` → `normal`, `ECONOMY` → `economy`, `EXHAUSTED` → `basic`). When `basic`, the concierge and plan screens show the existing calm tag with the text "Basic mode for now. Answers are simpler, and your plan still works." Nothing errors; no screen mentions money or budgets.
- Observability: when the global level changes, log one structured line `ai_budget_level_changed` with the old and new level and the percentage (the alert email is S-R3-025). Dedupe with a `usage_counter` row `subject "global"`, scope `ai_level_notice`, period = month + level, so the line is written once per level per month.
- Runbook "AI budget": how to read the current spend (`ai-cost.sql` from S-R3-015), how to raise the budget (change the variable, deploy configuration — about a minute), how to force basic mode (`aiEnabled: false`), and the rule for launch month: set the budget to the amount the founder is willing to lose on a bad day multiplied by ten.
- Month boundary: the period key changes at 00:00 UTC on the first day; the level returns to `NORMAL` automatically.

## 4. Steps
1. Env value; global counter in `stageAiCost`; combined level; tests with a fake clock and tiny budgets.
2. `aiMode` in config; client tag.
3. Runbook section.
4. Preview drill: set `AI_MONTHLY_BUDGET_USD=0.01`, send concierge messages until basic mode appears, restore the value.
5. Commit: `feat(repo): add global ai budget kill switch (S-R3-021)`.

## 5. Acceptance criteria
- AC1: Given a budget of $1.00 and recorded global spend of $0.79, then levels are `NORMAL`; at $0.80 the next request runs on the CHEAP chain for every task; at $1.00 the next request is served by the heuristic provider.
- AC2: Given `EXHAUSTED` globally, then concierge, plan enhancement, housing explanation and listing extraction all still return valid responses (heuristic or template), with HTTP 200.
- AC3: Given the month changes, then the level is `NORMAL` again without any deploy.
- AC4: Given `aiMode: "basic"`, then the concierge shows the basic-mode tag and no error state.
- AC5 (negative): Given a user under their own limits but a global `EXHAUSTED` level, then no paid model is called for them.
- AC6 (negative): Given the global level is `NORMAL` and a user has exhausted their own daily limit, then that user alone is in basic mode and `aiMode` in config stays `normal`.
- AC7 (negative): Given an AI request under any level, then the number of database calls is the same as before this story.
- AC8: Given a level change, then exactly one `ai_budget_level_changed` log line is written for that level in that month.

## 6. Tests to write
`apps/api/test/global-ai-budget.test.ts`: AC1–AC3, AC5–AC8. Web test for AC4.

## 7. Verification commands
```bash
pnpm test && pnpm evals && pnpm openapi   # expected: pass
pnpm typecheck && pnpm lint               # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (including the preview drill)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`AI_MONTHLY_BUDGET_USD`, runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to return an error (429 or 503) to users when the budget is spent: stop — degrade, never fail (ADR-0008).
- You are about to add a second database call per AI request for the global counter: stop — fold it into the existing statements.

## 10. Rollback / undo note
Set `AI_MONTHLY_BUDGET_USD` very high (the global level stays `NORMAL`); `git revert` if needed.

## 11. Out of scope
Email alerts (`S-R3-025`); per-plan budgets for a paid tier (parked with H1).
