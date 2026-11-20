# S-R1-034 — Add fake provider for tests

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | test |
| Size | XS (<30 min) |
| Priority | P0 |
| Depends on | S-R1-033 |
| Blocks | S-R1-038 to S-R1-041, S-R1-062 |
| Executor tier | Tier-1 — a scripted test double |
| Platforms | backend |
| Parallel-safe with | S-R1-035, S-R1-043 to S-R1-046, S-R1-048 |

## 1. Why
Tests and evals must never call a real model (ADR-0022). A scripted provider lets every later story test timeouts, bad JSON and unsafe replies deterministically.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3, §12.
- **Files to read first:** `packages/ai/src/core/{provider.ts,errors.ts}`.
- **Files to create:** `packages/ai/src/providers/fake-provider.ts`, `packages/ai/src/providers/fake-provider.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `core/*`.
- Env vars: none.

## 3. Design notes
```ts
export type FakeStep =
  | { text: string; usage?: Usage; delayMs?: number }           // generateText / streamText (split into chunks of ~12 characters)
  | { json: unknown; usage?: Usage }                            // generateStructured: validated against the request schema like a real provider
  | { error: AiError };                                         // thrown (for streams: thrown before the first chunk)
export interface FakeProviderOptions { id?: string; capabilities?: { jsonSchema: boolean; streaming: boolean }; steps?: FakeStep[]; fallbackText?: string }
export class FakeProvider implements AIProvider {
  constructor(options?: FakeProviderOptions);
  readonly calls: TextRequest[];                                // every request received, in order
  enqueue(...steps: FakeStep[]): void;
}
```

- Each call consumes the next step. When the queue is empty: `generateText`/`streamText` return `fallbackText` (default `"ok"`); `generateStructured` throws `AiError("INVALID_OUTPUT", "no scripted step")`.
- `generateStructured` with a `{ json }` step runs `req.schema.safeParse(json)`; failure → `AiError("INVALID_OUTPUT")`. With a `{ text }` step it tries `JSON.parse(text)` first (to script malformed JSON).
- Default usage: `{ inputTokens: estimateTokens(all message content), outputTokens: estimateTokens(text) }`.
- `delayMs` waits with `setTimeout` and rejects with `AiError("ABORTED")` if `req.signal` aborts first.
- `id` defaults to `"fake"`.

## 4. Steps
1. Implement; test; export.
2. Commit: `test(ai): add fake provider for tests (S-R1-034)`.

## 5. Acceptance criteria
- AC1: Given steps `[{ text: "Hello there." }]`, when `streamText` is consumed, then concatenated deltas equal `"Hello there."` and the last chunk is `done` with `providerId` `"fake"`.
- AC2: Given `{ json: { intent: "GENERAL", confidence: 1 } }` and `IntentClassificationSchema`-like schema, then `generateStructured` returns the parsed data.
- AC3 (negative): Given `{ json: { intent: "NOPE" } }`, then `AiError` with kind `INVALID_OUTPUT` is thrown.
- AC4 (negative): Given `{ error: new AiError("TIMEOUT", "t") }`, then that error is thrown and `calls.length` is 1.
- AC5: Given `delayMs: 1000` and a signal aborted after 10 ms, then the call rejects with kind `ABORTED`.

## 6. Tests to write
`fake-provider.test.ts`: AC1–AC5; "records requests in order".

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
- None expected. If `AsyncIterable` typing fights the `StreamChunk` union, write the stream as an `async function*`.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Real adapters (`S-R1-036`); eval runner (`S-R1-062`).
