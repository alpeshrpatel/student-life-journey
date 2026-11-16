# S-R1-041 — Add tracing decorator and call log

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Observability |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-013, S-R1-023, S-R1-034, S-R1-036 |
| Blocks | S-R1-042 |
| Executor tier | Tier-2 — decorator plus table and buffered sink |
| Platforms | backend |
| Parallel-safe with | S-R1-037 to S-R1-040, S-R1-043 to S-R1-049 |

## 1. Why
Cost, latency, fallback rate and guardrail hits must be visible per model call from day one, without storing any prompt or reply text (`05_AI_ARCHITECTURE.md` §17).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §17; `docs/plan/06_DATA_AND_AUTH.md` §2 (`ai_call` — copy exactly); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §8.
- **Files to read first:** `packages/ai/src/core/types.ts` (`AiCallRecord`, `AiCallSink`), `packages/ai/src/decorators/budget.ts`, `apps/api/src/infra/db/schema/usage.ts`.
- **Files to create:** `packages/ai/src/decorators/tracing.ts`, `packages/ai/src/decorators/tracing.test.ts`, `apps/api/migrations/NNNN_ai_call.sql`, `apps/api/src/infra/ai/ai-call-sink.ts`, `apps/api/src/infra/db/repositories/ai-call-repository.ts`, `apps/api/test/ai-call-sink.test.ts`.
- **Files to modify:** `apps/api/src/infra/db/schema/usage.ts` (add `aiCall`), `apps/api/src/infra/db/schema/index.ts`, `packages/ai/src/index.ts`, `apps/api/src/cron/scheduled.ts` (daily step: delete `ai_call` rows older than 30 days).
- **Files you must NOT touch:** providers.
- Env vars: none.

## 3. Design notes
```ts
// packages/ai/src/decorators/tracing.ts
export function withTracing(inner: AIProvider, deps: { sink: AiCallSink; now: () => number; tier: ModelTier }): AIProvider;
// apps/api/src/infra/ai/ai-call-sink.ts
export interface CallAnnotations { intent?: string | null; topic?: string | null; guardrails?: string[]; budgetLevel: BudgetLevel }
export class BufferedAiCallSink implements AiCallSink {
  record(entry: AiCallRecord): void;                       // memory only
  readonly entries: readonly AiCallRecord[];
  /** Marks the last successful record as blocked or fallback after guardrails ran. */
  amendLast(patch: Pick<AiCallRecord, "outcome" | "fallbackReason">): void;
  /** Inserts one ai_call row per record with the request-level annotations. No-op when empty. */
  flush(uow: UnitOfWork, repo: AiCallRepository, ids: IdGenerator, now: number, annotations: CallAnnotations): void;
}
```

- `withTracing` records one `AiCallRecord` per attempt on this provider:
  - success → `outcome: "ok"`, tokens from usage, `costMicroUsd(inner.id, usage)`, `latencyMs = now() − start`;
  - `AiError` → `outcome: "error"`, `fallbackReason: err.kind`, tokens 0, cost 0; then rethrow;
  - streams record when the `done` chunk arrives or when the stream throws.
- The heuristic provider is wrapped too (cost 0), so the fallback rate is measurable: its record has `outcome: "fallback"` when it answers after another provider failed — the fallback chain sets this (S-R1-042), not this decorator.
- The record contains no message content. Add a test that serialises all records and asserts that a marker string placed in the prompt and in the reply does not appear.
- `flush` writes rows in the same batch as the other end-of-request writes (≤ 6 rows per request in practice).
- Edge cases: a request with zero model calls (rule-routed, tool-only) writes no rows; `userId` undefined → `null`.

## 4. Steps
1. Decorator + tests with `FakeProvider` and a manual clock.
2. Table migration (`--name ai_call`), repository, buffered sink, cron cleanup.
3. API test for `flush`.
4. Commit: `feat(repo): add tracing decorator and call log (S-R1-041)`.

## 5. Acceptance criteria
- AC1: Given a successful call, then one record exists with the provider id, prompt id and version, token counts, cost and latency.
- AC2: Given a failing call, then one record with `outcome: "error"` and `fallbackReason` equal to the error kind, and the error is rethrown.
- AC3: Given `flush` with two records, then two `ai_call` rows exist with `budget_level` and `guardrails` from the annotations.
- AC4 (negative): Given a prompt and a reply containing the marker `ZX-SECRET-MARKER`, then no record field and no `ai_call` column contains it.
- AC5: Given rows 31 days old and 1 day old, when the daily cron runs, then only the old row is deleted.

## 6. Tests to write
`packages/ai/src/decorators/tracing.test.ts`: AC1, AC2, AC4; "stream records once at done". `apps/api/test/ai-call-sink.test.ts`: AC3, AC5; "amendLast changes the outcome".

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test   # expected: pass
pnpm typecheck && pnpm lint                            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are asked to store prompt or reply text "for debugging": stop — forbidden by `05` §17 and the privacy rules.

## 10. Rollback / undo note
`git revert`; the table can stay.

## 11. Out of scope
Dashboards and alerts (`S-R3-015`, `S-R3-025`); analytics events (`S-R1-085`).
