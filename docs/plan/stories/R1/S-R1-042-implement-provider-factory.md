# S-R1-042 — Implement provider factory

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-036, S-R1-037, S-R1-038, S-R1-039, S-R1-040, S-R1-041 |
| Blocks | S-R1-050, S-R1-061, S-R3-020, S-R3-022 |
| Executor tier | Tier-2 — configuration parsing and composition of existing parts |
| Platforms | backend |
| Parallel-safe with | S-R1-043 to S-R1-049 |

## 1. Why
Which model answers is configuration, not code: two environment variables define the CHEAP and STRONG chains, each ending in the heuristic provider (ADR-0008). With no secrets at all the product still works.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (endpoint table, chain format, budget levels); `docs/plan/adr/ADR-0024-secrets-and-configuration.md`.
- **Files to read first:** all files in `packages/ai/src/decorators/` and `packages/ai/src/providers/`, `apps/api/src/config/env.ts`; `legacy/prototype/src/ai/providers/index.ts`.
- **Files to create:** `packages/ai/src/providers/chain-config.ts`, `packages/ai/src/decorators/fallback-chain.ts`, `packages/ai/src/providers/provider-factory.ts`, `packages/ai/src/providers/provider-factory.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`, `apps/api/src/config/env.ts` (optional `AI_CHEAP_CHAIN`, `AI_STRONG_CHAIN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `WORKERS_AI_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), `apps/api/.dev.vars.example`.
- **Files you must NOT touch:** agents, routes.
- Env vars: the six above. Defaults for both chains: `"heuristic"`.

## 3. Design notes
- Patterns: Factory + Chain of Responsibility (fallback) + Decorator stack.

```ts
// chain-config.ts
export interface ChainEntry { providerKey: string; model: string | null }        // { providerKey: "heuristic", model: null }
export function parseChain(value: string | undefined): ChainEntry[];             // "openai:gpt-5-mini,heuristic"; always ends with heuristic (appended if missing)
export const ENDPOINTS: Record<string, { baseUrl: (cfg: ProviderSecrets) => string | null; apiKey: (cfg: ProviderSecrets) => string | undefined; jsonSchema: boolean }>;
export interface ProviderSecrets { OPENAI_API_KEY?: string; GEMINI_API_KEY?: string; WORKERS_AI_API_TOKEN?: string; CLOUDFLARE_ACCOUNT_ID?: string }
// fallback-chain.ts
export function withFallbackChain(providers: AIProvider[], sink: AiCallSink): AIProvider;    // id = "chain(" + ids.join(">") + ")"
// provider-factory.ts
export interface ProviderFactoryDeps {
  cheapChain: string | undefined; strongChain: string | undefined; secrets: ProviderSecrets;
  sink: AiCallSink; budget: BudgetPort; breakers: BreakerRegistry; now: () => number; fetch?: typeof fetch;
}
export function createProviderSet(deps: ProviderFactoryDeps): ProviderSet;
```

- `ENDPOINTS` (from ADR-0008): `openai` → `https://api.openai.com/v1`, `jsonSchema: true`; `gemini` → `https://generativelanguage.googleapis.com/v1beta/openai`, `jsonSchema: false`; `workers-ai` → `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1`, `jsonSchema: false`.
- Building one chain: for each entry — `heuristic` → `withTracing(new HeuristicProvider())`; a known provider key **with** its secret present → `withTracing(withBudget(withCircuitBreaker(withRetryTimeout(new OpenAICompatibleProvider(…), { timeoutMs }))))` with `timeoutMs` 8,000 for the CHEAP chain and 20,000 for STRONG; a provider without its secret, or an unknown key, is **skipped** (logged once by the caller, never an error).
- `withFallbackChain`: try providers in order. On `AiError` of any kind except `ABORTED`, move to the next. When a later provider answers, amend its record to `outcome: "fallback"` with `fallbackReason` = the first error's kind. For `streamText`, fallback happens only if the failing provider has not yielded a chunk yet. The heuristic provider never throws, so the chain always answers.
- `ProviderSet.forTier(tier, level)`: `EXHAUSTED` → the heuristic provider only; `ECONOMY` → the CHEAP chain for both tiers; `NORMAL` → the chain of the tier.
- Composition per request in `apps/api` happens in S-R1-058/059/060; this story only delivers the factory and env parsing. The `BreakerRegistry` instance must be module-level in the API wiring so that it outlives a request.
- Edge cases: empty or whitespace chain value → `[heuristic]`; `"heuristic,openai:gpt-5-mini"` → entries after `heuristic` are dropped; a model name containing `:` or `/` (`workers-ai:@cf/meta/llama-4-scout-17b-16e-instruct`) — split on the **first** colon only.

## 4. Steps
1. `parseChain` with tests.
2. `withFallbackChain` with tests using `FakeProvider`s.
3. `createProviderSet` with tests; env additions.
4. Commit: `feat(ai): implement provider factory (S-R1-042)`.

## 5. Acceptance criteria
- AC1: Given no environment values, then both tiers resolve to a chain whose only member is `heuristic`, and a `CONCIERGE_REPLY` request returns text.
- AC2: Given `AI_STRONG_CHAIN="openai:gpt-5-mini,gemini:gemini-3.5-flash-lite,heuristic"` and only `OPENAI_API_KEY` set, then the chain is `openai:gpt-5-mini > heuristic`.
- AC3: Given the first provider failing with `UPSTREAM` (after its retry), then the second answers and its record has `outcome: "fallback"`, `fallbackReason: "UPSTREAM"`.
- AC4: Given level `ECONOMY`, then `forTier("STRONG", "ECONOMY")` returns the CHEAP chain; given `EXHAUSTED`, then heuristic only.
- AC5 (negative): Given `parseChain("workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8-fast")`, then the model is `@cf/meta/llama-3.1-8b-instruct-fp8-fast` and `heuristic` is appended.
- AC6 (negative): Given a stream that fails after its first chunk, then no fallback happens and the error propagates.

## 6. Tests to write
`provider-factory.test.ts`: AC1–AC6; "unknown provider key is skipped"; "CHEAP chain uses an 8 s timeout" (assert through the options passed, with a spy).

## 7. Verification commands
```bash
pnpm --filter @slj/ai test && pnpm --filter @slj/api test   # expected: pass
pnpm typecheck && pnpm lint                                 # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`.dev.vars.example` lists the six variables with empty values)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to read `process.env` or the Worker `env` inside `packages/ai`: stop — values are passed in.
- Someone sets `GEMINI_API_KEY` from a free-tier project: stop and report — forbidden for user content (ADR-0008 privacy rule).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Live verification of Workers AI (`S-R1-061`); paid key creation (`S-R1-094`); response cache (`S-R3-020`).
