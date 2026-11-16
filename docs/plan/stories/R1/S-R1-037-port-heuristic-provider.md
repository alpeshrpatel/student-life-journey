# S-R1-037 — Port heuristic provider

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | refactor |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-009, S-R1-033, S-R1-044 |
| Blocks | S-R1-042 |
| Executor tier | Tier-2 — deterministic text from facts; must never invent |
| Platforms | backend |
| Parallel-safe with | S-R1-036, S-R1-038 to S-R1-041, S-R1-045 to S-R1-049 |

## 1. Why
With no API key, an exhausted budget or every vendor down, the product must still answer (hard constraint: offline fallback preserved). The heuristic provider is the last link of every chain and answers only from the `facts` it is given.

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §3 (`TextRequest.facts`), §5 (fallback reply source per intent), §13; `docs/plan/15_CODEBASE_DISPOSITION.md` (heuristic files: REFACTOR).
- **Files to read first:** `legacy/prototype/src/ai/providers/heuristic/{provider.ts,concierge-brain.ts}`, `packages/ai/src/core/provider.ts`, `packages/ai/src/schemas/*.ts`.
- **Files to create:** `packages/ai/src/providers/heuristic-provider.ts`, `packages/ai/src/providers/heuristic/concierge-replies.ts`, `packages/ai/src/providers/heuristic/housing-explanation.ts`, `packages/ai/src/providers/heuristic-provider.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** `packages/domain/**`.
- Env vars: none.

## 3. Design notes
- `export class HeuristicProvider implements AIProvider` — `id = "heuristic"`, `capabilities = { jsonSchema: true, streaming: true }`, usage always `{ inputTokens: 0, outputTokens: 0 }`, no network, no randomness, no clock.
- Behaviour by `req.task`, reading only `req.facts` (shape documented per task; unknown or missing facts lead to the generic line, never to a guess):

| Task | Facts read | Output |
|---|---|---|
| `INTENT_CLASSIFY` | — | `{ intent: "GENERAL", confidence: 0 }` |
| `PLAN_ENHANCE` | `baselineSummary: string` | `{ summary: baselineSummary, reasons: [], extraTasks: [] }` (the baseline stands) |
| `HOUSING_EXPLAIN` | `evaluation: HousingEvaluation`, `housingBudgetMinor`, `locale` | `{ explanation, tips }` from `housing-explanation.ts` |
| `LISTING_EXTRACT` | — | `{ fields: [], riskSignals: [] }` (the regex extractor in S-R1-054 is the real fallback) |
| `CONCIERGE_REPLY` | `intent`, `journey`, `topPriorities`, `openTasks`, `housingOptions`, `destination`, `transportPrefs` | Text from `concierge-replies.ts` |
| `CONVERSATION_SUMMARY` | — | empty string |

- `housing-explanation.ts`: `explainEvaluation(evaluation, formatAmount): { explanation: string; tips: string[] }` — one sentence per verdict ("This place costs {monthly} a month, {pct}% of your housing budget of {budget}." / "…{over} over your housing budget." / "Add a housing budget in Settings to get a verdict."), one sentence for the move-in total, and one tip per cost flag (fixed text per `CostFlag`). `formatAmount(minor, currency)` is passed in through facts-independent code: use `Intl.NumberFormat(locale, { style: "currency", currency })` with `toMajor`.
- `concierge-replies.ts`: `conciergeFallback(intent, facts): string` implementing the "Fallback reply source" column of `05` §5 — for example `TODAY_PLAN`: "Here is what matters most right now:" + up to three numbered titles with their reasons; `GENERAL`: status line ("{n} days until you land in {destination}.") + "You can ask me: What should I do today? Can I afford this place? Where is the nearest pharmacy?"; `TRANSPORTATION`: generic guidance per transport preference with no prices and no operator names; `SHOPPING_LIST`: the static first-shop list (12 generic items).
- `streamText` yields the same text in sentence-sized chunks.
- Port the wording ideas from the prototype but remove anything academic ("study/work blocks", "school address" — defect D-22), every price, every brand.
- Every amount in output text must come from `facts` (the output guardrails will verify this later).

## 4. Steps
1. Implement the two helper modules with unit tests.
2. Implement the provider; export.
3. Tests → pass.
4. Commit: `refactor(ai): port heuristic provider (S-R1-037)`.

## 5. Acceptance criteria
- AC1: Given `CONCIERGE_REPLY` with intent `TODAY_PLAN` and three priorities in facts, then the text lists exactly those three titles in order.
- AC2: Given `HOUSING_EXPLAIN` with a TIGHT evaluation, then the explanation contains the monthly total and the percentage from the evaluation and no other number of three or more digits.
- AC3: Given `PLAN_ENHANCE`, then the result validates against `PlanEnhancementSchema` and has no extra tasks.
- AC4 (negative): Given empty facts for any task, then the provider returns a generic safe reply and does not throw.
- AC5 (negative): Given all outputs produced in the tests, then none contains `http`, a currency symbol not derived from facts, or the words `verified`, `available`, `booked`.

## 6. Tests to write
`heuristic-provider.test.ts`: AC1–AC5; one test per intent in `concierge-replies.ts`; one per verdict in `housing-explanation.ts`; "same input gives same output".

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
- A reply needs a local fact (a transit operator, a price, an emergency number): do not write it; phrase it as something to find out, or omit it.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Agent `fallback()` methods (they call these helpers, S-R1-052 to S-R1-055); translations (R3).
