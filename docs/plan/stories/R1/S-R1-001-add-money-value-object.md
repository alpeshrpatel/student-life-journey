# S-R1-001 — Add Money value object

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-004 |
| Blocks | S-R1-002 |
| Executor tier | Tier-1 — small pure functions with a full test table |
| Platforms | backend, web |
| Parallel-safe with | S-R1-005, S-R1-013, S-R1-033, S-R1-065 |

## 1. Why
The prototype stored money as floating-point dollars (defect D-09). Every amount in the product is an integer in minor units with an ISO currency; this story adds the one place that does money arithmetic.

## 2. Context pack
- Relevant docs: `docs/plan/GLOSSARY.md` (Money, minor units); `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md` (portable subset: integer money).
- **Files to read first:** `packages/domain/src/index.ts`, `packages/domain/src/time/dates.ts` (style to copy).
- **Files to create:** `packages/domain/src/money/money.ts`, `packages/domain/src/money/money.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts` (export).
- **Files you must NOT touch:** anything outside `packages/domain`.
- Env vars: none.

## 3. Design notes
- Pattern: Value Object (immutable, compared by value).
- Public interface (exact):

```ts
export interface Money { readonly amountMinor: number; readonly currency: string }
export function money(amountMinor: number, currency: string): Money;        // throws RangeError unless Number.isSafeInteger(amountMinor) and /^[A-Z]{3}$/.test(currency)
export function addMoney(a: Money, b: Money): Money;                         // throws RangeError on different currencies
export function sumMinor(amounts: readonly number[]): number;               // integer sum; throws RangeError on a non-integer
export function scaleMinor(amountMinor: number, numerator: number, denominator: number): number; // round half up, integers only
export function percentOf(partMinor: number, wholeMinor: number): number | null;  // whole percent, rounded; null when wholeMinor <= 0
export function minorUnitDigits(currency: string): 0 | 2 | 3;
export function toMinor(major: number, currency: string): number;            // Math.round(major * 10 ** digits)
export function toMajor(amountMinor: number, currency: string): number;
```

- `minorUnitDigits`: `0` for `JPY, KRW, VND, CLP, ISK, UGX, XAF, XOF, PYG, RWF, KMF, GNF, DJF, BIF, VUV, XPF`; `3` for `BHD, KWD, OMR, JOD, TND, IQD, LYD`; otherwise `2`.
- No formatting here: display formatting is `formatMoney` in `apps/web/src/lib/format.ts`.
- Edge cases: negative amounts are allowed by `money()` (differences) but `toMinor` rejects `NaN` and `Infinity` with `RangeError`; `toMinor(19.99, "USD") === 1999`; `toMinor(0.1 + 0.2, "USD") === 30`; `toMinor(1250, "JPY") === 1250`.

## 4. Steps
1. Write the tests from section 6 first → they fail.
2. Implement the functions → `pnpm --filter @slj/domain test` passes.
3. Export from `index.ts` → `pnpm typecheck` passes.
4. Commit: `feat(domain): add Money value object (S-R1-001)`.

## 5. Acceptance criteria
- AC1: Given `toMinor(19.99, "USD")`, then the result is `1999`; given `toMinor(1250, "JPY")`, then `1250`; given `toMinor(1.2345, "KWD")`, then `1235`.
- AC2: Given `percentOf(137500, 125000)`, then `110`; given a whole of `0`, then `null`.
- AC3 (negative): Given `addMoney(money(1,"USD"), money(1,"EUR"))`, then a `RangeError` is thrown.
- AC4 (negative): Given `money(1.5, "USD")` or `money(1, "usd")`, then a `RangeError` is thrown.

## 6. Tests to write
`packages/domain/src/money/money.test.ts`: "converts major to minor for 0-, 2- and 3-digit currencies"; "avoids floating point drift"; "adds same-currency amounts"; "rejects mixed currencies"; "rejects non-integers and bad currency codes"; "percentOf rounds and guards zero"; "scaleMinor rounds half up" (`scaleMinor(125000, 110, 100) === 137500`, `scaleMinor(5, 1, 2) === 3`).

## 7. Verification commands
```bash
pnpm --filter @slj/domain test   # expected: all tests pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The domain lint rule rejects `Math.round`: it must not — only `Math.random` is banned. If it does, stop and report (the rule in S-R0-003 is wrong).

## 10. Rollback / undo note
`git revert` — nothing else uses the module yet.

## 11. Out of scope
Currency conversion and exchange rates (parked, PL list); display formatting.
