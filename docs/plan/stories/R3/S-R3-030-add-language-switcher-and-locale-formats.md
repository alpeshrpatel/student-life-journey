# S-R3-030 — Add language switcher and locale formats

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Internationalisation |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R2-016 |
| Blocks | S-R3-031, S-R3-032, S-R3-033 |
| Executor tier | Tier-2 — a settings control, a stored preference and formatting helpers |
| Platforms | backend, web, mobile |
| Parallel-safe with | every R3 story except S-R3-013, S-R3-014, S-R3-031 to S-R3-033 (locale files) |

## 1. Why
Translations are useless without a way to choose them and without dates, numbers and money following the chosen language. This story builds the switch and the formatting layer once, in English only, so that each language afterwards is a translation task (ADR-0025).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0025-internationalisation.md` (locale source: `profile.locale` when signed in, otherwise `navigator.language`, fallback `en`; languages `en`, `es`, `zh-Hans`; lazy-loaded namespaces); `docs/plan/stories/R2/S-R2-016-*.md` (pseudo-locale and RTL check — proves strings are externalised); `docs/plan/07_UX_DESIGN_SYSTEM.md` §3 (copy rules).
- **Files to read first:** `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/locales/en/*.json`, `apps/web/src/screens/settings/settings-screen.tsx`, `apps/api/src/infra/db/schema/profile.ts`, `packages/contracts/src/me.ts`, `apps/api/src/http/routes/me.ts` (`PATCH /api/v1/me`), every file using `toLocaleString`, `Intl.` or hand-built date strings (grep).
- **Files to create:** `packages/domain/src/i18n/locales.ts` (+ test), `apps/web/src/i18n/format.ts` (+ test), `apps/web/src/screens/settings/language-section.tsx` (+ test), `apps/web/scripts/check-locale-keys.mjs` (+ test).
- **Files to modify:** `apps/web/src/i18n/index.ts`, `packages/contracts/src/me.ts` (`locale`), `apps/api/src/http/routes/me.ts`, profile schema and a migration only if `profile.locale` does not exist yet (`06` §2 lists it — check first), `apps/web/src/screens/settings/settings-screen.tsx`, all call sites of ad-hoc formatting, `apps/web/package.json` (`"i18n:check"`), `.github/workflows/ci.yml`.
- **Files you must NOT touch:** translation content for `es` and `zh-Hans` (next stories).
- Env vars: none. Flag: `languagesEnabled` (default false) — the switcher is hidden until at least one translation ships.

## 3. Design notes
```ts
// packages/domain/src/i18n/locales.ts
export const SUPPORTED_LOCALES = ["en", "es", "zh-Hans"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_NAMES: Record<AppLocale, string>;                 // endonyms: "English", "Español", "简体中文"
export function resolveLocale(preferred: string | null | undefined, available: readonly AppLocale[]): AppLocale;
// "es-MX" → "es"; "zh-CN", "zh-SG", "zh" → "zh-Hans"; "zh-TW", "zh-HK", "zh-Hant" → "en" (no Traditional Chinese yet — do not show Simplified to Traditional readers silently); anything else → "en"
```

- `available` = the locales actually shipped (a constant `SHIPPED_LOCALES` in `apps/web/src/i18n/index.ts`, `["en"]` after this story). The switcher lists only shipped locales, each by its endonym, never by flags.
- Locale resolution on the web: signed in → `profile.locale` if set, else `resolveLocale(navigator.language)`; signed out → `localStorage` key `slj.locale` if set, else `navigator.language`. Changing the language in Settings: `i18n.changeLanguage`, `PATCH /api/v1/me { locale }`, set `<html lang>` and `dir` (all three shipped languages are left-to-right), store in `localStorage`. The sign-in screen gets a small language link in its footer (signed-out users must be able to switch too).
- Namespaces are lazy-loaded per language (`import()` per namespace JSON) so adding languages does not grow the entry bundle; `en` stays bundled as the fallback.
- `format.ts` — the only place that formats for display (all take the active locale from i18next):

```ts
export function formatDate(isoDate: string, style: "short" | "long"): string;            // calendar dates (no time zone shift): Intl.DateTimeFormat with timeZone "UTC"
export function formatDateTime(epochMs: number, timeZone: string): string;
export function formatRelativeDays(days: number): string;                                 // Intl.RelativeTimeFormat: "in 3 days", "yesterday"
export function formatMoney(m: { amountMinor: number; currency: string }): string;        // Intl.NumberFormat style "currency", minor-unit digits from the domain's minorUnitDigits
export function formatNumber(n: number): string;
export function formatDistance(metres: number, system: "metric" | "imperial"): string;
```

  Currency display keeps the **user's chosen currency** — language never changes the currency or the amounts. Replace every ad-hoc formatter; add a lint rule (`no-restricted-syntax`) forbidding `toLocaleString`, `toLocaleDateString` and `new Intl.` outside `format.ts`.
- Plurals: use i18next plural keys (`_one`, `_other`; Chinese uses `_other` only) — audit `en` strings that build plurals with string concatenation and convert them.
- Server: `profile.locale` validated against `SUPPORTED_LOCALES`; emails and notifications use it (catalogue text is still English until the translation stories add entries; the lookup falls back to `en` per key).
- `check-locale-keys.mjs`: for every shipped locale, every namespace file must have exactly the key set of `en` (no missing, no extra), the same interpolation variables per key (`{{name}}`), and no empty strings. With only `en` shipped it passes trivially; it is the gate for S-R3-031 and S-R3-032.
- The AI concierge's reply language is out of scope here (it follows the user's message language already through the prompt; S-R3-031 verifies it).

## 4. Steps
1. Domain locale helpers with tests; `format.ts` with tests (fixed locale inputs for `en`, `es`, `zh-Hans` — `Intl` works without translations).
2. Replace call sites; lint rule.
3. Switcher section, signed-out link, persistence, lazy loading.
4. Key-check script and CI step.
5. Commit: `feat(repo): add language switcher and locale formats (S-R3-030)`.

## 5. Acceptance criteria
- AC1: Given `resolveLocale` inputs `es-MX`, `zh-CN`, `zh-TW`, `fr`, `null`, then the results are `es`, `zh-Hans`, `en`, `en`, `en` (when all three are available) and `en` for all when only `en` is shipped.
- AC2: Given locale `es` in a test, then `formatMoney({ amountMinor: 94900, currency: "USD" })` and `formatDate("2027-01-09", "long")` return Spanish-formatted strings with the currency still USD.
- AC3: Given `languagesEnabled` true and two shipped locales (use the pseudo-locale in the test), when the user picks the second, then the UI switches without reload, `PATCH /api/v1/me` is sent, and after a reload the choice persists.
- AC4: Given the web entry chunk, then it contains only English strings (other locales load on demand) and `pnpm size` stays within budget.
- AC5 (negative): Given a file calling `date.toLocaleDateString()` outside `format.ts`, then `pnpm lint` fails.
- AC6 (negative): Given a locale file missing a key or with a different interpolation variable, then `pnpm --filter @slj/web i18n:check` fails naming the key.
- AC7 (negative): Given `PATCH /api/v1/me { locale: "xx" }`, then 422.
- AC8 (negative): Given `languagesEnabled` false, then no switcher is rendered and behaviour is unchanged from R2.

## 6. Tests to write
`locales.test.ts`, `format.test.ts`, `language-section.test.tsx`, `check-locale-keys.test.mjs`, API test for AC7.

## 7. Verification commands
```bash
pnpm test && pnpm typecheck && pnpm lint                      # expected: exit 0
pnpm --filter @slj/web i18n:check                             # expected: exit 0
pnpm --filter @slj/web build && pnpm size                     # expected: within budget
grep -rn "toLocale" apps/web/src --include=*.ts --include=*.tsx | grep -v "i18n/format" ; echo "exit=$?"   # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (flag)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to convert currencies or change units automatically with the language: stop — language only changes words and formats.
- You are about to add a translation-management service or machine-translate at runtime: stop.

## 10. Rollback / undo note
`languagesEnabled: false`; `git revert` if needed (formatting helpers can stay).

## 11. Out of scope
The translations (`S-R3-031`, `S-R3-032`); plan template text (`S-R3-033`); right-to-left languages (PL-21).
