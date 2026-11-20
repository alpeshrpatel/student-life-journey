# S-R1-078 — Build housing compare view

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-024, S-R1-076 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — saved options, switcher and a comparison table |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-074, S-R1-077, S-R1-079 to S-R1-081 |

## 1. Why
Movers decide between two or three places. Saving options and seeing them side by side, with a deterministic recommendation sentence, completes the housing feature (spec §3.5 "compare options").

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.6 (option switcher, compare view, save states — binding).
- **Files to read first:** `apps/web/src/screens/housing/{housing-screen.tsx,housing-form.tsx,housing-result.tsx}`, `packages/contracts/src/housing.ts`, `apps/web/src/ui/segmented-control.tsx`.
- **Files to create:** `apps/web/src/screens/housing/housing-compare.tsx`, `apps/web/src/screens/housing/compare-recommendation.ts`, `apps/web/src/lib/queries/use-housing-options.ts`, `apps/web/src/lib/mutations/use-save-housing-option.ts`, `apps/web/src/screens/housing/housing-compare.test.tsx`.
- **Files to modify:** `apps/web/src/screens/housing/housing-screen.tsx` (switcher, save button, compare mode), `apps/web/src/i18n/locales/en/housing.json`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Switcher above the columns: a horizontally scrollable row of buttons (not `SegmentedControl`, which is limited to four options) — one per saved option ("{label} · {monthly total}"), then "Compare" and "+ New". `aria-pressed` marks the active one. Selecting a saved option loads its `inputs` and `riskKeys` into the form and shows its `evaluation` in the result panel (explanation: template from a fresh `?explain=0` call).
- "Save option" (`Button variant="secondary"`, visible after a result): `useSaveHousingOption()` → `POST /housing/options` with an `Idempotency-Key`, body `{ label: label || "Option {n}", inputs, riskKeys, inputSource }` (`PASTE` when any field came from the paste flow, else `MANUAL`); when a saved option is active the button reads "Update option" and sends `PATCH`. Success → toast "Option saved", `invalidate(client, "housingOptionChanged")`; 409 → inline "You have 10 saved options. Remove one to add another."
- "Remove" (ghost button beside "Update option") → `DELETE` → toast "Option removed" with "Undo" is **not** offered (archive is not reversible from the client); ask for confirmation through a second click: the button label changes to "Remove — are you sure?" for 4 seconds.
- `HousingCompare` (shown when "Compare" is active): with fewer than two options → `StateBlock` "Save two options to compare them."; otherwise a `<table>` with a `<caption>` "Compare saved options", a header row of option labels (`<th scope="col">`) and rows (`<th scope="row">`): Real monthly cost; Move-in cash; vs. budget (verdict words); Headroom per month (`budget − monthly`, "—" without a budget; negative shown as "{amount} over"); Internet (amount or "not included"); Safety flags (count, "none"). The best value per numeric row is bold **and** followed by the text "(lowest)" / "(most headroom)". At most three options are compared at once (the three most recently updated; a note says so when there are more). The table scrolls horizontally inside its container below 640 px.
- `compare-recommendation.ts` (pure, tested): `recommend(options: HousingOption[]): { key: string; vars: Record<string, string> }` → rules in order: all options have risk flags → `compare.rec.allRisky` ("Every option has a safety flag. Verify each one before paying anything."); exactly one option without risk flags and it is not `OVER` → `compare.rec.onlyClean` ("{label} is the only option without safety flags."); otherwise the option with the lowest monthly total among those not `OVER` → `compare.rec.lowest` ("{label} has the lowest real monthly cost at {amount}."); all `OVER` → `compare.rec.allOver` ("All options are over your housing budget. The closest is {label}."). The sentence is followed by the disclaimer from S-R1-076. No model is involved.
- Edge cases: two options with identical totals → the first saved wins and the sentence says "lowest"; options saved in another currency than the current profile currency are shown with their own currency and excluded from the recommendation (note: "Saved in {currency}; not compared").

## 4. Steps
1. Hooks; recommendation function with tests.
2. Switcher, save/update/remove, compare table.
3. Tests → pass.
4. Commit: `feat(web): build housing compare view (S-R1-078)`.

## 5. Acceptance criteria
- AC1: Given a result and "Save option", then a POST is sent, the toast shows and the option appears in the switcher.
- AC2: Given two saved options, when "Compare" is chosen, then the table lists both with row headers, the lower monthly cost is bold with "(lowest)", and the recommendation sentence names the right option.
- AC3: Given one saved option, then "Save two options to compare them." is shown.
- AC4 (negative): Given the tenth-option conflict (409), then the limit message is shown and nothing changes.
- AC5: Given a saved option selected in the switcher, then the form holds its values and the result panel shows its evaluation.
- AC6 (negative): Given all options with risk flags, then the recommendation is the "Every option has a safety flag…" sentence and names no option as best.
- AC7: Given the table, then axe reports no violations (`caption`, `scope` present).

## 6. Tests to write
`housing-compare.test.tsx`: AC1–AC7; unit tests for `recommend` covering the four rules and the tie.

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
- You are about to rank by "quality", "neighbourhood" or anything not in the saved numbers: stop.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Sharing a comparison (parked); AI commentary on the comparison (parked).
