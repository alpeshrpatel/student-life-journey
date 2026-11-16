# S-R1-071 — Build full onboarding wizard

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Onboarding |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-031, S-R1-032, S-R1-065, S-R1-066, S-R1-068 |
| Blocks | S-R1-089 |
| Executor tier | Tier-2 — multi-step form with validation, autocomplete and consent |
| Platforms | web |
| Parallel-safe with | S-R1-072 to S-R1-081 |

## 1. Why
Onboarding is the path to the aha moment and must take under 90 seconds (`07_UX_DESIGN_SYSTEM.md` §7). R0 shipped two steps; R1 adds city autocomplete, the transport step, the summary and the consent boxes.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.2 (steps, states, copy, accessibility — binding), §7; `docs/plan/02_PRODUCT_STRATEGY.md` §7 (interests are not collected).
- **Files to read first:** `apps/web/src/screens/onboarding/{onboarding-screen.tsx,route-step.tsx,money-step.tsx}`, `apps/web/src/lib/mutations/use-complete-onboarding.ts`, `apps/web/src/ui/{segmented-control.tsx,chip.tsx,field.tsx,input.tsx}`, `packages/contracts/src/{relocation.ts,geo.ts}`; `legacy/prototype/src/app/onboarding/*.tsx` (ideas only).
- **Files to create:** `apps/web/src/screens/onboarding/transport-step.tsx`, `apps/web/src/screens/onboarding/city-field.tsx`, `apps/web/src/lib/queries/use-autocomplete.ts`, `apps/web/src/screens/onboarding/city-field.test.tsx`.
- **Files to modify:** `apps/web/src/screens/onboarding/onboarding-screen.tsx` (three steps, progress, summary), `route-step.tsx` (use `CityField`), `money-step.tsx` (currency select; remove the temporary consent boxes from S-R1-032; use `SegmentedControl`), `apps/web/src/lib/mutations/use-complete-onboarding.ts` (after success also `updateMe({ currency })` when the chosen currency differs; `invalidate(client, "relocationChanged")`), `apps/web/src/i18n/locales/en/onboarding.json`, `apps/web/src/screens/onboarding/onboarding-screen.test.tsx`, `apps/web/e2e/smoke.spec.ts` (three steps).
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- One `useForm` for all steps with `zodResolver(OnboardingFormSchema)`; per-step validation with `trigger([...fieldsOfStep])` before moving on. `OnboardingFormSchema` is a web-side schema in major units (strings from inputs) that maps to `OnboardingRequestSchema` on submit (`toMinor`-style conversion: `Math.round(Number(value) * 10 ** digits)` using `Intl.NumberFormat(…).resolvedOptions().maximumFractionDigits` for the currency).
- Step indicator: text "Step {n} of 3 · {name}" plus a 3 px progress bar (`role="progressbar"` with `aria-valuenow`).
- **Step 1 Route:** `CityField` ×2, arrival date (native date, required), arrival time (native time, optional, hint "Helps us plan a late arrival").
- `CityField` (combobox pattern): text input with `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`; suggestions in a `role="listbox"` of `role="option"`; debounce 300 ms; queries start at three characters through `useAutocomplete(q)` (`queryKeys.autocomplete(q)`, `staleTime` 5 minutes); ArrowDown/ArrowUp move, Enter selects, Escape closes; choosing a suggestion sets the field text to its label. States: loading spinner inside the field; none → "No matches — keep typing or use what you wrote"; error → silent (free text is always accepted).
- **Step 2 Money and housing:** currency `<select>` (USD, EUR, GBP, CAD, AUD, INR, JPY, CNY, MXN, plus the profile's current currency), monthly budget (number, `inputmode="decimal"`, currency prefix), housing `SegmentedControl` ("Still searching" / "Already secured"), housing budget (only when searching).
- **Step 3 Getting around and confirm:** transport `Chip`s in a `ChipGroup` (Public transit preselected; Walking, Bike, Car, Rideshare); a summary list of the answers with an "Edit" link per group that jumps to its step; the required checkbox "I am 16 or older"; the optional unticked checkbox "Help improve the app with anonymous usage statistics"; the line "By continuing you agree to the Terms and acknowledge the Privacy Notice." with links to `/legal/terms` and `/legal/privacy` (open in the same tab; answers are kept in `sessionStorage` under `slj.onboarding.draft` and restored on return; the draft is removed after success).
- Buttons pinned to the bottom: Back (icon button, hidden on step 1) and the primary ("Continue" on steps 1–2, "Show my plan" on step 3).
- Submitting state: full-height "Building your plan for {destination}…" (`role="status"`), no animation beyond the spinner.
- Errors: validation messages exactly as in `07` §2.2; submit failure → `Banner tone="urgent"` "We couldn't save that. Your answers are still here — try again."; a 422 from the server maps `details.issues[].path` to field errors and jumps to the step that owns the first one.
- Success: navigate to `/dashboard` with router state `{ justOnboarded: true }` (the dashboard shows the toast "Your plan is ready.").
- Focus: on step change move focus to the step title (`<h1 tabIndex={-1}>`).
- Edge cases: arrival date in the past is allowed; switching housing to "secured" clears the housing budget; pressing Enter in a text field moves to the next step instead of submitting early; browser back button goes to the previous step (keep the step in the URL hash `#step-2`).

## 4. Steps
1. `useAutocomplete` and `CityField` with tests.
2. Step 3 and the summary; move the consent boxes.
3. Currency select and conversion; draft persistence.
4. Update unit tests and the smoke test → `pnpm test`, `pnpm e2e` pass.
5. Commit: `feat(web): build full onboarding wizard (S-R1-071)`.

## 5. Acceptance criteria
- AC1: Given a new user, when the three steps are completed with valid answers, then one `PUT /api/v1/onboarding` is sent with minor-unit amounts, `ageConfirmed: true` and the legal versions, and the app navigates to `/dashboard`.
- AC2: Given typing "pho" in "Moving to", then suggestions appear after the debounce and choosing one with the keyboard fills the field.
- AC3: Given the autocomplete request failing, then the typed text is still accepted and no error is shown.
- AC4 (negative): Given step 3 with the age box unticked, when "Show my plan" is pressed, then the error "Confirm that you are 16 or older to continue." is shown and no request is sent.
- AC5 (negative): Given "Still searching" with an empty housing budget, when Continue is pressed, then "A rough housing budget is fine." appears under the field and the step does not change.
- AC6: Given a visit to the Terms link from step 3 and a return, then all answers are restored.
- AC7: Given each step, then axe reports no violations.

## 6. Tests to write
`city-field.test.tsx`: AC2, AC3; keyboard navigation; "queries start at three characters". `onboarding-screen.test.tsx`: AC1, AC4, AC5, AC6; "server 422 maps to the right step". E2E smoke updated for three steps.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm e2e    # expected: pass
pnpm typecheck && pnpm lint                # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add steps or questions (interests, university, visa type, home address): stop — cut by `02_PRODUCT_STRATEGY.md` §4 and §7.
- You are about to add a combobox library: allowed only if `CityField` overruns two hours; record the decision in the PR.

## 10. Rollback / undo note
`git revert` restores the two-step wizard (which still satisfies the API from S-R1-032).

## 11. Out of scope
Onboarding timing metric (`S-R2-017`); experiments on step order (`S-R3-019`).
