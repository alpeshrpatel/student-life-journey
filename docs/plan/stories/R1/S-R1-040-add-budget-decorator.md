# S-R1-040 — Add budget decorator

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-023, S-R1-034, S-R1-036 |
| Blocks | S-R1-042 |
| Executor tier | Tier-2 — cost accounting that must not add database calls per model call |
| Platforms | backend |
| Parallel-safe with | S-R1-037 to S-R1-039, S-R1-041, S-R1-043 to S-R1-049 |

## 1. Why
Every paid model call must be charged to the user's daily budget and the global monthly budget, and a user at the limit must never reach a paid model (ADR-0008 "Budget and degradation").

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md`; `docs/plan/03_ARCHITECTURE.md` §13.
- **Files to read first:** `packages/ai/src/core/types.ts` (`BudgetPort`), `packages/ai/src/providers/pricing.ts`, `apps/api/src/modules/usage/budget-service.ts`.
- **Files to create:** `packages/ai/src/decorators/budget.ts`, `packages/ai/src/decorators/budget.test.ts`, `apps/api/src/infra/ai/budget-port.ts`, `apps/api/test/ai-budget-port.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `budget-service.ts` public interface.
- Env vars: none.

## 3. Design notes
```ts
// packages/ai/src/decorators/budget.ts
export function withBudget(inner: AIProvider, port: BudgetPort): AIProvider;
// apps/api/src/infra/ai/budget-port.ts
/** One instance per request. The level is loaded once by the service (BudgetService.aiBudgetLevel) and passed in. */
export class RequestBudgetPort implements BudgetPort {
  constructor(level: BudgetLevel, userId: string | undefined);
  level(): BudgetLevel;
  addCost(userId: string | undefined, microUsd: number): void;       // accumulates in memory
  readonly totalMicroUsd: number;
  /** Adds the accumulated cost to the user's daily and the global monthly counters (BudgetService.stageAiCost). No-op when 0. */
  flush(uow: UnitOfWork, budget: BudgetService): void;
}
```

- `withBudget` behaviour:
  - Before the call: if `port.level(req.userId) === "EXHAUSTED"` → throw `AiError("BUDGET_EXCEEDED", …, inner.id)` without calling `inner`. (The heuristic provider is never wrapped with this decorator.)
  - After a successful call (or a completed stream): `port.addCost(req.userId, costMicroUsd(inner.id, usage))`.
  - A failed call adds no cost (vendors do not bill failed requests; a small undercount on partially streamed replies is accepted).
- The decorator performs **no** database access; the service flushes once in its persistence batch (S-R1-058, S-R1-059, S-R1-060).
- Requests without a `userId` (none exist in R1) are charged to the global counter only.
- Edge cases: unknown provider id → cost 0; `generateStructured` with one repair retry → usage already summed by the adapter.

## 4. Steps
1. Decorator + tests with `FakeProvider` and an in-memory `BudgetPort`.
2. `RequestBudgetPort` + API test against the real `BudgetService`.
3. Commit: `feat(ai): add budget decorator (S-R1-040)`.

## 5. Acceptance criteria
- AC1: Given level `NORMAL` and a call using 1,500 input and 300 output tokens on `openai:gpt-5-mini`, then `addCost` receives 975.
- AC2 (negative): Given level `EXHAUSTED`, then the call throws `BUDGET_EXCEEDED` and the inner provider has zero calls.
- AC3 (negative): Given an inner failure, then no cost is added.
- AC4: Given two calls in one request and `flush`, then the user's daily counter and the global monthly counter each rise by the sum, in one batch.
- AC5: Given a completed stream, then the cost is added once, after the `done` chunk.

## 6. Tests to write
`packages/ai/src/decorators/budget.test.ts`: AC1–AC3, AC5. `apps/api/test/ai-budget-port.test.ts`: AC4; "flush with zero cost adds no statement".

## 7. Verification commands
```bash
pnpm --filter @slj/ai test && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                 # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The decorator would need `await` on a database call: stop — the port is synchronous by design.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Choosing the chain by budget level (`S-R1-042`); global kill switch (`S-R3-021`).
