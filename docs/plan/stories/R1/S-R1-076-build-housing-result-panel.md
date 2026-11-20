# S-R1-076 — Build housing result panel

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-060, S-R1-075 |
| Blocks | S-R1-078, S-R1-089 |
| Executor tier | Tier-2 — presentation of money, verdict and warnings with strict wording |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-074, S-R1-079 to S-R1-081 |

## 1. Why
This panel is the answer to "can I afford this place?": verdict in words, both cost breakdowns, the risk warning, an explanation and the disclaimer (spec §3.5, §23, §25.8).

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.6 (right column, states — binding), §4 (verdict is text first, colour second), §8.
- **Files to read first:** `apps/web/src/screens/housing/{housing-screen.tsx,housing-form.tsx}`, `packages/contracts/src/housing.ts`, `apps/web/src/ui/{banner.tsx,tag.tsx,skeleton.tsx}`, `apps/web/src/lib/format.ts`; `legacy/prototype/src/app/(main)/housing/result.tsx`.
- **Files to create:** `apps/web/src/screens/housing/housing-result.tsx`, `apps/web/src/screens/housing/housing-result.test.tsx`.
- **Files to modify:** `apps/web/src/screens/housing/housing-screen.tsx`, `apps/web/src/lib/mutations/use-evaluate-housing.ts` (second call with explanation), `apps/web/src/i18n/locales/en/housing.json`.
- **Files you must NOT touch:** API code, `ui/*`.
- Env vars: none.

## 3. Design notes
- `HousingResult` props: `{ evaluation: HousingEvaluation; explanation: { text: string; tips: string[]; source: "template" | "ai" } | null; explanationLoading: boolean; assumed: HousingField[]; housingBudgetMinor: number | null; locale: string }`.
- Order of blocks:
  1. **Verdict banner** (text first, icon decorative): `COMPATIBLE` → `Banner tone="info"` "Compatible with your budget" + "{pct}% of your {budget} housing budget"; `TIGHT` → `tone="urgent"` "Tight on your budget" + "{over} over your {budget} housing budget"; `OVER` → `tone="urgent"` "Over your budget" + the same line; `UNKNOWN` → `tone="info"` "Add a housing budget to get a verdict" + link "Add a housing budget" → `/settings`.
  2. **Real monthly housing cost**: a description list (`<dl>`) of the six monthly lines (labels from `housing:field.*`; lines with 0 are shown as "—" except rent) and the total in the numeral style.
  3. **Move-in cash required**: `<dl>` of first month's rent + six move-in lines; a `Tag tone="outline"` "assumed" beside every field listed in `assumed`; total.
  4. **Cost flags** (when `flags` is non-empty): a plain list — `DEPOSIT_OVER_TWO_RENTS` "The deposit is more than two months' rent."; `UTILITIES_ZERO` "Utilities are 0 — check what is included."; `RENT_OVER_HALF_BUDGET` "Rent alone is more than half of your monthly budget."; `HIGH_RECURRING_FEES` "Recurring fees add more than 10% to the rent."; `MOVE_IN_OVER_THREE_BUDGETS` "Move-in cash is more than three months of your housing budget."
  5. **Risk banner** when `riskWarning` is set: `Banner tone="urgent" role="alert"` whose text is exactly `evaluation.riskWarning` (the mandated sentence from the server; never retyped in the client).
  6. **Explanation**: eyebrow "Explanation"; while `explanationLoading` a two-line `Skeleton`; then the text and the tips as a list with an arrow marker. No "AI" badge is needed; when `source` is `"ai"` add the small meta line "Written with AI from your numbers".
  7. **Disclaimer** (always): "Calculated from your inputs only. We never invent listings or prices and do not verify properties — always confirm terms with the landlord."
- Money is formatted only with `formatMoney(amountMinor, currency, locale)`.
- Flow in `HousingScreen`: after `HousingForm.onResult` (numbers from `?explain=0`, shown at once with the template explanation it returned), fire the second request without `explain=0`; when it resolves, replace the explanation; if it fails, keep the template text and show nothing else ("Explanation unavailable" state = deterministic text, no error).
- A live region (`role="status"`, visually hidden) announces "Result ready: {verdict words}. Monthly cost {total}." after each calculation.
- On mobile, scroll the result into view and move focus to its heading (`<h2 tabIndex={-1}>` "Result").
- Edge cases: verdict `UNKNOWN` shows no percentage; `rough` is never true here (typed inputs); an explanation with zero tips renders no list.

## 4. Steps
1. Component with tests from fixture evaluations.
2. Two-phase evaluate in the hook and screen.
3. Commit: `feat(web): build housing result panel (S-R1-076)`.

## 5. Acceptance criteria
- AC1: Given a TIGHT evaluation (134000 vs 125000), then the banner reads "Tight on your budget" and "$90.00 over your $1,250.00 housing budget" (USD, `en`).
- AC2: Given `riskWarning`, then an element with `role="alert"` contains exactly that string.
- AC3: Given `assumed: ["deposit"]`, then the Deposit line carries the "assumed" tag.
- AC4: Given the first response, then totals are visible while the explanation skeleton shows; given the second response, the explanation text replaces it; given the second request fails, the template explanation stays and no error appears.
- AC5 (negative): Given verdict `UNKNOWN`, then no percentage is rendered and the link to Settings exists.
- AC6 (negative): Given the component source, then it contains no hard-coded copy of the risk warning sentence.
- AC7: Given each verdict fixture, then axe reports no violations and the disclaimer is present.

## 6. Tests to write
`housing-result.test.tsx`: AC1–AC7; "flags render their sentences"; "status region announces the result".

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to show green for "Compatible" or red for "Over": stop — the palette has no red and no success green; words carry the verdict (`07` §5).
- You are about to add "This looks like a good deal" or any judgement of the listing: stop.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Saving and comparing (`S-R1-078`); paste dialog (`S-R1-077`).
