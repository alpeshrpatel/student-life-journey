# S-R2-007 — Run housing math offline

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-003, S-R2-005 |
| Blocks | S-R2-008 |
| Executor tier | Tier-2 — reuse the domain package in the browser without diverging from the server |
| Platforms | web, mobile, desktop |
| Parallel-safe with | S-R2-006, S-R2-009 to S-R2-027 |

## 1. Why
A mover standing in a flat with no signal should still get the real monthly cost and the verdict. The calculation is pure code in `@slj/domain`, so it can run on the device (ADR-0014 table, row "Housing calculator").

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0014-offline-and-sync-strategy.md`; `docs/plan/03_ARCHITECTURE.md` §6.1 (dependency rule: `apps/web` may import `@slj/domain` — confirm the package is declared; add it if not).
- **Files to read first:** `packages/domain/src/housing/{affordability.ts,risk-checklist.ts}`, `apps/web/src/lib/mutations/use-evaluate-housing.ts`, `apps/web/src/screens/housing/{housing-screen.tsx,housing-result.tsx}`.
- **Files to create:** `apps/web/src/lib/local-housing.ts`, `apps/web/src/lib/local-housing.test.ts`, `apps/api/test/housing-parity.test.ts`.
- **Files to modify:** `apps/web/package.json` (`"@slj/domain": "workspace:*"` if missing), `apps/web/src/lib/mutations/use-evaluate-housing.ts`, `apps/web/src/screens/housing/housing-screen.tsx`, `apps/web/src/i18n/locales/en/housing.json` (template explanation strings).
- **Files you must NOT touch:** `packages/domain/**` (import only).
- Env vars: none.

## 3. Design notes
```ts
export function evaluateLocally(request: EvaluateHousingRequest, budgets: { housingBudgetMinor: number | null; monthlyBudgetMinor: number | null }): HousingEvaluation;
export function localExplanation(evaluation: HousingEvaluation, t: TFunction, format: (minor: number) => string): { text: string; tips: string[]; source: "template" };
```

- `evaluateLocally` calls the same `evaluateHousing` function the server uses; budgets come from the cached relocation or dashboard query.
- New flow in `useEvaluateHousing`: (1) always compute locally first and show the result immediately (this replaces the `?explain=0` request — one fewer round trip online as well); (2) when online, call the server evaluate (with explanation) and replace the explanation when it arrives; if the server's evaluation differs from the local one in any number or the verdict, **show the server's**, and report a Sentry warning tagged `housing_parity_mismatch` (this must never happen; the parity test guards it); (3) when offline, stop after step 1 with the local template explanation and the bar text "Offline — explanation and saving need a connection."
- `localExplanation` mirrors the server template wording (verdict sentence, move-in sentence, one tip per cost flag) with strings in `housing.json` so that R3 can translate them.
- Parity test in the API package: for 50 generated inputs (fixed seed, simple linear congruential generator in the test), the `evaluation` returned by `POST /housing/evaluate` deep-equals `evaluateHousing` called directly with the same budgets. This pins client and server to the same function.
- Bundle: `@slj/domain` housing code is small; confirm `pnpm size` still passes (the housing screen is a lazy chunk).
- Edge cases: budgets not in the cache (never loaded) → verdict `UNKNOWN` locally and the note "Connect once to load your budget."

## 4. Steps
1. `local-housing.ts` with tests.
2. Change the hook and screen flow; remove the `explain=0` call from the client.
3. Parity test.
4. Commit: `feat(web): run housing math offline (S-R2-007)`.

## 5. Acceptance criteria
- AC1: Given offline mode with a cached budget, when "Run the numbers" is pressed, then totals, verdict, flags and the risk warning appear with the template explanation and no request is attempted.
- AC2: Given online mode, then the numbers appear before any network response and the explanation is replaced when the server answers.
- AC3: Given 50 generated inputs, then server and direct domain results are identical (parity test).
- AC4 (negative): Given offline mode, then "Save option" is disabled with its hint.
- AC5 (negative): Given `apps/web/src/lib/local-housing.ts`, then it contains no arithmetic on amounts of its own (it only calls `@slj/domain`) — reviewer check plus a lint-style test that the file has no `+` or `*` operators on identifiers ending in `Minor`.

## 6. Tests to write
`local-housing.test.ts`: AC1 (function level), template explanation per verdict. `housing-parity.test.ts`: AC3. Screen test additions: AC2, AC4.

## 7. Verification commands
```bash
pnpm test && pnpm build && pnpm size   # expected: pass
pnpm typecheck && pnpm lint            # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- Importing `@slj/domain` into the web bundle pulls in server-only code or breaks the dependency check: stop and report the import chain.

## 10. Rollback / undo note
`git revert` restores the two-request flow.

## 11. Out of scope
Offline listing extraction (needs a model); saving options offline (not queued by design).
