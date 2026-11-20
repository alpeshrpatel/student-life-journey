# S-R0-029 — Build minimal onboarding wizard

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Onboarding |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-019, S-R0-022, S-R0-025 |
| Blocks | S-R0-034, S-R1-071 |
| Executor tier | Tier-2 — multi-step form with validation and mutation |
| Platforms | web |
| Parallel-safe with | S-R0-026, S-R0-027, S-R0-028 |

## 1. Why
Two short steps collect the facts the skeleton needs and hand the mover to their dashboard.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.2 (steps 1 and 2, states, copy), §7.
- **Files to read first:** `packages/contracts/src/relocation.ts`, `apps/web/src/ui/field.tsx`, `apps/web/src/ui/input.tsx`, `apps/web/src/ui/button.tsx`, `apps/web/src/lib/api.ts`; `legacy/prototype/src/app/onboarding/wizard.tsx` and `steps-route-money.tsx` (step validation and messages to port).
- **Files to create:** `apps/web/src/screens/onboarding/onboarding-screen.tsx`, `apps/web/src/screens/onboarding/route-step.tsx`, `apps/web/src/screens/onboarding/money-step.tsx`, `apps/web/src/lib/mutations/use-complete-onboarding.ts`, `apps/web/src/i18n/locales/en/onboarding.json`, `apps/web/src/screens/onboarding/onboarding-screen.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`, `apps/web/package.json` (`react-hook-form@^7.92.0`, `@hookform/resolvers@^7.0.6`, `zod`).
- **Files you must NOT touch:** `packages/contracts/**`, `apps/api/**`.
- Env vars: none.

## 3. Design notes
- One `useForm` for the whole wizard with `zodResolver` over a form schema that mirrors `OnboardingRequestSchema` but takes money as major-unit strings (`monthlyBudget`, `housingBudget`) and converts to minor units on submit (`Math.round(Number(value) * 100)`). "Continue" validates only the current step's fields with `trigger([...])`.
- Step 1 fields: origin, destination, arrivalDate (`type="date"`), arrivalTime (`type="time"`, optional). Step 2: monthlyBudget (`inputMode="decimal"`, prefix `$`), housingStatus (two native radio inputs styled as a two-option group; the segmented control component arrives in R1), housingBudget (shown only when searching). Transport preferences are not asked in R0 (the API default applies).
- Hook: `useCompleteOnboarding()` → `useMutation({ mutationFn: (body) => api.completeOnboarding(body), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); navigate("/dashboard", { replace: true }); } })`.
- States to implement: first time, per-field validation errors (copy in the design doc), submitting ("Building your plan…" full-height state naming the destination), submit error banner (answers kept), offline banner with submit disabled.
- `onboarding.json` holds every label, hint, error and button text used here.
- Edge cases: Back keeps entered values; switching to "Already secured" clears and hides the housing budget; Enter submits the current step; date in the past is allowed.

## 4. Steps
1. Add dependencies and the locale file; build the two step components and the screen.
2. Add the mutation hook; wire the route.
3. Tests with a fake `api` → pass.
4. Manual: complete the wizard against the dev API → lands on `/dashboard` placeholder.
5. Commit: `feat(web): build minimal onboarding wizard (S-R0-029)`.

## 5. Acceptance criteria
- AC1: Given valid answers on both steps, when "Show my plan" is pressed, then `api.completeOnboarding` is called once with minor-unit budgets (2400 → 240000) and the app navigates to `/dashboard`.
- AC2 (negative): Given an empty destination, when "Continue" is pressed, then the step does not advance and the message "Tell us both cities so we can plan the journey." is announced.
- AC3 (negative): Given "Still searching" and no housing budget, when submitting, then the message "A rough housing budget is fine." is shown and no request is sent.
- AC4: Given the API rejects, when rendered, then the error banner shows and all entered values are still present.
- AC5: Given step 2, when Back is pressed and Continue again, then earlier values are unchanged.

## 6. Tests to write
`onboarding-screen.test.tsx`: the five criteria; plus loading state text while the mutation is pending.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (states: first time, validation, submitting, error, offline)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The screen file exceeds about 150 lines: split presentational parts into the step files, do not merge steps.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Step 3, autocomplete, age and consent boxes (`S-R1-071`, `S-R1-032`).
