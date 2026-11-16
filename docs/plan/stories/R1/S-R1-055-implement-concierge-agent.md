# S-R1-055 — Implement concierge agent

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Concierge |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-043, S-R1-051, S-R1-052 |
| Blocks | S-R1-056 |
| Executor tier | Tier-2 — follows the agent pattern; content needs care |
| Platforms | backend |
| Parallel-safe with | S-R1-053, S-R1-054, S-R1-057 |

## 1. Why
The concierge handles everything that is not planning or housing: getting around, a first shopping list, general questions — and it is the generalist that R4's specialist agents will later take topics from (`05_AI_ARCHITECTURE.md` §5, §16).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §5 (rows `SHOPPING_LIST`, `TRANSPORTATION`, `GENERAL`, `PLACES`), §10 (workflow `CONVERSATION_SUMMARY`).
- **Files to read first:** `packages/ai/src/agents/{base-agent.ts,planning-agent.ts}`, `packages/ai/src/prompts/concierge-reply.ts`, `packages/ai/src/providers/heuristic/concierge-replies.ts`; `legacy/prototype/src/agents/concierge-agent/concierge-agent.ts`.
- **Files to create:** `packages/ai/src/agents/concierge-agent.ts`, `packages/ai/src/prompts/conversation-summary.ts`, `packages/ai/src/reply-templates.ts`, `packages/ai/src/agents/concierge-agent.test.ts`.
- **Files to modify:** `packages/ai/src/prompts/prompt-registry.ts`, `packages/ai/src/prompts/prompts.test.ts`, `packages/ai/src/agents/agent-registry.ts`, `packages/ai/src/index.ts`.
- **Files you must NOT touch:** guardrails.
- Env vars: none.

## 3. Design notes
- `class ConciergeAgent extends BaseAgent`: `name = "concierge"`; `intents = ["SHOPPING_LIST", "TRANSPORTATION", "GENERAL", "PLACES"]`; `tier()` → `"STRONG"`.
  - `selectTools`: `PLACES` → `searchEssentialPlaces({ category })` with the category from `placeCategoryFromMessage(message)` (keywords: pharmacy/medicine → PHARMACY; doctor/clinic/hospital → HEALTHCARE; laundry/laundromat → LAUNDRY; bus/train/metro/station/stop → TRANSIT; otherwise GROCERY); `GENERAL` → `getJourneyStatus`, `getTopPriorities(3)`; others → `getJourneyStatus`.
  - `buildPrompt`: `PLACES` → `null` (tool-only: the reply is a template, no model call); others → `concierge-reply` with `agentName: "concierge"`.
  - `fallback`: `PLACES` → `placesReply(facts, locale)`; others → `conciergeFallback(intent, facts)`.
- `reply-templates.ts` (exact exports):

```ts
export function placesReply(facts: Facts, locale: string): string;
export function placeCategoryFromMessage(message: string): PlaceCategory;
export const GENERIC_SAFE_REPLY = "I couldn't answer that safely. Try asking in a different way, or open your plan.";
export function suggestedQuestions(userContext: UserContext): string[];     // three questions that fit the journey phase and housing status
```

  `placesReply`: with results → "Closest {category words} to {near}:" + up to four lines "{name} — {distance}" + "Source: {source}, checked {date}." + "Open Places to save one."; when the tool is unavailable → "I can't check nearby places right now. Open Places to try again." Distances: under 1,000 m as "{n} m" rounded to 10, otherwise "{n.n} km" (imperial conversion happens in the web app, not here; the reply uses metric and the Places screen is the precise view). Demo data must say "Demo data — not real places."
  - Numbers in this template (distances) come from tool facts, so the numeric guardrail passes.
- Summary workflow:

```ts
export function summariseConversation(input: { turns: ChatMessage[]; previousSummary: string | null; locale: string; budgetLevel: BudgetLevel; userId?: string },
  deps: { providers: ProviderSet; prompts: PromptRegistry }): Promise<string | null>;
```

  `generateText` on tier `CHEAP`, task `CONVERSATION_SUMMARY`, `maxOutputTokens: 200`, prompt `conversation-summary` v1 (system: "Summarise what the user asked and what was answered, in at most 80 words. Facts only. No names, emails, addresses or numbers longer than four digits." + `safetyRules`; user: previous summary + turns, each wrapped with `wrapUntrusted`). The result is cut to 600 characters and passed through `redactPii`. Any error, the heuristic provider, or level `EXHAUSTED` → `null` (the caller keeps the last six turns only).
- Edge cases: `PLACES` with no coordinates → the tool fails → the "can't check" reply; `GENERAL` with no open tasks → "You're all caught up" status line from `conciergeFallback`.

## 4. Steps
1. Templates with tests.
2. Agent, summary workflow, prompt + fingerprint, registry.
3. Tests with `FakeProvider`.
4. Commit: `feat(ai): implement concierge agent (S-R1-055)`.

## 5. Acceptance criteria
- AC1: Given intent `PLACES` and message "nearest pharmacy", then the tool call has category `PHARMACY`, no provider call is made, and the reply lists the places with their source line.
- AC2: Given demo places, then the reply contains "Demo data".
- AC3: Given intent `GENERAL` and a safe scripted reply, then deltas stream and `done.fallbackUsed` is false.
- AC4: Given `summariseConversation` with a scripted summary containing an email address, then the returned text has `[redacted]` and at most 600 characters.
- AC5 (negative): Given a provider error in the summary call, then `null`.
- AC6: Given `createDefaultAgentRegistry()`, then every intent except `OUT_OF_SCOPE` and `EMERGENCY` resolves to an agent.

## 6. Tests to write
`concierge-agent.test.ts`: AC1–AC6; "placeCategoryFromMessage table"; "suggestedQuestions differ for SEARCHING and SECURED".

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
- A template would name a specific shop chain, transit operator or price that is not in tool facts: stop and remove it.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
The orchestrator (`S-R1-056`); conversation storage (`S-R1-057`).
