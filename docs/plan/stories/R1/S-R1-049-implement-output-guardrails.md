# S-R1-049 — Implement output guardrails

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | AI Core |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-044, S-R1-048 |
| Blocks | S-R1-051 |
| Executor tier | Tier-3 — these checks are the product's safety net; false negatives break the promise |
| Platforms | backend |
| Parallel-safe with | S-R1-034 to S-R1-043, S-R1-046, S-R1-047, S-R1-050 |

## 1. Why
The model will sometimes claim it booked something, invent a listing or quote a number that no calculation produced. Code must catch every such reply before the user sees it (spec §23; `05_AI_ARCHITECTURE.md` §7).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §7 (output chain table — binding), §12 (safety case families), §14.
- **Files to read first:** `packages/ai/src/guardrails/{guardrail.ts,input-guardrails.ts}`, `packages/ai/src/schemas/intent.ts`.
- **Files to create:** `packages/ai/src/guardrails/patterns.ts`, `packages/ai/src/guardrails/output-guardrails.ts`, `packages/ai/src/guardrails/output-guardrails.test.ts`.
- **Files to modify:** `packages/ai/src/index.ts`.
- **Files you must NOT touch:** input guardrails.
- Env vars: none.

## 3. Design notes
```ts
// patterns.ts — exported so that evals and tests share them
export const ACTION_CLAIM_PATTERNS: readonly RegExp[];
export const FORBIDDEN_CLAIM_PATTERNS: readonly RegExp[];
export const PROMPT_LEAK_MARKERS: readonly string[];          // "Rules you must follow", "<untrusted_content>", "FACTS:"
export const HOUSING_DISCLAIMER = "I can't verify listings — confirm the lease and landlord before paying.";
export function extractNumbers(text: string): string[];       // normalised digit strings, see below
export function factNumbers(facts: unknown): Set<string>;     // every number found anywhere in facts, normalised
// output-guardrails.ts
export const ActionClaimGuardrail: Guardrail;
export const ForbiddenClaimGuardrail: Guardrail;
export const NumericConsistencyGuardrail: Guardrail;
export const DisclaimerGuardrail: Guardrail;
export const OutputLengthGuardrail: Guardrail;
export function createOutputChain(): GuardrailChain;          // in the order above
/** Sentence-level check used while streaming: runs only the three blocking guardrails. */
export function checkSentence(sentence: string, input: Omit<GuardrailInput, "text">): GuardrailVerdict;
```

- **ActionClaim** — block when the text matches a first-person completed or in-progress action: `\b(I|I've|I have|I'll|I will|I am|I'm|we|we've)\b[^.!?]{0,40}\b(booked|reserved|paid|sent|contacted|called|emailed|scheduled|applied|verified|confirmed with|signed)\b`. Do **not** block second-person advice ("you should book…", "once you have paid…").
- **ForbiddenClaim** — block on: availability or discovery ("is available", "are available now", "I found (an|a) (apartment|studio|room|listing|place)", "there is a listing"), verification ("verified listing", "is legitimate", "is safe to pay", "not a scam", "guaranteed"); any URL (`https?://`, `www.`); a street address pattern (`\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b`) unless the same string occurs in `JSON.stringify(facts)`; any `PROMPT_LEAK_MARKERS` entry.
- **NumericConsistency** — `extractNumbers(text)`: find amounts written with a currency symbol or code and any number with three or more digits; normalise by removing thousands separators, currency marks and trailing `.00`. `factNumbers(facts)`: walk the facts object; for every integer field also add its major-unit form for 2-digit currencies (`125000` → `"125000"` and `"1250"`), and percentages. Block when any extracted number is not in the fact set. Exempt: four-digit years 2024–2035, times, and numbers inside a quoted task title that itself comes from facts.
- **Disclaimer** — when `input.intent` is `AFFORDABILITY`, or `facts` contains a key `evaluation` or `getHousingOptions`: if the text does not end with `HOUSING_DISCLAIMER`, repair by appending it on a new line.
- **OutputLength** — more than 1,200 characters: repair by cutting at the last sentence end before the limit (re-append the disclaimer if it was cut).
- A block returns `safeReply: ""` — the **agent** supplies its own deterministic fallback (S-R1-051).
- CPU: all patterns are linear; no nested quantifiers. Add a test that runs the chain on a 1,200-character text 200 times in under 100 ms.
- Edge cases: "$1,250" vs facts `125000`; "110%" vs `budgetUsedPct: 110`; "2 days" (one digit — ignored); numbers in the user's own language format ("1.250,00") — normalise both separators.

## 4. Steps
1. `patterns.ts` helpers with table tests.
2. Each guardrail with positive and negative samples (at least ten each for the three blockers).
3. Chain and `checkSentence`.
4. Commit: `feat(ai): implement output guardrails (S-R1-049)`.

## 5. Acceptance criteria
- AC1: Given "I've booked your airport ride for 3 pm.", then blocked by `ActionClaimGuardrail`.
- AC2: Given "I found a studio at 123 Main Street for $900.", then blocked (forbidden claim; also numeric).
- AC3: Given facts `{ evaluation: { monthly: { totalMinor: 134000 } } }` and text "It costs $1,340 a month.", then pass; with "$1,400" then blocked by `NumericConsistencyGuardrail`.
- AC4: Given an `AFFORDABILITY` reply without the disclaimer, then the repaired text ends with `HOUSING_DISCLAIMER`.
- AC5 (negative): Given "You should book your airport transfer two days before you fly.", then it passes.
- AC6 (negative): Given a reply containing "Rules you must follow", then blocked.
- AC7: Given 1,500 characters, then the result is ≤ 1,200 characters and ends at a sentence boundary.

## 6. Tests to write
`output-guardrails.test.ts`: AC1–AC7; sample tables; "checkSentence never repairs"; the performance test.

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
- A legitimate fallback reply from S-R1-037 is blocked by these rules: fix the fallback wording, not the guardrail; if that is impossible, stop and report the exact sentence.
- You want to use an LLM as a judge inside the chain: stop — deterministic checks only in the request path.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Wiring into streaming (`S-R1-051`); the golden set (`S-R1-063`).
