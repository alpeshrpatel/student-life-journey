# S-R3-022 — Add Anthropic provider adapter

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R1-042 |
| Blocks | S-R3-023 |
| Executor tier | Tier-3 — a second native provider with model-specific request rules that differ from the OpenAI-compatible adapter |
| Platforms | backend |
| Parallel-safe with | every R3 story except S-R3-020, S-R3-021 (AI package and container) |

## 1. Why
The provider chain is only an abstraction until a second, different API sits behind it. A native Anthropic adapter gives the bake-off (S-R3-023) a real alternative for both tiers and proves that no application code depends on one vendor (ADR-0008: "`AnthropicProvider` (R3), `anthropic-provider.ts`, Adapter, native Messages API").

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (chain syntax, tiers, error mapping, decorators); `docs/plan/05_AI_ARCHITECTURE.md` §3 (`AIProvider`, `AiError`); `docs/plan/00_PROGRESS_LOG.md` §3.3 (verified prices: Claude Haiku 5.5 $0.10 / $0.50 per million tokens for prompts up to 100k tokens; Claude Sonnet 5.5 $2.00 / $10.00). Vendor documentation to read before coding: https://platform.claude.com/docs (Messages API, structured outputs, streaming, errors) — **do not write SDK calls from memory**; this API changed several times in 2025–2026.
- **Files to read first:** `packages/ai/src/core/{provider.ts,errors.ts,types.ts}`, `packages/ai/src/providers/{openai-compatible-provider.ts,chain-config.ts,provider-factory.ts,pricing.ts}`, `packages/ai/src/providers/openai-compatible-provider.test.ts` (the contract test suite to reuse).
- **Files to create:** `packages/ai/src/providers/anthropic-provider.ts`, `packages/ai/src/providers/anthropic-provider.test.ts`, `packages/ai/src/providers/anthropic-models.ts`.
- **Files to modify:** `packages/ai/package.json` (`@anthropic-ai/sdk`, exact version), `packages/ai/src/providers/chain-config.ts` (accept the `anthropic:` prefix), `packages/ai/src/providers/provider-factory.ts`, `packages/ai/src/providers/pricing.ts` (two rows), `apps/api/src/config/env.ts` (`ANTHROPIC_API_KEY`, optional secret), `scripts/check-size.mjs` budget for the API bundle if needed, `.env.example`, `docs/runbooks/deploy-and-rollback.md` ("Secrets").
- **Files you must NOT touch:** agents, prompts, schemas, guardrails, the orchestrator.
- Env vars: `ANTHROPIC_API_KEY` (secret). Chain examples: `AI_CHEAP_CHAIN="anthropic:claude-haiku-5-5,heuristic"`, `AI_STRONG_CHAIN="anthropic:claude-sonnet-5-5,anthropic:claude-haiku-5-5,heuristic"`.

## 3. Design notes
- Use the **official TypeScript SDK** (`@anthropic-ai/sdk`) inside this one file; it runs on Workers because it uses `fetch`. It stays behind the `AIProvider` port — nothing outside `anthropic-provider.ts` imports it (add the package to the dependency-boundary rule). Client: `new Anthropic({ apiKey, maxRetries: 0, timeout: <ms from the request options> })` — `maxRetries: 0` because our `RetryTimeout` decorator owns retries; the SDK's timeout unit is **milliseconds**.
- Model IDs are the exact strings from the chain variable; never append a date suffix. Models named in this plan: `claude-haiku-5-5` (CHEAP tier), `claude-sonnet-5-5` (STRONG tier). The founder may configure a larger model (for example `claude-opus-5-5`) through the chain variable for the bake-off; the adapter must not hard-code a model.
- `anthropic-models.ts` — the per-model request rules, as data (unknown model → the conservative row: send no `thinking` field, no sampling parameters):

| Model | `thinking` to send | `output_config.effort` | Sampling parameters |
|---|---|---|---|
| `claude-haiku-5-5` | `{ type: "disabled" }` (allowed at effort `high` or below) | `"low"` | none — non-default `temperature`/`top_p`/`top_k` are rejected with 400 |
| `claude-sonnet-5-5` | `{ type: "between_tools" }` (its only thinking-off form; `{ type: "disabled" }` is a 400) | `"low"` | none — same rule |

  Thinking is switched off because every task has a small, hard output cap (20 to 1,200 tokens, ADR-0008) that is our cost control; S-R3-023 may test adaptive thinking with larger caps and change this table.
- Request mapping (`generateText`): `client.messages.create({ model, max_tokens: request.maxOutputTokens, system: request.system, messages: [{ role: "user" | "assistant", content }], thinking, output_config: { effort } })`. Rules: the `system` prompt goes in the top-level `system` field; **never** send `temperature`, `top_p` or `top_k` (drop `request.temperature` silently); **never** end `messages` with an assistant turn (prefill is rejected); never send `budget_tokens`.
- `generateStructured`: use structured outputs — `client.messages.parse({ …, output_config: { effort, format: zodOutputFormat(schema) } })` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`, and read `response.parsed_output` (null when parsing failed). Do **not** use forced `tool_choice` (`any` / `tool`): it is rejected on `claude-sonnet-5-5`. Whatever the SDK returns, validate again with the task's own Zod schema before returning (project rule: no raw model output bypasses Zod); a failure → `AiError("INVALID_OUTPUT")`. If the helper does not accept the project's Zod 4 schemas, read the SDK's `output_config.format` type in the installed package and pass a JSON Schema produced by `z.toJSONSchema(schema)` — record which form was used in the PR.
- `streamText`: `const stream = client.messages.stream({ … })`; `for await (const event of stream)` → when `event.type === "content_block_delta" && event.delta.type === "text_delta"` yield `event.delta.text`; after the loop read usage and the stop reason from `await stream.finalMessage()`. Pass the caller's `AbortSignal` through the request options so that a disconnected client stops the stream (`AiError("ABORTED")`).
- Stop reasons (always check before reading content): `end_turn` → ok; `max_tokens` → return the text with `meta.truncated = true` for text tasks, `INVALID_OUTPUT` for structured tasks; `refusal` → `AiError("INVALID_OUTPUT", { refusal: true, category: response.stop_details?.category })` — **not retried on this provider**; the fallback chain moves to the next entry and finally the heuristic reply. For `claude-sonnet-5-5` requests also opt in to the vendor's own refusal fallback: call through `client.beta.messages` with `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"`, and still check the final `stop_reason` (the fallback model can refuse too). `claude-haiku-5-5` has no server-side fallback: omit the field there.
- Error mapping (most specific first, with `instanceof`): `Anthropic.RateLimitError` (429) → `RATE_LIMITED` (carry `retry-after` when present); `Anthropic.InternalServerError` (≥ 500, including 529 overloaded) → `UPSTREAM`; `Anthropic.APIConnectionError` (check before `APIError`, it is a subclass) → `UPSTREAM`, or `TIMEOUT` when it is the timeout variant; an aborted request → `ABORTED`; other `Anthropic.APIError` (400, 401, 403, 404) → `UPSTREAM` with `retryable: false` so the circuit breaker counts it and the chain moves on. Never include the API key or the prompt in an error message.
- Usage for cost tracking: `usage.input_tokens`, `usage.output_tokens`, plus `usage.cache_read_input_tokens` and `usage.cache_creation_input_tokens` when present → mapped into the port's `Usage` type; `pricing.ts` gains the two rows from the ledger (Haiku 5.5 prices apply to prompts up to 100k tokens — ours are far below).
- Prompt caching is not configured in this story: our system prompts are well under the minimum cacheable length, so `cache_control` would do nothing.
- `capabilities`: `{ structured: true, streaming: true }`; `id`: `"anthropic:" + model`.
- Bundle: confirm the Worker bundle stays inside the size budget after adding the SDK (`pnpm size`); record the delta in the PR.

## 4. Steps
1. Read the vendor documentation pages listed above; install the SDK; write `anthropic-models.ts`.
2. Implement the three methods; error and stop-reason mapping.
3. Tests with a stubbed `fetch` (the SDK accepts a custom `fetch` in its client options): reuse the provider contract suite from the OpenAI-compatible adapter, plus the cases in section 5.
4. Chain parsing, factory, pricing, env; run the offline evals with the fake provider (unchanged) and one manual live call on preview for each of the three methods.
5. Commit: `feat(ai): add anthropic provider adapter (S-R3-022)`.

## 5. Acceptance criteria
- AC1: Given `AI_CHEAP_CHAIN="anthropic:claude-haiku-5-5,heuristic"`, when a listing is extracted, then one request goes to the Messages API with model `claude-haiku-5-5`, no `temperature`, and the result passes the task schema.
- AC2: Given a streamed concierge reply, then text deltas are yielded in order and the final usage is recorded in `ai_call` with a non-zero cost.
- AC3: Given a 429 response, then `AiError("RATE_LIMITED")`; given 529 or 500, then `UPSTREAM`; given a timeout, then `TIMEOUT`; in each case the fallback chain produces a valid answer.
- AC4: Given `stop_reason: "refusal"`, then the adapter does not read content, raises `INVALID_OUTPUT` with the refusal marker, and the chain's next provider answers.
- AC5 (negative): Given a request object with `temperature: 0.2`, then the outgoing body has no sampling parameter.
- AC6 (negative): Given structured output that the SDK parsed but that fails the task's Zod schema, then `INVALID_OUTPUT` — the value is not returned.
- AC7 (negative): Given the outgoing body for `claude-sonnet-5-5`, then it contains neither `tool_choice` of type `any`/`tool`, nor `thinking.type = "disabled"`, nor `budget_tokens`, nor a trailing assistant message.
- AC8 (negative): Given no `ANTHROPIC_API_KEY`, when a chain names an `anthropic:` entry, then configuration validation fails at start-up with a message naming the variable; chains without that prefix are unaffected.
- AC9 (negative): Given any file outside `anthropic-provider.ts` importing `@anthropic-ai/sdk`, then `pnpm lint` fails.

## 6. Tests to write
`anthropic-provider.test.ts`: the shared contract suite; AC1–AC7 against recorded response fixtures (non-streamed, streamed event sequence, parse result, each error status); `chain-config` test for AC8; lint fixture for AC9.

## 7. Verification commands
```bash
pnpm --filter @slj/ai test && pnpm evals       # expected: pass
pnpm typecheck && pnpm lint                    # expected: exit 0
pnpm --filter @slj/api build && pnpm size      # expected: inside the bundle budget
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (`ANTHROPIC_API_KEY`, runbook; pricing rows cite the ledger)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The vendor documentation contradicts a rule in section 3 (a parameter was renamed, a model rule changed): the documentation wins — follow it, and list every difference in the PR.
- The SDK pushes the Worker bundle over its budget or fails in the Workers test runtime: stop and report the numbers; the alternative (a small hand-written `fetch` adapter) needs the founder's approval because it means owning the wire format.
- You are about to route Anthropic traffic through the OpenAI-compatible adapter: stop — this story exists to add the native API.

## 10. Rollback / undo note
Remove `anthropic:` entries from the chain variables (configuration deploy, about a minute); `git revert` if needed.

## 11. Out of scope
Choosing which model serves which tier (`S-R3-023`); tool use, vision, batches, prompt caching.
