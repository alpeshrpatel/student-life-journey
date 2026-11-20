# S-R1-036 — Implement OpenAI-compatible adapter

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-035 |
| Blocks | S-R1-042 |
| Executor tier | Tier-3 — wire format, structured output and error mapping across vendors |
| Platforms | backend |
| Parallel-safe with | S-R1-037 to S-R1-041, S-R1-043 to S-R1-049 |

## 1. Why
One adapter that speaks the Chat Completions wire format reaches OpenAI, Gemini, Workers AI, Groq and local models (ADR-0008). It is the only code that talks to a model vendor in R1.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (endpoint table, routing table); `docs/plan/05_AI_ARCHITECTURE.md` §9 (structured-output strategy steps 1–4); `docs/plan/00_PROGRESS_LOG.md` §3.3 (prices).
- External docs: https://platform.openai.com/docs/api-reference/chat/create (request and streaming chunk format).
- **Files to read first:** `packages/ai/src/core/{provider.ts,errors.ts,types.ts}`, `packages/ai/src/providers/sse-parser.ts`; `legacy/prototype/src/ai/providers/openai-provider.ts`.
- **Files to create:** `packages/ai/src/providers/openai-compatible-provider.ts`, `packages/ai/src/providers/pricing.ts`, `packages/ai/src/providers/openai-compatible-provider.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `core/*`, `sse-parser.ts`.
- Env vars: none here (keys are passed in by the factory).

## 3. Design notes
```ts
export interface OpenAICompatibleOptions {
  providerKey: string;            // "openai" | "gemini" | "workers-ai" | …
  model: string;
  baseUrl: string;                // no trailing slash
  apiKey: string;
  jsonSchema: boolean;            // capabilities.jsonSchema
  fetch?: typeof fetch;           // injected in tests
}
export class OpenAICompatibleProvider implements AIProvider { constructor(options: OpenAICompatibleOptions); /* id = `${providerKey}:${model}` */ }
// pricing.ts
export interface Price { inputPerMTokUsd: number; outputPerMTokUsd: number }
export const PRICES: Record<string, Price>;            // keyed by provider id
export function costMicroUsd(providerId: string, usage: Usage): number;   // unknown id → 0; result rounded up to an integer
```

- `PRICES` initial entries (source and date in a comment: `00_PROGRESS_LOG.md` §3.3, 2026-11-14): `openai:gpt-5-nano` 0.05 / 0.40; `openai:gpt-5-mini` 0.25 / 2.00; `gemini:gemini-3.5-flash-lite` 0.30 / 2.50; every `workers-ai:*` id 0 / 0 (covered by the free daily allocation; S-R1-061 revisits). micro-USD = tokens × USD per million tokens (numerically the same number), summed and rounded up.
- Request body: `{ model, messages, max_tokens: maxOutputTokens, temperature: temperature ?? 0.3, stream }`; for streams add `stream_options: { include_usage: true }`. Headers: `Authorization: Bearer <apiKey>`, `Content-Type: application/json`. `userId` and `facts` are never sent.
- `generateText`: `POST {baseUrl}/chat/completions`; text = `choices[0].message.content`; usage from `usage.prompt_tokens` / `completion_tokens` (missing → `estimateTokens`).
- `streamText`: same with `stream: true`; for each parsed chunk yield `{ type: "delta", text: choices[0].delta.content }` when non-empty; remember `usage` if a chunk carries it; finish with `{ type: "done", usage, providerId }`.
- `generateStructured` (strategy from `05` §9): with `jsonSchema` → `response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema: z.toJSONSchema(schema) } }`; otherwise `response_format: { type: "json_object" }` and append to the system message: "Reply with one JSON object that matches this JSON Schema: <schema>". Parse the content (strip a surrounding ```json fence if present), validate with Zod. On failure retry **once**, appending a user message "Your previous reply was invalid: <first 300 characters of the Zod error>. Reply with corrected JSON only." Second failure → `AiError("INVALID_OUTPUT")`. Usage is summed across both attempts.
- Error mapping: `AbortError` → `ABORTED`; HTTP 429 → `RATE_LIMITED`; HTTP ≥ 500 or network error → `UPSTREAM`; other 4xx → `UPSTREAM` with the status in the message. Never include the API key or the request body in an error message.
- Edge cases: empty `choices`; `content: null`; a stream that ends without `[DONE]`; `stream_options` rejected with HTTP 400 by a vendor → retry once without it.

## 4. Steps
1. `pricing.ts` with tests.
2. Adapter with a `fakeFetch` that returns scripted `Response` objects (JSON and streamed bodies).
3. Export; all tests pass.
4. Commit: `feat(ai): implement OpenAI-compatible adapter (S-R1-036)`.

## 5. Acceptance criteria
- AC1: Given a scripted completion, then `generateText` returns the text, usage and id `"openai:gpt-5-mini"`, and the outgoing body contains neither `userId` nor `facts`.
- AC2: Given a scripted stream of five chunks and a usage chunk, then deltas concatenate to the full text and `done.usage` matches.
- AC3: Given invalid JSON then valid JSON, then `generateStructured` returns data after exactly two HTTP calls; given invalid twice, then `AiError` kind `INVALID_OUTPUT`.
- AC4: Given `jsonSchema: false`, then the request uses `json_object` and the system message contains the schema.
- AC5 (negative): Given HTTP 429 → kind `RATE_LIMITED`; HTTP 503 → `UPSTREAM`; aborted signal → `ABORTED`.
- AC6 (negative): Given any thrown error, then its message does not contain the API key.
- AC7: `costMicroUsd("openai:gpt-5-mini", { inputTokens: 1500, outputTokens: 300 })` is 975.

## 6. Tests to write
`openai-compatible-provider.test.ts`: AC1–AC7; "fenced JSON is accepted"; "missing usage falls back to an estimate".

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
- `z.toJSONSchema` is missing in the installed Zod version: stop and report (the plan pins Zod 4).
- A test would need a real API key: stop — tests use `fakeFetch` only. Live checks belong to S-R1-061 and S-R1-094.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Timeouts and retries (`S-R1-038`); provider selection (`S-R1-042`); Anthropic's native API (`S-R3-022`).
