# ADR-0008 — AI provider abstraction and model routing

**TL;DR**
1. Agents depend on one port, `AIProvider`, with three methods: `generateText`, `streamText`, `generateStructured`.
2. One hand-written adapter speaks the OpenAI Chat Completions wire format, which covers OpenAI, Gemini, Workers AI, Groq and local models; a heuristic provider and a fake provider implement the same port.
3. Two model tiers, CHEAP and STRONG, each a fallback chain set by environment variables and always ending in the heuristic provider.
4. At $0 the chains use the Workers AI free allocation. With a paid key the defaults are `gpt-5-nano` and `gpt-5-mini`.
5. Every user has a daily budget; the system degrades STRONG → CHEAP → heuristic instead of failing. Reversal cost S.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, CEO (cost) hats |
| Supersedes | `legacy/prototype/src/ai/ai-service.ts`, `legacy/prototype/src/ai/providers/openai-provider.ts`, `legacy/prototype/src/ai/providers/index.ts` |
| Related | ADR-0007, ADR-0018 |

## Context

The prototype has one OpenAI provider written with `fetch`, selected by "is a key present", with no timeout, no usage accounting, no budget and no second vendor. Hard constraint 7 asks for model routing, no single-vendor dependency, a per-user budget with graceful degradation, and a preserved offline fallback. The API runs on Workers with a 10 ms CPU cap on Free, so dependencies must be light.

## Decision drivers

1. Vendor independence (weight 3).
2. Cost-control hooks: usage, budget, fallback (weight 3).
3. Weak-model implementability (weight 3).
4. Footprint under the Workers CPU cap (weight 2).
5. Feature coverage: streaming and structured output (weight 2).
6. Maintenance effort (weight 2).

## Options

Scores 1–5; maximum weighted total 75.

| Option | Vendor indep. | Cost hooks | Weak-model | Footprint | Coverage | Maintenance | Total |
|---|---|---|---|---|---|---|---|
| A. Keep the single OpenAI `fetch` provider + heuristic (do nothing) | 1 | 1 | 4 | 5 | 2 | 4 | 40 |
| **B. Own port + one OpenAI-compatible adapter + heuristic + decorators** | 5 | 5 | 4 | 5 | 3 | 3 | **64** |
| C. Vercel AI SDK behind our port | 5 | 4 | 3 | 3 | 5 | 3 | 58 |
| D. Vendor SDKs called directly (`openai`, `@google/genai`, `@anthropic-ai/sdk`) | 3 | 3 | 3 | 2 | 5 | 2 | 45 |
| E. A gateway or aggregator as the only endpoint (OpenRouter, unified AI Gateway billing) | 4 | 3 | 4 | 5 | 4 | 4 | 59 |

- **C** is the runner-up. It handles vendor quirks well, but its API has changed across major versions, which trips weak models, and it adds weight we do not need for three methods.
- **E** puts a third party in the path of user content and adds a fee; Cloudflare AI Gateway may still be placed in front of providers later as a configuration-only change for dashboards.

## Decision

### Port (pasted in full in S-R1-033)

```ts
export type ModelTier = "CHEAP" | "STRONG";

export interface AIProvider {
  readonly id: string; // "openai:gpt-5-mini", "workers-ai:@cf/meta/llama-4-scout-17b-16e-instruct", "heuristic"
  readonly capabilities: { jsonSchema: boolean; streaming: boolean };
  generateText(req: TextRequest): Promise<TextResult>;
  streamText(req: TextRequest): AsyncIterable<StreamChunk>;
  generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}
```

### Implementations

| Class | File (`packages/ai/src/providers/`) | Pattern | Covers |
|---|---|---|---|
| `OpenAICompatibleProvider` | `openai-compatible-provider.ts` | Adapter | Any endpoint that accepts `POST {baseUrl}/chat/completions` |
| `HeuristicProvider` | `heuristic-provider.ts` | Strategy | Deterministic answers from `@slj/domain`; needs no network |
| `FakeProvider` | `fake-provider.ts` | Strategy (test double) | Scripted responses for tests and evals |
| `AnthropicProvider` (R3) | `anthropic-provider.ts` | Adapter | Native Messages API (S-R3-022) |

Known endpoints (configuration, not code):

| Provider key | Base URL | Secret | `jsonSchema` |
|---|---|---|---|
| `openai` | `https://api.openai.com/v1` | `OPENAI_API_KEY` | true |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | `GEMINI_API_KEY` | false until verified (V-12) |
| `workers-ai` | `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1` | `WORKERS_AI_API_TOKEN` | false until verified (V-13) |
| `ollama` (dev only) | `http://localhost:11434/v1` | none | false |

### Decorators (applied by `ProviderFactory` in this order, outermost first)

`TracingProvider` → `BudgetProvider` → `CircuitBreakerProvider` → `RetryTimeoutProvider` → concrete provider. A `FallbackChainProvider` composes several decorated providers and moves to the next link on error, open circuit or `BudgetExceededError`.

### Tier chains

Format: comma-separated `provider:model` entries; `heuristic` must be last.

| Variable | $0 default (rung 0) | Paid default (from rung 1) |
|---|---|---|
| `AI_CHEAP_CHAIN` | `workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8-fast,heuristic` | `openai:gpt-5-nano,workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8-fast,heuristic` |
| `AI_STRONG_CHAIN` | `workers-ai:@cf/meta/llama-4-scout-17b-16e-instruct,heuristic` | `openai:gpt-5-mini,gemini:gemini-3.5-flash-lite,heuristic` |

With no secrets at all, both chains resolve to `heuristic` and the product still works end to end.

**Privacy rule:** the Gemini free tier is never used with user content, because its terms allow Google to use that content to improve products. `GEMINI_API_KEY` must belong to a paid-tier project.

### Routing table

| Task | Tier | Typical in / out tokens | Hard max out | Structured | Cache | Per-user daily limit |
|---|---|---|---|---|---|---|
| `INTENT_CLASSIFY` | CHEAP | 250 / 10 | 20 | yes | none; rules run first | counted in cost only |
| `PLAN_ENHANCE` | STRONG | 1,800 / 900 | 1,200 | yes | skip if `contextHash` unchanged | 6 runs |
| `HOUSING_EXPLAIN` | CHEAP | 500 / 200 | 300 | yes | by evaluation hash, 30 days (S-R3-020) | counted in cost only |
| `LISTING_EXTRACT` | CHEAP | 1,200 / 300 | 500 | yes | by paste hash, 24 hours (S-R3-020) | 20 runs |
| `CONCIERGE_REPLY` | STRONG | 1,500 / 300 | 500 | no (streamed text) | none | 40 messages |
| `CONVERSATION_SUMMARY` | CHEAP | 1,200 / 150 | 200 | no | none | counted in cost only |

Timeouts: 8 s for CHEAP, 20 s for STRONG, one retry on network error or HTTP 5xx/429 with 400 ms backoff. Circuit breaker: 5 consecutive failures open the circuit for 60 s.

### Budget and degradation

| Level | Condition | Behaviour |
|---|---|---|
| NORMAL | User cost today < 21,000 micro-USD and global month < 80% of `AI_MONTHLY_BUDGET_USD` | Tiers as configured |
| ECONOMY | User cost today ≥ 21,000 micro-USD, or global month ≥ 80% | Every task uses the CHEAP chain |
| EXHAUSTED | User cost today ≥ 30,000 micro-USD, or a count limit is reached, or global month ≥ 100% | Heuristic provider only; the UI shows "Basic mode until tomorrow" |

Cost is computed from token usage with the price table in `packages/ai/src/providers/pricing.ts` and stored in `usage_counter` (S-R1-023). `AI_MONTHLY_BUDGET_USD` defaults to `10`.

### Unit economics (paid defaults, prices verified 2026-11-14)

| Task | Model | Cost per call |
|---|---|---|
| `PLAN_ENHANCE` | `gpt-5-mini` ($0.25 / $2.00 per 1M) | $0.00225 |
| `CONCIERGE_REPLY` | `gpt-5-mini` | $0.000975 |
| `INTENT_CLASSIFY` | `gpt-5-nano` ($0.05 / $0.40 per 1M) | $0.0000165 |
| `LISTING_EXTRACT` | `gpt-5-nano` | $0.00018 |
| `HOUSING_EXPLAIN` | `gpt-5-nano` | $0.000105 |

An active user who triggers 3 plan enhancements, 25 concierge messages (10 needing LLM classification), 4 extractions and 6 explanations in a month costs about **$0.033**. At $0, the Workers AI allocation of 10,000 neurons/day covers roughly 166 concierge replies or 87 plan enhancements per day (about 60 and 114 neurons each).

## Consequences

**Good:** adding a vendor is one line of configuration; cost is bounded per user and per month; tests and evals never need a network.

**Bad:** we own Server-Sent-Events parsing and the structured-output fallback (JSON mode + Zod + one repair); vendor-specific features (prompt caching, native tool calling) are not used.

**Neutral:** model IDs are configuration and will change; the eval harness (ADR-0018), not brand preference, decides promotions. Claude Haiku 5.5 ($0.10 / $0.50 per 1M) is the first candidate for the STRONG slot once the native adapter exists (S-R3-022, S-R3-023).

## Reversal cost

**S.** Replace adapter internals with an SDK behind the same port.

## Flip trigger

Adopt the Vercel AI SDK (option C) inside the adapters if we need LLM-native multi-step tool calling, or if adapter upkeep exceeds one working day in a quarter.

## References

- Spec §12, §13, §21; vision §33.
- `00_PROGRESS_LOG.md` §3.1 (Workers AI), §3.3 (prices and terms).
