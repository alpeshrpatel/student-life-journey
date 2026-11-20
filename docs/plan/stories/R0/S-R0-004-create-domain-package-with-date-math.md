# S-R0-004 — Create domain package with date math

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Repo Foundation |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-002 |
| Blocks | S-R0-006, S-R0-025, S-R0-026, S-R1-001, S-R1-005 |
| Executor tier | Tier-1 — pure functions with given signatures and test vectors |
| Platforms | backend, web |
| Parallel-safe with | S-R0-003, S-R0-005 |

## 1. Why
"Days until arrival" drives the dashboard, priorities and reminders. The prototype computed it in the server's time zone (defect D-10). This package is the single, pure, tested source of date rules.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md` (portable-subset rules: calendar dates are `YYYY-MM-DD` text); `docs/plan/GLOSSARY.md` ("Arrival date", "Days until arrival").
- **Files to read first:** `legacy/prototype/src/shared/utils.ts` (function `daysUntil`, to see what is being replaced).
- **Files to create:** `packages/domain/package.json`, `packages/domain/tsconfig.json`, `packages/domain/vitest.config.ts`, `packages/domain/src/index.ts`, `packages/domain/src/ids.ts`, `packages/domain/src/time/clock.ts`, `packages/domain/src/time/dates.ts`, `packages/domain/src/time/dates.test.ts`, `packages/domain/src/relocation/types.ts`.
- **Files to modify:** none.
- **Files you must NOT touch:** `legacy/**`, `docs/**`, root config files.
- Env vars / config: none.

## 3. Design notes
- Pattern: none; pure functions. The clock and the ID generator are types here and are injected by callers.
- `package.json`: `{ "name": "@slj/domain", "private": true, "type": "module", "exports": { ".": "./src/index.ts" }, "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" }, "dependencies": { "zod": "^4.6.7" } }`. `tsconfig.json` extends `../../tsconfig.base.json` with `"include": ["src"]`.
- Public interface (exact):

```ts
// time/clock.ts
export interface Clock { now(): number }            // epoch milliseconds
// ids.ts
export interface IdGenerator { next(): string }
// relocation/types.ts
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type IsoDate = z.infer<typeof IsoDateSchema>;
export const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const HousingStatusSchema = z.enum(["SEARCHING", "SECURED"]);
export type HousingStatus = z.infer<typeof HousingStatusSchema>;
export const TransportPrefSchema = z.enum(["PUBLIC_TRANSIT", "WALKING", "BIKE", "CAR", "RIDESHARE"]);
export type TransportPref = z.infer<typeof TransportPrefSchema>;
// time/dates.ts
export function todayInTimeZone(nowMs: number, timeZone: string | null): IsoDate;   // null → "UTC"
export function daysBetween(from: IsoDate, to: IsoDate): number;                    // whole days, to − from
export function daysUntilArrival(arrivalDate: IsoDate, nowMs: number, timeZone: string | null): number;
```

- Implementation hints: `todayInTimeZone` uses `new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs))`; `daysBetween` parses both dates with `Date.UTC(y, m - 1, d)` and divides by 86,400,000. An unknown time zone falls back to `"UTC"` (catch the `RangeError`).
- Examples: `daysBetween("2026-11-04", "2026-11-16")` → `12`; `daysUntilArrival("2026-11-16", Date.UTC(2026, 10, 5, 3, 0), "America/Phoenix")` → `12` (it is still 4 November in Phoenix); with `"UTC"` → `11`.
- Edge cases: arrival today → `0`; arrival in the past → negative; leap day; daylight-saving change days; invalid zone string.

## 4. Steps
1. Create the package files; `pnpm install` → `@slj/domain` is listed by `pnpm -r list --depth -1`.
2. Implement the types and functions; export everything from `src/index.ts` → `pnpm --filter @slj/domain typecheck` shows 0 errors.
3. Write the tests in §6 → `pnpm --filter @slj/domain test` passes.
4. `pnpm lint` → 0 errors (the domain purity rules apply).
5. Commit: `feat(domain): create domain package with date math (S-R0-004)`.

## 5. Acceptance criteria
- AC1: Given an arrival date 12 calendar days ahead in the destination zone, when calling `daysUntilArrival`, then it returns 12 regardless of the server's zone.
- AC2: Given `nowMs` just after midnight UTC, when the zone is `America/Phoenix`, then "today" is the previous calendar day.
- AC3 (negative): Given an invalid time-zone string, when calling `todayInTimeZone`, then it returns the UTC date and does not throw.

## 6. Tests to write
`packages/domain/src/time/dates.test.ts`: `daysBetween` same day, forward, backward, across a leap day; `todayInTimeZone` for UTC, `America/Phoenix`, `Asia/Kolkata`, invalid zone; `daysUntilArrival` examples above; schema tests for `IsoDateSchema` (rejects `2026-1-5`) and `TimeOfDaySchema` (rejects `24:00`).

## 7. Verification commands
```bash
pnpm --filter @slj/domain test       # expected: all tests pass
pnpm --filter @slj/domain typecheck  # expected: 0 errors
pnpm lint                            # expected: 0 errors
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The lint rule set from S-R0-003 blocks `new Date(nowMs)` (it must only block the argument-less form): stop and report.

## 10. Rollback / undo note
Delete `packages/domain`; `git revert`.

## 11. Out of scope
Money, tasks, journey phase, plans (R1); a concrete system clock (lives in the apps).
