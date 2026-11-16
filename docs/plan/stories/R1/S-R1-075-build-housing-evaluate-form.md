# S-R1-075 — Build housing evaluate form

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R1-025, S-R1-065, S-R1-066, S-R1-068 |
| Blocks | S-R1-076, S-R1-077 |
| Executor tier | Tier-2 — a twelve-field money form with unit conversion |
| Platforms | web |
| Parallel-safe with | S-R1-071 to S-R1-074, S-R1-079 to S-R1-081 |

## 1. Why
The mover types the numbers from any listing; the app computes the real monthly cost and the move-in cash (spec §3.5, §25.8). This story builds the input side.

## 2. Context pack
- Relevant docs: `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.6 (left column, states, accessibility — binding).
- **Files to read first:** `packages/contracts/src/housing.ts`, `packages/domain/src/housing/types.ts` (field names), `apps/web/src/ui/{field.tsx,input.tsx,button.tsx}`, `apps/web/src/lib/format.ts`; `legacy/prototype/src/app/(main)/housing/{page.tsx,form-parts.tsx}`.
- **Files to create:** `apps/web/src/screens/housing/housing-screen.tsx`, `apps/web/src/screens/housing/housing-form.tsx`, `apps/web/src/screens/housing/housing-form-schema.ts`, `apps/web/src/lib/mutations/use-evaluate-housing.ts`, `apps/web/src/lib/money-input.ts`, `apps/web/src/i18n/locales/en/housing.json`, `apps/web/src/screens/housing/housing-form.test.tsx`, `apps/web/src/lib/money-input.test.ts`.
- **Files to modify:** `apps/web/src/app/router.tsx`, `apps/web/src/i18n/index.ts`.
- **Files you must NOT touch:** API code, `ui/*`.
- Env vars: none.

## 3. Design notes
- `money-input.ts` (exact):

```ts
/** Parses what a person types ("1,100", "1100.50", "1.100,50") into minor units. Returns null for empty or invalid text. */
export function parseMoneyInput(text: string, currency: string, locale: string): number | null;
export function minorToInputText(amountMinor: number, currency: string): string;     // "1100" or "1100.50", no grouping
export function currencyDigits(currency: string): number;                              // from Intl.NumberFormat resolvedOptions
```

- `housing-form-schema.ts`: `HousingFormSchema` — every amount is a string; `rent` required and > 0; other fields optional (blank = 0); `label` optional, max 80; `riskKeys: RiskKey[]`. `toEvaluateRequest(values, currency, locale): EvaluateHousingRequest` converts with `parseMoneyInput`; **a blank deposit becomes one month's rent** and the function also returns `assumed: HousingField[]` (here `["deposit"]`) so the result panel can tag it "assumed".
- `HousingForm` props: `{ currency: string; defaultValues?: Partial<HousingFormValues>; onResult(result: { request: EvaluateHousingRequest; response: EvaluateHousingResponse; assumed: HousingField[]; label: string }): void; onPasteClick?(): void; busy?: boolean }`.
- Layout (stacked on mobile; the screen places the form in the left column from 1024 px):
  - `Button variant="secondary"` "Paste a listing" (rendered only when `onPasteClick` is provided — S-R1-077 passes it, gated by flag `listingPasteEnabled`).
  - Field "Listing name" (placeholder "e.g. Studio on Oak Street").
  - `<fieldset>` "Monthly recurring": Rent*, Utilities, Internet, Transportation, Laundry, Recurring fees.
  - `<fieldset>` "One-time move-in": Deposit (hint "Blank means one month's rent"), Application fee, Connectivity setup, Furniture and setup, Initial groceries, Transport setup.
  - `<fieldset>` "Safety check — did the listing…": five native checkboxes with these labels — "ask for payment before a viewing or a signed lease"; "accept only cash, wire transfer or gift cards"; "offer no written lease"; "cost far less than similar places"; "pressure you to decide immediately" (keys map to `PAY_BEFORE_VIEWING`, `UNTRACEABLE_PAYMENT`, `NO_WRITTEN_LEASE`, `PRICE_FAR_BELOW_SIMILAR`, `PRESSURE_TO_DECIDE`).
  - Primary `Button` "Run the numbers".
- Inputs: `type="text"` with `inputmode="decimal"`, a visible currency prefix (the symbol from `Intl.NumberFormat(...).formatToParts`), `autocomplete="off"`.
- Submit: `useEvaluateHousing()` calls `evaluateHousing(request, { explain: false })` (query `?explain=0`) for instant numbers → `onResult`. Errors: validation "Rent is required to run the numbers." under Rent; request failure → `Banner tone="urgent"` "We couldn't run that just now. Your numbers are still here." with "Try again".
- `HousingScreen` in this story: `<h1>` "Housing & cost check", the promise line ("Enter the numbers from any listing. We compute the real monthly cost and the cash you need on day one — against your {budget} housing budget." or, without a budget, "…on day one."), the form on the left, and on the right a placeholder `StateBlock kind="empty"` "Enter a rent to see the real monthly cost." — after a result, a minimal total line "Real monthly cost: {total}" until S-R1-076 replaces it.
- The profile currency comes from `useSession()`/`me.profile.currency`; the housing budget from `useDashboard()`.
- Edge cases: "1,100" and "1100" both parse to 110000 for USD; "1.100,50" parses for `de` locale; negative or text input → field error "Enter an amount"; JPY has no decimals ("1100.5" → error).

## 4. Steps
1. `money-input.ts` with a table of tests.
2. Schema and mapping with tests (blank deposit rule).
3. Form, mutation hook, screen shell and route.
4. Commit: `feat(web): build housing evaluate form (S-R1-075)`.

## 5. Acceptance criteria
- AC1: Given rent "1,100", utilities "90" and a blank deposit, when "Run the numbers" is pressed, then the request holds `rent: 110000`, `utilities: 9000`, `deposit: 110000`, every other amount 0, and `assumed` contains `deposit`.
- AC2: Given two safety boxes ticked, then `riskKeys` holds exactly those two keys.
- AC3 (negative): Given an empty rent, then "Rent is required to run the numbers." is shown, linked to the input with `aria-describedby`, and no request is sent.
- AC4 (negative): Given "abc" in Utilities, then a field error is shown and no request is sent.
- AC5: Given a failed request, then the banner appears and the typed values are still in the form.
- AC6: Given the form, then axe reports no violations and every input has a visible label.

## 6. Tests to write
`money-input.test.ts`: parsing table for USD, EUR (`de`), JPY; round trip. `housing-form.test.tsx`: AC1–AC6.

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
- You are about to compute totals or a verdict in the browser: stop — R1 shows the server's numbers (on-device math is `S-R2-007`).
- You are about to add fields for an address, a listing link or a landlord: stop.

## 10. Rollback / undo note
`git revert` restores the placeholder.

## 11. Out of scope
Result panel (`S-R1-076`); paste flow (`S-R1-077`); saved options and compare (`S-R1-078`).
