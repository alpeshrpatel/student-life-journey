# S-R0-020 — Add i18n scaffolding

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Internationalisation |
| Type | infra |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-016 |
| Blocks | S-R0-023, S-R2-016 |
| Executor tier | Tier-1 — library initialisation and formatting helpers with given signatures |
| Platforms | web |
| Parallel-safe with | S-R0-017, S-R0-018, S-R0-019, S-R0-021 |

## 1. Why
Strings and formats must be translatable from the first screen; retrofitting i18n later touches every file.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0025-internationalisation.md`; `docs/plan/07_UX_DESIGN_SYSTEM.md` §11.
- **Files to read first:** `apps/web/src/main.tsx`, `apps/web/src/app/placeholder-screen.tsx`; `legacy/prototype/src/shared/utils.ts` (`formatMoney`, `formatDistance`, `greetingForHour`, `firstName`).
- **Files to create:** `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/locales/en/common.json`, `apps/web/src/i18n/locales/en/errors.json`, `apps/web/src/lib/format.ts`, `apps/web/src/lib/format.test.ts`, `apps/web/src/i18n/i18n.test.ts`.
- **Files to modify:** `apps/web/src/main.tsx` (import `./i18n`), `apps/web/src/app/placeholder-screen.tsx` (use `t()`), `apps/web/package.json` (`i18next@^27.1.1`, `react-i18next@^18.0.1`), `apps/web/src/test/setup.ts` (initialise i18n for tests).
- **Files you must NOT touch:** `eslint.config.js` (the literal-string rule already exists).
- Env vars: none.

## 3. Design notes
- `i18n/index.ts`: `i18next.use(initReactI18next).init({ lng: navigator.language.startsWith("en") ? "en" : "en", fallbackLng: "en", defaultNS: "common", ns: ["common", "errors"], resources: { en: { common, errors } }, interpolation: { escapeValue: false } })`. Export `i18n` and `export const SUPPORTED_LOCALES = ["en"] as const`.
- `common.json` initial keys: `app.name` ("Student Life Journey"), `app.tagline` ("Know what to do next."), `nav.home`, `nav.plan`, `nav.tasks`, `nav.housing`, `nav.places`, `nav.concierge`, `nav.chat`, `nav.settings`, `placeholder.home`, `placeholder.notFound` ("We can't find that page."), `actions.retry` ("Try again"), `actions.goHome` ("Go to Home"), `greeting.upLate`, `greeting.morning`, `greeting.afternoon`, `greeting.evening`.
- `errors.json`: one key per `ErrorCode` from `@slj/contracts` with the user-facing sentence (for example `INTERNAL`: "Something went wrong on our side.", `RATE_LIMITED`: "You've reached today's limit. It resets tomorrow.").
- `lib/format.ts` (exact):

```ts
export function formatMoney(amountMinor: number | null, currency: string, locale: string): string;   // null → "—"; minor ÷ 100; no decimals when whole
export function formatDate(isoDate: string, locale: string): string;                                 // "Mon, Nov 16"
export function formatDistance(meters: number, units: "metric" | "imperial", locale: string): string; // "450 m", "1.8 km", "0.3 mi"
export function greetingKey(hour: number): "greeting.upLate" | "greeting.morning" | "greeting.afternoon" | "greeting.evening";
export function firstName(name: string | null): string;
```

- Edge cases: currencies with no minor unit (JPY: divide by 1 — use `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` to derive the divisor); negative money; distances under 100 m; `formatDate` must not shift the day (construct with `Date.UTC` and format with `timeZone: "UTC"`).

## 4. Steps
1. Add dependencies; create the i18n files; import in `main.tsx` and the test setup.
2. Replace placeholder literals with `t()` and remove any `eslint-disable` added in S-R0-016 → `pnpm lint` 0 errors.
3. Implement `format.ts` and tests → pass.
4. Commit: `feat(web): add i18n scaffolding (S-R0-020)`.

## 5. Acceptance criteria
- AC1: Given the placeholder screen, when rendered, then its text comes from `common.json` and no JSX string literal remains in `apps/web/src`.
- AC2: Given `formatMoney(125000, "USD", "en-US")`, then the result is `$1,250`; given `(94950, "USD", "en-US")`, then `$949.50`; given `(1200, "JPY", "ja-JP")`, then `￥1,200`.
- AC3: Given `formatDate("2026-11-16", "en-US")`, then the result is `Mon, Nov 16` in any system time zone.
- AC4 (negative): Given every `ErrorCode`, when looked up in `errors.json`, then a non-empty string exists (test iterates the enum).

## 6. Tests to write
`format.test.ts` (money, date, distance in both unit systems, greeting hours 3, 9, 14, 20, first name with null); `i18n.test.ts` (AC4; `t("app.tagline")`).

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm lint && pnpm typecheck   # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `@slj/contracts` is not yet a dependency of `@slj/web`: add `"@slj/contracts": "workspace:*"` — allowed. Anything else unexpected: stop.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Language switcher and more locales (R3); pseudo-locale (`S-R2-016`).
