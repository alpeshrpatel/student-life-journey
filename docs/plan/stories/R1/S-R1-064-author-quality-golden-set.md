# S-R1-064 — Author quality golden set

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Quality |
| Type | test |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-062 |
| Blocks | S-R3-023, S-R3-024 |
| Executor tier | Tier-2 — expectation writing for grounded, useful answers |
| Platforms | backend |
| Parallel-safe with | S-R1-063, S-R1-065 to S-R1-081 |

## 1. Why
Safe is not enough: the deterministic fallback replies — what every user gets when no model is available — must be grounded and useful. These cases are also the yardstick for comparing models later (S-R3-023).

## 2. Context pack
- Relevant docs: `docs/plan/05_AI_ARCHITECTURE.md` §12 (quality paragraph and rubric), §5 (fallback sources).
- **Files to read first:** `packages/ai/evals/{types.ts,runner.ts,fixtures.ts}`, `packages/ai/evals/cases/quality/example-today-plan.json`, `packages/ai/src/providers/heuristic/concierge-replies.ts`, `packages/ai/src/reply-templates.ts`.
- **Files to create:** at least 20 files under `packages/ai/evals/cases/quality/`, named `<intent>-<nn>.json`.
- **Files to modify:** `packages/ai/evals/evals.test.ts` (quality coverage meta-test: at least two cases per intent listed below).
- **Files you must NOT touch:** `packages/ai/src/**` unless a reply is plainly wrong — then fix wording in the heuristic files only and say so in the PR.
- Env vars: none.

## 3. Design notes
- All quality cases run with an **empty script** and `budgetLevel: "EXHAUSTED"` (heuristic path), so they are deterministic. Live-model quality is measured nightly in R3 with the same files.
- Required coverage (≥ 2 each; total ≥ 20): `TODAY_PLAN`, `TOP_TASKS`, `FLIGHT_PREP`, `AFFORDABILITY` (with saved options; with an amount and no options), `PLACES` (pharmacy; grocery; unavailable provider), `SHOPPING_LIST`, `TRANSPORTATION`, `GENERAL`; plus workflow cases: `housing_explain` for each verdict (4) and `plan_enhance` baseline-stands (1).
- Use different contexts: searching 12 days out; secured on arrival day; first week; no budget.
- Assertions per case (at least three): `intent`; `mustMention` the destination or the top task title from the fixture; `maxChars: 1200`; `numbersGrounded`; `noForbiddenClaim`; for housing chat `mustMention: "can't verify listings"`; for places `mustMention: "Source:"` or "Demo data".
- Add one case per context asserting the reply suggests the right next screen in words ("Open Housing", "Open Tasks", "Open Places").
- A quality case that fails shows a weak fallback reply: improve the reply text (heuristic files) rather than loosening the assertion, within this story's time box.

## 4. Steps
1. Add the coverage meta-test.
2. Write the cases; run `pnpm evals`.
3. Adjust heuristic wording where a reply is unhelpful; re-run all evals (safety must stay green).
4. Commit: `test(ai): author quality golden set (S-R1-064)`.

## 5. Acceptance criteria
- AC1: Given `pnpm evals`, then at least 20 quality cases run and all pass, together with every safety case.
- AC2: Given the coverage meta-test, then each listed intent has two or more cases.
- AC3 (negative): Given `conciergeFallback` temporarily returning an empty string (local experiment), then quality cases fail.
- AC4: Given every quality case output, then it is at most 1,200 characters and passes `noForbiddenClaim`.

## 6. Tests to write
The case files, plus the coverage meta-test.

## 7. Verification commands
```bash
pnpm evals                                             # expected: all pass
ls packages/ai/evals/cases/quality | wc -l             # expected: 20 or more
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Improving a reply would need a local fact or a price: stop — keep it generic.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Judge-model scoring and model comparison (`S-R3-023`, `S-R3-024`).
