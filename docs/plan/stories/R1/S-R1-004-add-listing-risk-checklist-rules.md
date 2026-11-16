# S-R1-004 — Add listing risk checklist rules

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Housing |
| Type | feature |
| Size | XS (<30 min) |
| Priority | P0 |
| Depends on | S-R1-003 |
| Blocks | S-R1-024, S-R1-025 |
| Executor tier | Tier-1 — constants and one composing function |
| Platforms | backend, web |
| Parallel-safe with | S-R1-005 to S-R1-016 |

## 1. Why
The product cannot verify a listing. It can show a fixed warning when the mover ticks a known scam signal (spec §3.5 "Risk checklist"). The warning text is mandated word for word.

## 2. Context pack
- Relevant docs: spec §3.5 (risk checklist, required warning); `docs/plan/GLOSSARY.md` (Risk key).
- **Files to read first:** `packages/domain/src/housing/affordability.ts`, `packages/domain/src/housing/types.ts`.
- **Files to create:** `packages/domain/src/housing/risk-checklist.ts`, `packages/domain/src/housing/risk-checklist.test.ts`.
- **Files to modify:** `packages/domain/src/index.ts`.
- **Files you must NOT touch:** `affordability.ts`.
- Env vars: none.

## 3. Design notes
- Public interface (exact):

```ts
export const RISK_KEYS = ["PAY_BEFORE_VIEWING", "UNTRACEABLE_PAYMENT", "NO_WRITTEN_LEASE", "PRICE_FAR_BELOW_SIMILAR", "PRESSURE_TO_DECIDE"] as const;
export const RiskKeySchema = z.enum(RISK_KEYS);
export type RiskKey = z.infer<typeof RiskKeySchema>;
export const RISK_WARNING = "Potential risk detected. Verify the property, landlord, lease, and payment method before sending money.";
export function riskWarning(keys: readonly RiskKey[]): string | null;          // RISK_WARNING when keys.length > 0
export interface HousingEvaluation extends Affordability { currency: string; riskKeys: RiskKey[]; riskWarning: string | null; rough: boolean }
export function evaluateHousing(input: AffordabilityInput & { riskKeys: readonly RiskKey[]; rough?: boolean }): HousingEvaluation;
```

- Meaning of each key (the UI copy lives in the web locale file, S-R1-075): pay before viewing or before a signed lease; payment only by cash, wire transfer or gift cards; no written lease offered; price far below similar places; pressure to decide immediately.
- `evaluateHousing` = `assessAffordability` + `riskKeys` de-duplicated in `RISK_KEYS` order + `riskWarning` + `currency` from the inputs + `rough` (default `false`).
- The warning never changes the verdict. There is no "safe" result: an empty checklist returns `null`, not a reassurance.

## 4. Steps
1. Tests; implementation; export.
2. `pnpm --filter @slj/domain test` → pass.
3. Commit: `feat(domain): add listing risk checklist rules (S-R1-004)`.

## 5. Acceptance criteria
- AC1: Given one or more risk keys, then `riskWarning` equals `RISK_WARNING` exactly (byte for byte).
- AC2: Given duplicate keys in any order, then `riskKeys` is de-duplicated in `RISK_KEYS` order.
- AC3 (negative): Given no keys, then `riskWarning` is `null` and no text containing "safe", "verified" or "legitimate" exists anywhere in the module.

## 6. Tests to write
`risk-checklist.test.ts`: "returns the mandated warning"; "null when empty"; "de-duplicates and orders"; "evaluateHousing carries verdict unchanged when risks are present"; "module source has no reassurance words" (read the file text with a `?raw` import and assert).

## 7. Verification commands
```bash
pnpm --filter @slj/domain test   # expected: pass
pnpm typecheck && pnpm lint      # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Someone asks to reword the warning: stop; the text is fixed by the spec and tested byte for byte.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Detecting risk signals from pasted text (`S-R1-054`); translations (`S-R3-031`).
