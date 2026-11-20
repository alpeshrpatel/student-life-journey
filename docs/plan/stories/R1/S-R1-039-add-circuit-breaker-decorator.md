# S-R1-039 — Add circuit breaker decorator

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-034 |
| Blocks | S-R1-042 |
| Executor tier | Tier-2 — small state machine |
| Platforms | backend |
| Parallel-safe with | S-R1-036 to S-R1-038, S-R1-040, S-R1-041, S-R1-043 to S-R1-049 |

## 1. Why
When a vendor is down, every request should skip it at once instead of waiting for a timeout first (`05_AI_ARCHITECTURE.md` §13).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (5 consecutive failures open the circuit for 60 s).
- **Files to read first:** `packages/ai/src/decorators/retry-timeout.ts` (decorator style), `packages/ai/src/core/errors.ts`.
- **Files to create:** `packages/ai/src/decorators/circuit-breaker.ts`, `packages/ai/src/decorators/circuit-breaker.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** providers.
- Env vars: none.

## 3. Design notes
```ts
export interface BreakerState { failures: number; openUntil: number }          // openUntil = 0 when closed
/** Shared state per provider id. Lives in module memory, so it is per Worker isolate — best effort by design. */
export class BreakerRegistry { get(providerId: string): BreakerState; reset(): void }
export interface CircuitBreakerOptions { registry: BreakerRegistry; now: () => number; threshold?: number /* 5 */; openMs?: number /* 60_000 */ }
export function withCircuitBreaker(inner: AIProvider, options: CircuitBreakerOptions): AIProvider;
```

- States: **closed** (calls pass; each failure increments `failures`; success resets to 0) → **open** when `failures >= threshold` (`openUntil = now + openMs`; calls fail immediately with `AiError("CIRCUIT_OPEN", …, inner.id)`) → **half-open** when `now >= openUntil` (one trial call passes; success closes; failure re-opens for `openMs`).
- Failures that count: kinds `UPSTREAM`, `TIMEOUT`, `RATE_LIMITED`. `INVALID_OUTPUT`, `ABORTED` and `BUDGET_EXCEEDED` do not count.
- Streams: a failure before or during the stream counts once; a completed stream is a success.
- The registry is created once at module scope in `apps/api` (S-R1-042) so that it survives across requests in the same isolate. It is not shared between isolates and is lost on redeploy; that is acceptable (the retry and fallback layers still protect the user).
- `now` is injected (no `Date.now()` inside `packages/ai` code paths that need testing).
- Edge cases: two concurrent trial calls in half-open (allow both; simplicity over strictness); threshold 1.

## 4. Steps
1. Tests with `FakeProvider` and a manual clock.
2. Implement → pass.
3. Commit: `feat(ai): add circuit breaker decorator (S-R1-039)`.

## 5. Acceptance criteria
- AC1: Given five consecutive `UPSTREAM` failures, then the sixth call throws `CIRCUIT_OPEN` without calling the inner provider.
- AC2: Given an open circuit and the clock advanced by 60 s, then the next call reaches the inner provider; on success the circuit is closed (`failures` 0).
- AC3: Given four failures then a success, then the counter is 0.
- AC4 (negative): Given five `INVALID_OUTPUT` errors, then the circuit stays closed.
- AC5: Given two providers with different ids in one registry, then one opening does not affect the other.

## 6. Tests to write
`circuit-breaker.test.ts`: AC1–AC5; "half-open failure re-opens".

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
- You are about to persist breaker state in D1 or KV: stop — out of scope at rung 0 (writes are scarce).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Alerting on open circuits (`S-R3-025`).
