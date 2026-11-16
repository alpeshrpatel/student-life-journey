# S-R1-052 — Implement planning agent

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-043, S-R1-051 |
| Blocks | S-R1-056, S-R1-059 |
| Executor tier | Tier-3 — prompt design plus post-validation rules on generated tasks |
| Platforms | backend |
| Parallel-safe with | S-R1-053, S-R1-054, S-R1-055, S-R1-057 |

## 1. Why
The planning agent answers "what should I do now" in chat and personalises the baseline plan in the background (better reasons, up to five extra tasks). The baseline always stands if the model fails (`05_AI_ARCHITECTURE.md` §5).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §5 (intents `TODAY_PLAN`, `TOP_TASKS`, `FLIGHT_PREP`; workflow `PLAN_ENHANCE`), §9 (business rules after Zod), §11.
- **Files to read first:** `packages/ai/src/agents/base-agent.ts`, `packages/ai/src/schemas/plan-enhancement.ts`, `packages/ai/src/providers/heuristic/concierge-replies.ts`; `legacy/prototype/src/agents/relocation-agent/relocation-agent.ts`.
- **Files to create:** `packages/ai/src/agents/planning-agent.ts`, `packages/ai/src/agents/plan-enhancement-rules.ts`, `packages/ai/src/prompts/plan-enhance.ts`, `packages/ai/src/prompts/concierge-reply.ts` (shared chat prompt; the housing and concierge agents reuse it), `packages/ai/src/agents/planning-agent.test.ts`.
- **Files to modify:** `packages/ai/src/prompts/prompt-registry.ts`, `packages/ai/src/prompts/prompts.test.ts`, `packages/ai/src/agents/agent-registry.ts` (export `createDefaultAgentRegistry()` and register this agent), `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- Chat side — `class PlanningAgent extends BaseAgent`: `name = "planning"`; `intents = ["TODAY_PLAN", "TOP_TASKS", "FLIGHT_PREP"]`; `tier()` → `"STRONG"`; `selectTools` per the table in `05` §5; `buildPrompt` renders `concierge-reply`; `fallback` → `conciergeFallback(intent, facts)`.
- Prompt `concierge-reply` v1 (variables: `agentName`, `digest`, `facts`, `summary`, `message`, `locale`):
  - system: "You are the {agentName} helper inside a relocation app for people moving to a new city. You help with practical, non-academic tasks." + `safetyRules(locale)` + "Reply in at most 120 words. Start with the single next action. Refer to tasks by their exact titles from FACTS."
  - user: `"CONTEXT:\n{digest}\n\nFACTS:\n{JSON.stringify(facts)}\n\n" + (summary ? "EARLIER CONVERSATION SUMMARY:\n" + summary + "\n\n" : "") + "QUESTION:\n" + wrapUntrusted(message)`.
- Workflow side:

```ts
export interface PlanEnhanceInput { userContext: UserContext; baseline: { summary: string; tasks: { templateKey: string; title: string; reason: string; phase: PlanPhase; category: TaskCategory }[] }; locale: string; budgetLevel: BudgetLevel }
export interface PlanEnhanceResult { enhancement: PlanEnhancement; providerId: string; applied: boolean }   // applied=false → baseline stands
export function enhancePlan(input: PlanEnhanceInput, deps: { providers: ProviderSet; prompts: PromptRegistry; contextBuilder: ContextBuilder }): Promise<PlanEnhanceResult>;
// plan-enhancement-rules.ts
export function applyPlanEnhancementRules(raw: PlanEnhancement, baseline: PlanEnhanceInput["baseline"]): { clean: PlanEnhancement; dropped: string[] };
```

- `enhancePlan`: `provider.generateStructured({ task: "PLAN_ENHANCE", schema: PlanEnhancementSchema, schemaName: "plan_enhancement", maxOutputTokens: 1200, facts: { baselineSummary: baseline.summary }, … })` with prompt `plan-enhance` v1. `AiError` → `{ enhancement: { summary: baseline.summary, reasons: [], extraTasks: [] }, providerId: "heuristic", applied: false }`. When the answering provider is `heuristic`, `applied` is also false.
- Prompt `plan-enhance` v1: system = role ("You personalise a relocation checklist. You may rewrite reasons and suggest at most five extra tasks. You may not remove or rename tasks.") + `safetyRules(locale)` + "Extra tasks must be practical, non-academic, contain no prices, no brand names and no links."; user = digest + the baseline tasks as a compact list `templateKey | title | phase`.
- `applyPlanEnhancementRules` (from `05` §9): drop `reasons` whose `templateKey` is not in the baseline; drop extra tasks whose title duplicates a baseline title (case-insensitive, trimmed), or contains a URL, a currency amount (`extractNumbers` non-empty with a currency mark), or an academic term (reuse the scope keyword list from the input guardrails); truncate nothing silently — dropped items are listed in `dropped` as `"reason:<key>"` / `"task:<title>"`. The summary must pass `createOutputChain()` with `facts = { baseline }`; if blocked, keep the baseline summary.
- Edge cases: model returns zero changes; model returns five extra tasks all invalid → `applied: true` with empty extras is fine; `EXHAUSTED` level → heuristic → `applied: false`.

## 4. Steps
1. Prompts with fingerprints.
2. Rules with table tests.
3. Agent and `enhancePlan` with `FakeProvider` tests.
4. Commit: `feat(ai): implement planning agent (S-R1-052)`.

## 5. Acceptance criteria
- AC1: Given intent `TODAY_PLAN`, then the agent selects `getJourneyStatus` and `getTopPriorities` with limit 3 and the rendered prompt contains the safety rules and the wrapped message.
- AC2: Given a scripted enhancement with one valid reason, one reason for an unknown key, one valid extra task and one titled "Register for classes at https://x.y", then the clean result keeps the first and third and `dropped` lists the other two.
- AC3: Given a provider error, then `applied` is false and the summary equals the baseline summary.
- AC4 (negative): Given an extra task duplicating a baseline title in different letter case, then it is dropped.
- AC5 (negative): Given a scripted chat reply "I've scheduled your move.", then the event stream ends with the deterministic fallback listing the top priorities.

## 6. Tests to write
`planning-agent.test.ts`: AC1–AC5; "FLIGHT_PREP selects open pre-arrival tasks"; "prompt fingerprints registered for concierge-reply and plan-enhance".

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
- The model would be allowed to delete, rename or re-prioritise baseline tasks: stop — only reasons and extras are in scope.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Writing enhancement results to the database (`S-R1-059`); other agents.
