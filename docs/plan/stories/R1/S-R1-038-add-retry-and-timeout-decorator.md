# S-R1-038 — Add retry and timeout decorator

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-034 |
| Blocks | S-R1-042 |
| Executor tier | Tier-2 — abort and retry semantics, including streams |
| Platforms | backend |
| Parallel-safe with | S-R1-036, S-R1-037, S-R1-039 to S-R1-041, S-R1-043 to S-R1-049 |

## 1. Why
A hung or flaky vendor must cost the user seconds, not the whole reply (`05_AI_ARCHITECTURE.md` §13).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (timeouts 8 s CHEAP, 20 s STRONG; one retry on network error or HTTP 5xx/429 with 400 ms backoff).
- **Files to read first:** `packages/ai/src/core/{provider.ts,errors.ts}`, `packages/ai/src/providers/fake-provider.ts`.
- **Files to create:** `packages/ai/src/decorators/retry-timeout.ts`, `packages/ai/src/decorators/retry-timeout.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** providers.
- Env vars: none.

## 3. Design notes
- Pattern: Decorator (same `AIProvider` interface in and out).

```ts
export interface RetryTimeoutOptions { timeoutMs: number; retries?: number /* default 1 */; backoffMs?: number /* default 400 */; sleep?: (ms: number) => Promise<void> }
export function withRetryTimeout(inner: AIProvider, options: RetryTimeoutOptions): AIProvider;   // id and capabilities pass through
```

- Timeout: create an `AbortController` per attempt; combine with `req.signal` (`AbortSignal.any([req.signal, controller.signal])` when a caller signal exists); abort after `timeoutMs` → throw `AiError("TIMEOUT", …, inner.id)`. A caller abort stays `ABORTED` and is never retried.
- Retry: on `AiError` kinds `UPSTREAM`, `RATE_LIMITED` and `TIMEOUT`, wait `backoffMs` and try again, at most `retries` times. Never retry `INVALID_OUTPUT`, `BUDGET_EXCEEDED`, `CIRCUIT_OPEN`, `ABORTED`.
- Streams: the timeout applies to the time until the **first chunk** and then to the gap between chunks (reset the timer on each chunk). A stream is retried only if it failed **before** yielding its first chunk; after the first chunk an error propagates (the agent then falls back).
- Use the injected `sleep` in tests (no real waiting); timers must be cleared in a `finally`.
- Edge cases: `timeoutMs` reached exactly when a result arrives (result wins); errors that are not `AiError` are wrapped as `UPSTREAM`.

## 4. Steps
1. Tests with `FakeProvider` steps (`delayMs`, `error`) and fake timers.
2. Implement → pass.
3. Commit: `feat(ai): add retry and timeout decorator (S-R1-038)`.

## 5. Acceptance criteria
- AC1: Given a step that delays 500 ms and `timeoutMs: 100`, then the call rejects with kind `TIMEOUT` after one retry (two inner calls).
- AC2: Given `UPSTREAM` then success, then the result is returned and the inner provider was called twice with one `sleep(400)`.
- AC3 (negative): Given `INVALID_OUTPUT`, then the inner provider is called once.
- AC4 (negative): Given a caller abort, then kind `ABORTED` and no retry.
- AC5: Given a stream that yields one chunk and then errors, then the error propagates without a second inner call.

## 6. Tests to write
`retry-timeout.test.ts`: AC1–AC5; "id and capabilities pass through"; "timers are cleared after success".

## 7. Verification commands
```bash
pnpm --filter @slj/ai test       # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `AbortSignal.any` is unavailable in the Workers test runtime: implement the combination by hand with event listeners; note it in the PR.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Circuit breaking (`S-R1-039`); moving to the next provider (`S-R1-042`).
