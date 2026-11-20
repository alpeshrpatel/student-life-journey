# S-R1-023 — Add usage counters and budgets

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-018, S-R1-019 |
| Blocks | S-R1-031, S-R1-040, S-R1-058, S-R3-021 |
| Executor tier | Tier-2 — atomic counters and limit semantics |
| Platforms | backend |
| Parallel-safe with | S-R1-020 to S-R1-022, S-R1-024 to S-R1-030, S-R1-033 to S-R1-039 |

## 1. Why
A $0 budget needs hard limits: per-user daily counts and a daily AI cost cap, plus a global monthly AI cap (ADR-0008). Workers have no shared memory and KV writes are too scarce, so counters live in D1 (`03_ARCHITECTURE.md` §13).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §13 (counter table — the limits below are copied from it); `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (budget levels); `docs/plan/06_DATA_AND_AUTH.md` §2 (`usage_counter`), §6 rule 5.
- **Files to read first:** `apps/api/src/infra/db/unit-of-work.ts`, `apps/api/src/config/env.ts`, `apps/api/src/http/routes/{tasks.ts,plan.ts}`.
- **Files to create:** `apps/api/src/infra/db/schema/usage.ts` (table `usageCounter` only), `apps/api/migrations/NNNN_usage_counter.sql`, `apps/api/src/modules/usage/ports.ts`, `apps/api/src/modules/usage/budget-service.ts`, `apps/api/src/infra/db/repositories/usage-repository.ts`, `apps/api/test/budget.test.ts`.
- **Files to modify:** `apps/api/src/config/env.ts` (add `AI_MONTHLY_BUDGET_USD`, number, default 10), `apps/api/.dev.vars.example`, `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/composition/container.ts` (add `budget: BudgetService`), `apps/api/src/http/routes/tasks.ts` (`task_creates` on `POST`), `apps/api/src/http/routes/plan.ts` (`plan_regens` on regenerate), `apps/api/src/cron/scheduled.ts` (daily step: delete daily counters older than 35 days).
- **Files you must NOT touch:** `packages/ai/**`.
- Env vars: `AI_MONTHLY_BUDGET_USD`.

## 3. Design notes
- Constants and interface (exact):

```ts
export const DAILY_LIMITS = {
  concierge_msgs: 40, plan_regens: 6, extractions: 20, geo_calls: 60,
  places_upstream: 30, client_events: 200, task_creates: 100, ai_cost_micro_usd: 30_000,
} as const;
export type CounterKey = keyof typeof DAILY_LIMITS;
export const GLOBAL_DAILY_LIMITS = { geo_credits: 2_800 } as const;
export const ECONOMY_AT_MICRO_USD = 21_000;                 // 70% of the daily AI cost cap
export type BudgetLevel = "NORMAL" | "ECONOMY" | "EXHAUSTED";

export interface ConsumeResult { allowed: boolean; value: number; limit: number; resetsAt: string /* next 00:00 UTC, ISO */ }
export interface BudgetService {
  /** Atomically adds `by` (default 1) and reports whether the new value is within the limit. One database call. */
  consume(subject: string, key: CounterKey | "geo_credits", by?: number): Promise<ConsumeResult>;
  /** consume(); throws RateLimitedError({ limit, resetsAt }) when not allowed. */
  enforce(userId: string, key: CounterKey): Promise<void>;
  /** Reads the user's daily AI cost and the global monthly AI cost (one batch). */
  aiBudgetLevel(userId: string): Promise<BudgetLevel>;
  /** Adds the cost to the user's daily counter and the global monthly counter in the given unit of work. */
  stageAiCost(uow: UnitOfWork, userId: string, microUsd: number): void;
}
```

- SQL for `consume`: `INSERT INTO usage_counter(subject, period, key, value) VALUES (?, ?, ?, ?) ON CONFLICT(subject, period, key) DO UPDATE SET value = value + excluded.value RETURNING value`. `period` is the UTC day `YYYY-MM-DD` from the injected clock. `allowed = value <= limit` (the request that reaches the limit is allowed; the next is not).
- `aiBudgetLevel`: user daily `ai_cost_micro_usd` ≥ 30,000 → `EXHAUSTED`; ≥ 21,000 → `ECONOMY`. Global counter subject `"global"`, period `YYYY-MM`, key `ai_cost_micro_usd`: ≥ 100% of `AI_MONTHLY_BUDGET_USD × 1,000,000` → `EXHAUSTED`; ≥ 80% → `ECONOMY`. The stricter level wins.
- A counter is consumed even when the request later fails (simple and safe).
- Edge cases: UTC midnight rollover starts a new row; `by: 0` reads without changing; concurrent requests never lose increments.

## 4. Steps
1. Schema + migration (`--name usage_counter`); repository; service; env variable.
2. Apply `enforce` to the two routes; add the cron cleanup step.
3. Tests with a fixed clock → pass.
4. Commit: `feat(api): add usage counters and budgets (S-R1-023)`.

## 5. Acceptance criteria
- AC1: Given 100 task creations today, when the 101st is posted, then 429 `RATE_LIMITED` with `details.limit` 100 and `details.resetsAt` at the next UTC midnight.
- AC2: Given six regenerations today, then the seventh returns 429; after the clock passes midnight UTC it succeeds.
- AC3: Given 20 concurrent `consume` calls (`Promise.all`), then the final value is exactly 20.
- AC4: Given a user cost of 21,000 → `ECONOMY`; 30,000 → `EXHAUSTED`; given the global month at 100% → `EXHAUSTED` for every user.
- AC5 (negative): Given user A at the limit, then user B is unaffected.

## 6. Tests to write
`apps/api/test/budget.test.ts`: AC1–AC5; "stageAiCost writes both counters in one batch".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                              # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example`)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `RETURNING` is rejected by D1: stop and report (claim V-list in `13_ASSUMPTIONS_RISKS.md`); do not replace it with read-then-write.
- You are about to use KV or a Durable Object: stop — not at rung 0.

## 10. Rollback / undo note
`git revert`; limits disappear, counters stay harmlessly.

## 11. Out of scope
The AI budget decorator (`S-R1-040`); the global kill switch UI and alerts (`S-R3-021`, `S-R3-025`).
