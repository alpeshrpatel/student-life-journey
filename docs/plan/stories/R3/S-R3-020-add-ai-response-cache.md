# S-R3-020 — Add AI response cache

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P2 |
| Depends on | S-R1-042 |
| Blocks | — |
| Executor tier | Tier-2 — one more provider decorator, with the key and scope rules given |
| Platforms | backend |
| Parallel-safe with | every R3 story except S-R3-021, S-R3-022 (AI package and container) |

## 1. Why
Two AI tasks are often repeated with identical input: explaining the same housing evaluation and extracting the same pasted listing. Caching their validated results removes that cost and latency (`05_AI_ARCHITECTURE.md` §11, column "Cache": "evaluation hash (R3)", "paste hash (R3)"). Launch traffic makes this worth doing now (RK-04).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (`AIProvider`, decorator order) and §11 (which tasks cache); `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (decorator stack); `docs/plan/06_DATA_AND_AUTH.md` §9 (retention, deletion).
- **Files to read first:** `packages/ai/src/core/{provider.ts,types.ts}`, `packages/ai/src/decorators/{tracing,budget,fallback-chain}.ts`, `packages/ai/src/providers/provider-factory.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/cron/retention.ts`.
- **Files to create:** `packages/ai/src/decorators/cache.ts`, `packages/ai/src/decorators/cache.test.ts`, `packages/ai/src/core/cache-port.ts`, `apps/api/src/infra/db/schema/ai-cache.ts`, `apps/api/migrations/NNNN_ai_cache.sql`, `apps/api/src/infra/db/repositories/ai-cache-repository.ts`, `apps/api/test/ai-cache.test.ts`.
- **Files to modify:** `packages/ai/src/providers/provider-factory.ts` (wrap the outermost provider), `apps/api/src/composition/container.ts`, `apps/api/src/cron/retention.ts`, deletion coverage list, `apps/api/src/config/flags.ts` (`aiCacheEnabled`, default false).
- **Files you must NOT touch:** prompts, schemas, guardrails.
- Env vars: none.

## 3. Design notes
```ts
// core/cache-port.ts
export interface AiCachePort {
  get(userId: string, key: string, nowMs: number): Promise<string | null>;                 // JSON text of a validated result
  set(userId: string, key: string, value: string, expiresAtMs: number): Promise<void>;
}
// decorators/cache.ts
export const CACHEABLE_TASKS = ["HOUSING_EXPLAIN", "LISTING_EXTRACT"] as const;
export function withCache(inner: AIProvider, deps: { cache: AiCachePort; now: () => number; enabled: () => boolean }): AIProvider;
export function cacheKey(input: { task: string; promptVersion: string; schemaVersion: string; payload: unknown }): Promise<string>;   // hex SHA-256 of canonical JSON
```

- Scope: only `generateStructured` calls whose `task` is in `CACHEABLE_TASKS`. `generateText` and `streamText` (concierge, plan enhancement) are **never** cached — they depend on changing context and conversation.
- Key: SHA-256 over canonical JSON (sorted keys) of `{ task, promptVersion, schemaVersion, payload }`, where `payload` is the exact structured input the prompt builder receives (evaluation inputs and verdict for `HOUSING_EXPLAIN`; the pasted text for `LISTING_EXTRACT`). The model name is **not** in the key: a cached, schema-valid result is acceptable whichever model produced it; a prompt or schema version bump invalidates naturally.
- **Per user**: the cache is keyed by (`user_id`, `key`). Pasted listings can contain personal details, so results are never shared between users, and the rows are deleted with the account.
- What is stored: the result **after** Zod validation and output guardrails, as JSON text, at most 8 KB (larger → not cached). Never the prompt, never the pasted text.
- On a hit: the stored JSON is parsed and validated against the task's schema again (a schema change could make an old row invalid → treat as a miss and overwrite). The returned result carries `meta.cached = true`; the tracing decorator records an `ai_call` row with `provider = "cache"`, zero tokens and zero cost so hit rates are visible. No budget is consumed.
- Decorator position: outermost — `Cache(Tracing(Budget(FallbackChain(...))))` — so a hit skips everything below. Only results from a real model are stored: when the fallback chain ended in the heuristic provider (`meta.provider === "heuristic"`), do not cache, or a temporary outage would pin the weaker answer for a week.
- TTL: 7 days. Table `ai_cache`: `user_id` (cascade), `key`, `task`, `value`, `created_at`, `expires_at`; primary key (`user_id`, `key`); index on `expires_at`. The retention job deletes expired rows in batches of 500. At most 200 rows per user: when inserting the 201st, delete that user's oldest row in the same batch.
- Cost of the cache itself: one indexed read per cacheable call, one write per miss — inside the request's database-call budget (check the two routes' call counts in tests).
- `aiCacheEnabled` false → the decorator passes straight through.

## 4. Steps
1. Port, decorator and key function with unit tests (fake cache, fake provider).
2. Migration (`--name ai_cache`), repository, container wiring, retention rule, deletion list.
3. API tests on the two routes: second identical request makes no provider call.
4. Enable on preview; compare `ai_call` rows; then production.
5. Commit: `feat(repo): add ai response cache (S-R3-020)`.

## 5. Acceptance criteria
- AC1: Given the same listing text pasted twice by one user, then the second extraction makes no provider call, returns the same result, and an `ai_call` row with `provider = "cache"` exists.
- AC2: Given the prompt version of the task is bumped, then the next call is a miss.
- AC3: Given a cached row that no longer satisfies the task schema, then it is treated as a miss and replaced.
- AC4 (negative): Given two different users pasting the same text, then both calls reach the provider (no cross-user hits).
- AC5 (negative): Given a result produced by the heuristic fallback, then nothing is stored.
- AC6 (negative): Given a concierge reply or plan enhancement, then the cache is never read or written.
- AC7 (negative): Given the `ai_cache` table after AC1, then no row contains the pasted text.
- AC8: Given account deletion, then the user's cache rows are gone; given expiry, the retention job removes them.

## 6. Tests to write
`cache.test.ts`: AC2, AC3, AC5, AC6, key stability under key-order changes. `apps/api/test/ai-cache.test.ts`: AC1, AC4, AC7, AC8, flag off.

## 7. Verification commands
```bash
pnpm --filter @slj/api db:migrate:local && pnpm test && pnpm evals   # expected: pass
pnpm typecheck && pnpm lint                                          # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (flag; `05` §11 table note via the board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to cache concierge answers, share entries between users, or store prompts: stop.
- You are about to use the Cache API or KV: stop — D1 only at rung 0 (one fewer service; KV writes are limited on the free plan).

## 10. Rollback / undo note
`aiCacheEnabled: false`; `git revert`; the table can stay.

## 11. Out of scope
Provider-side prompt caching (handled inside each provider adapter where it exists); semantic (embedding) caches.
