# S-R1-053 — Implement housing agent

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-043, S-R1-051, S-R1-052 |
| Blocks | S-R1-056, S-R1-060 |
| Executor tier | Tier-2 — follows the pattern set by the planning agent |
| Platforms | backend |
| Parallel-safe with | S-R1-054, S-R1-055, S-R1-057 |

## 1. Why
The housing agent explains a verdict the code already computed, in plain words, and answers "can I afford…" in chat. It never produces a number or a verdict of its own (spec §3.5, §23).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §5 (intent `AFFORDABILITY`, workflow `HOUSING_EXPLAIN`), §9.
- **Files to read first:** `packages/ai/src/agents/{base-agent.ts,planning-agent.ts}`, `packages/ai/src/providers/heuristic/housing-explanation.ts`, `packages/ai/src/guardrails/output-guardrails.ts`; `legacy/prototype/src/agents/housing-agent/housing-agent.ts`.
- **Files to create:** `packages/ai/src/agents/housing-agent.ts`, `packages/ai/src/prompts/housing-explain.ts`, `packages/ai/src/agents/housing-agent.test.ts`.
- **Files to modify:** `packages/ai/src/prompts/prompt-registry.ts`, `packages/ai/src/prompts/prompts.test.ts`, `packages/ai/src/agents/agent-registry.ts`, `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/**`, guardrails.
- Env vars: none.

## 3. Design notes
- Chat side — `class HousingAgent extends BaseAgent`: `name = "housing"`; `intents = ["AFFORDABILITY"]`; `tier()` → `"CHEAP"`; `selectTools(input)`: always `getHousingOptions`; additionally `estimateFromRent({ rentMinor })` when the message contains exactly one amount (parse with `extractNumbers`; convert with `toMinor(amount, userContext.currency)`) **and** the user has no saved option; `buildPrompt` renders `concierge-reply` with `agentName: "housing"`; `fallback(input, facts)`:
  - with saved options → one line per option: "{label}: {monthly} a month, {verdict words}." (max three), then "Open Housing to compare them.";
  - with a rough estimate → "Rough estimate for rent of {rent}: about {monthly} a month and {moveIn} to move in, assuming {assumptions}. Enter the real costs in Housing for an exact answer.";
  - with neither → "Add a place in Housing with its rent and fees and I'll tell you if it fits your budget."
  - Verdict words: COMPATIBLE "within your housing budget", TIGHT "slightly over your housing budget", OVER "over your housing budget", UNKNOWN "no housing budget set".
  - Amounts are formatted with `Intl.NumberFormat(locale, { style: "currency", currency })` from minor units; the disclaimer is appended by the output chain.
- Workflow side:

```ts
export interface ExplainInput { evaluation: HousingEvaluation; housingBudgetMinor: number | null; locale: string; budgetLevel: BudgetLevel; userId?: string }
export interface ExplainResult { text: string; tips: string[]; source: "template" | "ai"; providerId: string; guardrailsFired: string[] }
export function explainHousing(input: ExplainInput, deps: { providers: ProviderSet; prompts: PromptRegistry }): Promise<ExplainResult>;
```

- `explainHousing`: build `facts = { evaluation, housingBudgetMinor, locale }` → `provider.generateStructured({ task: "HOUSING_EXPLAIN", schema: HousingExplanationSchema, schemaName: "housing_explanation", maxOutputTokens: 300, facts, … })` on tier `CHEAP`. Then run `createOutputChain()` over `explanation` and over each tip with `intent: "AFFORDABILITY"` and the same facts. Any block, any `AiError`, or `providerId === "heuristic"` → return the template from `explainEvaluation(...)` with `source: "template"`. Otherwise `source: "ai"`.
- Prompt `housing-explain` v1: system = "Explain a housing affordability result in two or three short sentences and up to four practical tips. The verdict is already decided; do not change it or add numbers." + `safetyRules(locale)`; user = `"FACTS:\n" + JSON.stringify(facts)`. No user message, no conversation — nothing untrusted enters this prompt.
- The explanation never sees the pasted listing text (`05` §14 point 6).
- Edge cases: verdict `UNKNOWN` → the template suggests adding a housing budget; risk keys present → the tips include "Verify the landlord and lease before any payment." (template side); AI text mentioning a number not in the evaluation → template.

## 4. Steps
1. Prompt + fingerprint.
2. Agent + `explainHousing` with `FakeProvider` tests.
3. Register in the default registry.
4. Commit: `feat(ai): implement housing agent (S-R1-053)`.

## 5. Acceptance criteria
- AC1: Given a scripted valid explanation using only numbers from the evaluation, then `source` is `"ai"` and the text ends with the housing disclaimer.
- AC2: Given a scripted explanation containing "$999" that is not in the evaluation, then `source` is `"template"`.
- AC3: Given chat "can I afford rent of 1100?" with no saved options, then tools include `estimateFromRent` with `rentMinor` 110000 and the fallback text contains "Rough estimate".
- AC4 (negative): Given a scripted chat reply "This listing is verified and available now.", then the stream is replaced by the fallback.
- AC5 (negative): Given level `EXHAUSTED`, then `explainHousing` returns the template and no non-heuristic provider is called.

## 6. Tests to write
`housing-agent.test.ts`: AC1–AC5; "fallback lists at most three options"; "prompt fingerprint registered".

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
- The schema would need a verdict or amount field for the model to fill: stop — forbidden by design.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Listing extraction (`S-R1-054`); API wiring (`S-R1-060`).
