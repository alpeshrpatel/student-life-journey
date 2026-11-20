# S-R1-051 — Implement base agent template

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-045, S-R1-046, S-R1-048, S-R1-049 |
| Blocks | S-R1-052 to S-R1-055 |
| Executor tier | Tier-2 — one template method with sentence-gated streaming |
| Platforms | backend |
| Parallel-safe with | S-R1-047, S-R1-050 |

## 1. Why
Every agent follows the same steps: run tools, build facts, render a prompt, stream from a provider, check each sentence, fall back deterministically. Writing that once (Template Method) makes a new agent about forty lines (`05_AI_ARCHITECTURE.md` §15).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (`BaseAgent`, `AgentEvent` — binding), §4 (sentence-gated streaming paragraph), §13.
- **Files to read first:** `packages/ai/src/tools/tool-registry.ts`, `packages/ai/src/context/context-builder.ts`, `packages/ai/src/guardrails/output-guardrails.ts`, `packages/ai/src/core/types.ts`.
- **Files to create:** `packages/ai/src/agents/base-agent.ts`, `packages/ai/src/agents/agent-registry.ts`, `packages/ai/src/agents/sentence-gate.ts`, `packages/ai/src/agents/base-agent.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** guardrails, providers.
- Env vars: none.

## 3. Design notes
```ts
export interface AgentInput {
  message: string;                 // already redacted by the input chain
  intent: Intent; userContext: UserContext;
  history: ChatMessage[]; summary: string | null;
  locale: string; budgetLevel: BudgetLevel;
}
export interface AgentDeps {
  tools: ToolRegistry; toolContext: ToolContext;
  providers: ProviderSet; prompts: PromptRegistry;
  outputChain: GuardrailChain; contextBuilder: ContextBuilder;
  signal?: AbortSignal;
}
export class AgentRegistry { register(agent: BaseAgent): void; forIntent(intent: Intent): BaseAgent | null; list(): string[] }
// sentence-gate.ts
/** Buffers deltas and releases complete sentences (ending in . ! ? or a newline). flush() returns the remainder. */
export class SentenceGate { push(delta: string): string[]; flush(): string }
```

- `BaseAgent.run(input, deps)` (an `async function*`), exactly these steps:
  1. `calls = this.selectTools(input)` → `results = await deps.tools.executeAll(calls, deps.toolContext)` → `facts = toFacts(results)` plus `facts.intent = input.intent`.
  2. `tier = this.tier(input.intent)`. If `tier` resolution is not needed because the agent returns `null` from `buildPrompt` (tool-only intents), go to step 6 with `fallbackUsed: false` and the text from `this.fallback(input, facts)` marked as a template reply (`providerId: "template"`).
  3. `built = deps.contextBuilder.build({ userContext, facts, summary, history, message })`; `prompt = this.buildPrompt({ ...input, history: built.history, summary: built.summary, message: built.message }, built.facts)`.
  4. `provider = deps.providers.forTier(tier, input.budgetLevel)`; `stream = provider.streamText({ task: "CONCIERGE_REPLY", messages, facts, maxOutputTokens: 500, promptId, promptVersion, userId, signal })`.
  5. For each delta → `SentenceGate.push` → for each complete sentence run `checkSentence(sentence, { intent, facts, locale, countryCode })`. Pass → yield `{ type: "delta", text: sentence }`. Block → stop reading the stream (abort), go to the fallback path.
  6. At the end run `deps.outputChain.run({ text: full, intent, facts, … })`: a block → fallback path; a repair → if the repaired text differs from what was streamed, yield `{ type: "replace", text: repaired, reason }`.
  7. Yield `{ type: "done", text, providerId, fallbackUsed, guardrailsFired, usage }`.
  - **Fallback path:** `text = this.fallback(input, facts)`; run the output chain on it for repairs only (a block here is a programming error: log and return the generic line "I couldn't answer that safely. Try asking in a different way, or open your plan."); if anything was already streamed yield `{ type: "replace", text, reason }`, else yield it as one `delta`; then `done` with `fallbackUsed: true`.
  - Any `AiError` from the provider (the chain already tried every provider) → fallback path.
- `buildPrompt` may return `null` (change the abstract signature to `RenderedPrompt | null`) for tool-only intents.
- The agent never writes to a database and never calls `Date.now()`.
- Edge cases: the stream ends without a sentence terminator (flush the remainder as the last sentence); empty model output → fallback; abort signal → stop silently without `done`.

## 4. Steps
1. `SentenceGate` with tests (boundaries, abbreviations are not handled specially, newline handling).
2. `BaseAgent.run`, `AgentRegistry`.
3. Tests with a tiny `EchoAgent` subclass and `FakeProvider`.
4. Commit: `feat(ai): implement base agent template (S-R1-051)`.

## 5. Acceptance criteria
- AC1: Given a fake stream "First safe sentence. Second safe sentence.", then two `delta` events (one per sentence) and a `done` with `fallbackUsed: false`.
- AC2: Given a stream "Here is your plan. I've booked your ride.", then the first sentence is a `delta`, then a `replace` with the agent's fallback text, then `done` with `fallbackUsed: true` and `guardrailsFired` containing `ActionClaimGuardrail`.
- AC3: Given a provider error before any chunk, then one `delta` with the fallback text and `done` with `fallbackUsed: true`.
- AC4: Given a housing intent reply without the disclaimer, then a `replace` event carries the text with the disclaimer appended.
- AC5 (negative): Given an aborted signal mid-stream, then the generator ends without a `done` event.
- AC6: Given a failed tool, then `facts.unavailable` lists it and the run still completes.

## 6. Tests to write
`base-agent.test.ts`: AC1–AC6; `SentenceGate` unit tests; "AgentRegistry returns null for an unknown intent".

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
- A subclass would need to override `run`: stop — extend the template with a hook instead and report.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Concrete agents (`S-R1-052` to `S-R1-055`); persistence and SSE (`S-R1-058`).
