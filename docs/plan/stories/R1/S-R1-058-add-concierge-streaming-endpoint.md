# S-R1-058 — Add concierge streaming endpoint

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Concierge |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-023, S-R1-047, S-R1-056, S-R1-057, S-R0-043 |
| Blocks | S-R1-080, S-R1-085, S-R1-087 |
| Executor tier | Tier-3 — streaming, persistence in `waitUntil`, budgets and CPU limits meet here |
| Platforms | backend |
| Parallel-safe with | S-R1-059, S-R1-060, S-R1-065 to S-R1-070 |

## 1. Why
This is the route behind the Chat tab: one message in, one grounded reply out, streamed sentence by sentence (spec §3.1, §25.14–15).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §4 (lifecycle; **variant rule** in the last paragraph), §11, §13; `docs/plan/adr/ADR-0011-api-style-and-contract-sharing.md` (SSE events); `docs/spikes/S-R0-043-worker-cpu.md` (**read the verdict first**).
- **Files to read first:** `packages/ai/src/orchestrator.ts`, `apps/api/src/modules/planning/user-context-service.ts`, `apps/api/src/modules/concierge/ports.ts`, `apps/api/src/infra/ai/{budget-port.ts,ai-call-sink.ts,tool-ports.ts}`, `apps/api/src/modules/usage/budget-service.ts`; `legacy/prototype/src/modules/concierge/concierge-service.ts`.
- **Files to create:** `packages/contracts/src/concierge.ts`, `apps/api/src/infra/ai/ai-wiring.ts`, `apps/api/src/modules/concierge/concierge-service.ts`, `apps/api/src/http/routes/concierge.ts`, `apps/api/test/concierge.test.ts`.
- **Files to modify:** `packages/contracts/src/index.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/app.ts`, `apps/api/test/helpers/fakes.ts` (a `fakeProviderSet(steps)` helper and a container override for it).
- **Files you must NOT touch:** `packages/ai/**` (report gaps instead).
- Env vars: none new.

## 3. Design notes
- Contract (exact):

```ts
export const ConciergeMessageRequestSchema = z.object({ message: z.string().trim().min(1).max(1000) });
export const ConciergeMetaSchema = z.object({
  intent: z.string(), agent: z.string(), topic: z.string(),
  budgetLevel: z.enum(["NORMAL", "ECONOMY", "EXHAUSTED"]),
});
export const ConciergeDoneSchema = z.object({
  messageId: z.string(), text: z.string(), fallbackUsed: z.boolean(),
  actions: z.array(z.object({ label: z.string(), screen: z.enum(["housing", "tasks", "places", "plan"]) })).max(2),
});
export const ConciergeReplySchema = z.object({ meta: ConciergeMetaSchema, reply: ConciergeDoneSchema });           // non-streamed variant
export const ConversationMessageSchema = z.object({ id: z.string(), role: z.enum(["USER", "ASSISTANT"]), content: z.string(), agent: z.string().nullable(), createdAt: IsoInstantSchema });
export const ConversationResponseSchema = z.object({ messages: z.array(ConversationMessageSchema).max(50), suggestions: z.array(z.string()).max(3), budgetLevel: z.enum(["NORMAL", "ECONOMY", "EXHAUSTED"]) });
```

- Routes (all `requireSession`): `POST /api/v1/concierge/messages`; `GET /api/v1/concierge/conversation`; `DELETE /api/v1/concierge/conversation` → 204.
- **Variant choice:** if the spike verdict on the board is PASS (or the plan is Workers Paid) → streamed variant: the client sends `Accept: text/event-stream` and receives SSE; if the verdict is FAIL or INCONCLUSIVE → the route always returns JSON `ConciergeReplySchema`. Implement the JSON variant in **both** cases (it is also the answer when the client sends `Accept: application/json`, and it is what tests use most); add SSE only when allowed.
- SSE format: `event: meta` / `delta` / `replace` / `done` / `error`, each with one `data:` line of JSON (`{ "text": "…" }` for `delta` and `replace`). Headers: `Content-Type: text/event-stream`, `Cache-Control: no-store`, `X-Accel-Buffering: no`. Use Hono's `streamSSE`.
- `ConciergeService.handle(user, message, signal)` → `AsyncIterable<OrchestratorEvent & …>`:
  1. Flags: `aiEnabled` false or `conciergeEnabled` false → budget level forced to `EXHAUSTED` (heuristic replies still work).
  2. One read batch (≤ 2 database calls with the session): user snapshot (S-R1-020/045), conversation state, and both budget counters.
  3. `budget.consume(userId, "concierge_msgs")`; not allowed → level `EXHAUSTED`. Else `level = aiBudgetLevel` result.
  4. Build per-request wiring with `createAiWiring(container, { level, userId })` from `ai-wiring.ts`: `RequestBudgetPort`, `BufferedAiCallSink`, `createProviderSet({...env chains, sink, budget, breakers: MODULE_LEVEL_REGISTRY, now })`, `createOrchestrator({ providers })`, `createToolPorts`.
  5. `memory = buildMemoryView(state)`; run `orchestrator.handleMessage({ message, userContext, history: memory.history, summary: memory.summary, budgetLevel: level, toolContext, signal })` and forward events.
  6. On `done`: compute `actions` (intent `AFFORDABILITY` → "Open Housing"; `PLACES` → "Open Places"; `TODAY_PLAN`/`TOP_TASKS`/`FLIGHT_PREP` → "Open Tasks"; else none); then **persist in `ctx.waitUntil`** in one unit of work: `stageTurn` (redacted user text, final assistant text, agent, intent), `sink.flush` (annotations: intent, topic, guardrails, level), `budgetPort.flush`. If `memory.needsSummary`, call `summariseConversation` first (still inside `waitUntil`) and stage the summary.
  7. A unique-index failure on conversation creation → reload and retry the batch once.
- `GET conversation`: last 50 messages + `suggestedQuestions(userContext)` + current level. `DELETE`: `clear`.
- Client disconnect: pass `c.req.raw.signal`; when aborted nothing is stored.
- Budget: ≤ 4 database calls before the first byte; persistence adds 1–2 in `waitUntil`.
- Edge cases: not onboarded → `ONBOARDING_REQUIRED`; message of 1,001 characters → 422 (schema) before any work; persistence failure → logged with the request ID, reply already delivered.

## 4. Steps
1. Contract; wiring module; service; JSON route; conversation routes.
2. SSE branch if the spike verdict allows.
3. Tests with `fakeProviderSet` (no network) → pass.
4. Commit: `feat(api): add concierge streaming endpoint (S-R1-058)`.

## 5. Acceptance criteria
- AC1: Given an onboarded user and "What should I do today?", then the JSON variant returns `meta.intent` `TODAY_PLAN` and a reply; afterwards the conversation holds two messages and one or more `ai_call` rows exist.
- AC2 (streamed variant only): Given `Accept: text/event-stream`, then the body contains `event: meta`, one or more `event: delta` and a final `event: done` whose `text` equals the concatenated deltas (or the last `replace`).
- AC3: Given a scripted unsafe reply, then the stored assistant message is the fallback text and the `ai_call` row has outcome `blocked` or `fallback`.
- AC4: Given 40 messages today, then the 41st is answered by the heuristic with `budgetLevel: "EXHAUSTED"` and HTTP 200.
- AC5: Given a message containing an email address, then the stored user message contains `[redacted]`.
- AC6 (negative): Given user B, then `GET conversation` never returns A's messages; given no session → 401.
- AC7 (negative): Given `conciergeEnabled: false`, then replies come from the heuristic and no non-heuristic provider is called.
- AC8: `x-db-calls` ≤ 4 for the POST (excluding `waitUntil` work).

## 6. Tests to write
`apps/api/test/concierge.test.ts`: AC1–AC8 (AC2 only when SSE is implemented); "DELETE clears the conversation"; "emergency message makes no provider call and is still stored redacted".

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
curl -N -H "Accept: text/event-stream" -H "Cookie: <dev session>" -H "Content-Type: application/json" \
  -d '{"message":"What should I do today?"}' http://localhost:8787/api/v1/concierge/messages   # expected: meta, delta…, done events (streamed variant)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The spike report is missing: stop — S-R0-043 must be DONE; if it is INCONCLUSIVE build the JSON variant only and say so on the board.
- `waitUntil` work is lost in tests: await it in `test` only through the helper used in S-R1-014.
- The route needs more than 4 database calls before responding: stop and report which reads cannot be batched.

## 10. Rollback / undo note
`git revert`, or set `conciergeEnabled` to false (heuristic replies) without a deploy of code.

## 11. Out of scope
The chat screen and client SSE reader (`S-R1-080`); feedback thumbs (`S-R1-085` event only); tool-writing actions from chat (parked).
