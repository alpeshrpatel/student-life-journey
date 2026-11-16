# S-R1-050 — Implement intent router chain

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-042, S-R1-043, S-R1-044 |
| Blocks | S-R1-056, S-R1-093 |
| Executor tier | Tier-2 — rules first, model second, safe default last |
| Platforms | backend |
| Parallel-safe with | S-R1-047 to S-R1-049, S-R1-051 |

## 1. Why
Most messages can be routed by simple rules at zero cost; the model is asked only when rules do not match (`05_AI_ARCHITECTURE.md` §4 step 5). The prototype logged LLM intent calls under the wrong task name (defect D-20).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §5 (intent table with rule examples; topic tags).
- **Files to read first:** `legacy/prototype/src/agents/orchestrator/intent.ts` (regex rules to port), `packages/ai/src/schemas/intent.ts`, `packages/ai/src/prompts/{types.ts,prompt-registry.ts,shared/safety-rules.ts}`.
- **Files to create:** `packages/ai/src/router/rule-intent-classifier.ts`, `packages/ai/src/router/llm-intent-classifier.ts`, `packages/ai/src/router/intent-router.ts`, `packages/ai/src/router/topic-tagger.ts`, `packages/ai/src/prompts/intent-classify.ts`, `packages/ai/src/router/router.test.ts`.
- **Files to modify:** `packages/ai/src/prompts/prompt-registry.ts` (register `intent-classify`), `packages/ai/src/prompts/prompts.test.ts` (fingerprint row), `packages/ai/src/index.ts`.
- **Files you must NOT touch:** guardrails.
- Env vars: none.

## 3. Design notes
- Pattern: Chain of Responsibility.

```ts
export type RoutedBy = "rule" | "llm" | "default";
export interface RouteResult { intent: Intent; routedBy: RoutedBy; confidence: number }
export interface IntentClassifier { classify(message: string, deps: { provider: AIProvider; locale: string; userId?: string }): Promise<Intent | null> }
export const RuleIntentClassifier: IntentClassifier;        // synchronous rules wrapped in a promise
export const LlmIntentClassifier: IntentClassifier;
export class IntentRouter {
  constructor(classifiers?: IntentClassifier[]);              // default [RuleIntentClassifier, LlmIntentClassifier]
  route(message: string, deps: { providers: ProviderSet; level: BudgetLevel; locale: string; userId?: string }): Promise<RouteResult>;
}
// topic-tagger.ts
export type Topic = "connectivity" | "safety" | "money" | "transport" | "food" | "health" | "activities" | "other";
export function tagTopic(message: string): Topic;
```

- Rule classifier (first match wins, case-insensitive; port and extend the prototype's patterns):

| Intent | Patterns (examples; write 4–8 per intent) |
|---|---|
| `AFFORDABILITY` | "can i afford", "afford (this|that|it)", "move-in cost", "too expensive", "within my budget", "rent of" + amount |
| `PLACES` | "nearest", "closest", "where can i (buy|find|get)", "near me", "pharmacy", "grocery", "laundry", "clinic", "bus stop" |
| `TODAY_PLAN` | "what should i do (today|now|next|first)", "what's next", "where do i start" |
| `TOP_TASKS` | "most important", "top (tasks|priorities)", "what matters most" |
| `FLIGHT_PREP` | "before (my|the) flight", "pack", "packing", "airport", "before i (leave|fly)" |
| `SHOPPING_LIST` | "what should i buy", "shopping list", "grocery list", "first shop" |
| `TRANSPORTATION` | "get around", "public transport", "transit", "bus pass", "commute", "bike" |

  `OUT_OF_SCOPE` and `EMERGENCY` are never produced here (input guardrails own them).
- LLM classifier: skipped when `level === "EXHAUSTED"`; otherwise `providers.forTier("CHEAP", level).generateStructured({ task: "INTENT_CLASSIFY", schema: IntentClassificationSchema, schemaName: "intent", maxOutputTokens: 20, temperature: 0, … })`. Accept the result only when `confidence >= 0.6` and the intent is not `OUT_OF_SCOPE`/`EMERGENCY`; otherwise return `null`. Any `AiError` → `null` (never fails the request).
- Prompt `intent-classify` v1: system = one line of role ("Classify the user's message about relocating into one intent.") + the list of intents with one-line meanings + `safetyRules(locale)`; user = `wrapUntrusted(message)`. `facts: {}`.
- Router: run classifiers in order; first non-null wins; none → `{ intent: "GENERAL", routedBy: "default", confidence: 0 }`.
- `tagTopic`: keyword sets per topic (connectivity: sim, esim, phone plan, wifi, internet; safety: safe, danger, scam, emergency; money: bank, budget, cash, card, cost; transport: bus, train, metro, bike, car, ride; food: grocery, eat, food, cook; health: doctor, pharmacy, clinic, insurance; activities: gym, club, friends, things to do); first match in that order, else `other`.
- Edge cases: empty message after redaction → `GENERAL`; a message matching two rules → table order decides (`AFFORDABILITY` before `PLACES`).

## 4. Steps
1. Rule classifier with a sample table (at least five positive samples per intent and ten negatives).
2. Prompt module, LLM classifier, router, topic tagger.
3. Tests with `FakeProvider` → pass.
4. Commit: `feat(ai): implement intent router chain (S-R1-050)`.

## 5. Acceptance criteria
- AC1: Given "Can I afford a place with rent of 1100?", then `AFFORDABILITY`, `routedBy: "rule"`, and the provider has zero calls.
- AC2: Given "I'm feeling a bit lost, any advice?" and a fake returning `{ intent: "TODAY_PLAN", confidence: 0.8 }`, then `TODAY_PLAN`, `routedBy: "llm"`, and the recorded request has task `INTENT_CLASSIFY`.
- AC3: Given the same message and confidence 0.3, or a provider error, then `GENERAL` with `routedBy: "default"`.
- AC4 (negative): Given level `EXHAUSTED`, then the provider is never called.
- AC5 (negative): Given a fake returning `OUT_OF_SCOPE`, then the router returns `GENERAL` (scope is decided by guardrails only).
- AC6: Given "where can I get a SIM card", then `tagTopic` is `connectivity`.

## 6. Tests to write
`router.test.ts`: AC1–AC6; sample tables; "prompt fingerprint is registered".

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
- You want to add a new intent: stop — the list is fixed for R1 (`05` §5); new intents arrive with R4 agents.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Agents and the orchestrator (`S-R1-051` to `S-R1-056`).
