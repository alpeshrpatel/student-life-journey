# S-R1-035 — Implement SSE stream parser

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-033 |
| Blocks | S-R1-036 |
| Executor tier | Tier-2 — byte-stream parsing with chunk-boundary edge cases |
| Platforms | backend |
| Parallel-safe with | S-R1-034, S-R1-043 to S-R1-046, S-R1-048 |

## 1. Why
Streaming model replies arrive as Server-Sent Events over `fetch`. Without a vendor SDK we need a small, well-tested parser that survives arbitrary chunk boundaries.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` (no SDKs); the SSE format in the WHATWG HTML standard, section "Server-sent events" (fields `data:`, `event:`, comments starting with `:`; events end with a blank line).
- **Files to read first:** `packages/ai/src/core/provider.ts`.
- **Files to create:** `packages/ai/src/providers/sse-parser.ts`, `packages/ai/src/providers/sse-parser.test.ts`.
- **Files to modify:** none (internal module; not exported from the package index).
- **Files you must NOT touch:** `core/*`.
- Env vars: none.

## 3. Design notes
```ts
export interface SseEvent { event: string | null; data: string }
/** Parses a byte stream into SSE events. Handles \n, \r\n and \r line endings, multi-line data, comments and chunk splits anywhere (including inside a UTF-8 character). */
export function parseSseStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncIterable<SseEvent>;
/** Convenience for OpenAI-style streams: yields the parsed JSON of each data line and stops at "[DONE]". Lines that are not valid JSON are skipped. */
export function parseOpenAiStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncIterable<unknown>;
```

- Use `TextDecoder("utf-8")` with `{ stream: true }` so that a multi-byte character split across chunks decodes correctly.
- Keep a string buffer; split on line ends; a blank line dispatches the accumulated event (`data` lines joined with `\n`); a line starting with `:` is ignored; `data:` may or may not be followed by one space (strip exactly one).
- On abort: cancel the reader and stop iterating without throwing.
- CPU: do not re-scan the whole buffer on every chunk (keep an index); the Worker has a 10 ms CPU budget.
- Edge cases: final event without a trailing blank line is still emitted at end of stream; an empty `data:` line yields `data: ""`; `[DONE]` with trailing spaces.

## 4. Steps
1. Write the tests first using a helper `streamOf(...chunks: (string | Uint8Array)[])` that builds a `ReadableStream`.
2. Implement both functions → pass.
3. Commit: `feat(ai): implement SSE stream parser (S-R1-035)`.

## 5. Acceptance criteria
- AC1: Given `data: {"a":1}\n\ndata: {"a":2}\n\ndata: [DONE]\n\n` in one chunk, then `parseOpenAiStream` yields `{a:1}`, `{a:2}` and ends.
- AC2: Given the same bytes split after every single byte, then the output is identical.
- AC3: Given a `data:` payload containing "é" split between its two bytes across chunks, then the decoded text contains "é".
- AC4: Given `\r\n` line endings and a comment line `: keep-alive`, then events parse correctly and the comment is ignored.
- AC5 (negative): Given a data line that is not JSON, then `parseOpenAiStream` skips it and continues.
- AC6 (negative): Given an aborted signal mid-stream, then iteration ends and the stream reader is cancelled.

## 6. Tests to write
`sse-parser.test.ts`: AC1–AC6; "multi-line data is joined with a newline"; "event field is captured".

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
- You are about to add the `eventsource-parser` package: allowed only if this story overruns two hours; record the decision in the PR and keep the same exported functions.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The HTTP adapter (`S-R1-036`); the client-side SSE reader (`S-R1-080`).
