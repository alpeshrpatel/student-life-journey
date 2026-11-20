# ADR-0025 — Internationalisation

**TL;DR**
1. i18next + react-i18next are wired in R0; no user-facing string is written as a literal in JSX.
2. English ships first; Spanish and Simplified Chinese ship in R3 after human review.
3. Currency, numbers, dates and distances are formatted with the platform `Intl` APIs from the user's locale, currency and unit preferences.
4. Layout uses logical CSS properties so right-to-left languages need no rework later.
5. Reversal cost S–M; runner-up is FormatJS (react-intl).

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Design Lead, PM hats |
| Supersedes | Hard-coded English and `en-US`/USD formatting in `legacy/prototype/src/shared/utils.ts` and `legacy/prototype/src/lib/client.ts` |
| Related | ADR-0012, ADR-0013 |

## Context

The primary persona is an international student. The largest sending regions for study destinations such as the United States, United Kingdom, Canada and Australia are South Asia, China and Latin America. Students from India generally operate in English; Chinese and Spanish speakers benefit most from a native-language interface at a stressful moment. The launch market is assumed to be the United States (A-01), where Spanish also serves many domestic first-time renters.

## Decision drivers

1. Weak-model familiarity (weight 3).
2. Works in a static SPA and in shells without build plugins (weight 2).
3. Plural and interpolation support (weight 2).
4. Ecosystem (weight 2).
5. Bundle size (weight 1).

## Options

Scores 1–5; maximum weighted total 50.

| Option | Weak-model | SPA + shells | Plurals | Ecosystem | Bundle | Total |
|---|---|---|---|---|---|---|
| A. Hard-coded English (do nothing) | 5 | 5 | 1 | 1 | 5 | 34 |
| **B. i18next + react-i18next** | 5 | 5 | 4 | 5 | 3 | **46** |
| C. Lingui | 3 | 3 | 5 | 3 | 4 | 35 |
| D. FormatJS (react-intl) | 4 | 4 | 5 | 4 | 3 | 41 |
| E. Paraglide | 2 | 3 | 3 | 2 | 5 | 27 |

## Decision

| Aspect | Rule |
|---|---|
| Library | `i18next` 27 + `react-i18next` 18, initialised in `apps/web/src/i18n/index.ts` |
| Files | `apps/web/src/i18n/locales/<lng>/<namespace>.json`; namespaces: `common`, `auth`, `onboarding`, `dashboard`, `plan`, `tasks`, `housing`, `places`, `concierge`, `settings`, `legal`, `errors` |
| Keys | `screen.section.element`, e.g. `dashboard.priorities.title`; plural forms with i18next suffixes (`_one`, `_other`) |
| Enforcement | ESLint rule `react/jsx-no-literals` (allowing punctuation) in `apps/web/src`; a unit test checks that every key used in `en` exists in each shipped locale |
| Locale source | `profile.locale` when signed in; otherwise `navigator.language`; fallback `en` |
| Languages | R0–R2: `en`. R3: `es`, `zh-Hans` (S-R3-031, S-R3-032). Parked: `hi`, `ar`, `pt-BR`, `ko`, `vi` (PL-21) |
| Currency | Money is `{ amountMinor, currency }`; display through `formatMoney()` in `apps/web/src/lib/format.ts` using `Intl.NumberFormat(locale, { style: "currency", currency })`. One currency per user (`profile.currency`, default from destination country, editable) |
| Units | `profile.units` (`metric` or `imperial`, default from destination country); `formatDistance()` converts metres |
| Dates and time zones | Arrival is a local calendar date + optional `HH:mm` + `destination_tz`. "Days until arrival" is computed in `@slj/domain` from today's date in the destination time zone. Display with `Intl.DateTimeFormat` |
| Server-generated text | Baseline plan templates and deterministic fallbacks live in `packages/domain/src/i18n/<lng>.ts` and are rendered in the user's locale at generation time (S-R3-033 adds `es`, `zh-Hans`). Stored task text is not re-translated when the locale changes; regenerating the plan does it |
| LLM output | Prompts state the target locale; replies are in the user's language; safety fallbacks come from the server catalogue |
| RTL readiness | Tailwind logical utilities only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `border-s-*`); physical `ml-`/`mr-`/`left-`/`right-` utilities are lint-forbidden; `<html dir>` is set from the locale |
| Long strings | Components must tolerate 40% longer text: no fixed widths on labels, wrap instead of truncate for task titles (rules in `07_UX_DESIGN_SYSTEM.md` §11) |
| Testing | Pseudo-locale `en-XA` (accented, +40% length) and an RTL smoke run in Playwright (S-R2-016) |

## Consequences

**Good:** adding a language is translation work only; formatting is correct for any currency and locale from day one.

**Bad:** every UI story must add keys; stored plan text can lag behind a locale change.

**Neutral:** the public site (`apps/site`) handles its own content localisation with Astro routing.

## Reversal cost

**S–M.** Key files convert to ICU message format mechanically.

## Flip trigger

Switch to FormatJS if translators need full ICU select/plural nesting that i18next cannot express cleanly. Add a parked language when it represents ≥ 8% of sign-ups by browser language for 30 days.

## References

- Vision §3 (target users).
- `00_PROGRESS_LOG.md` §3.5.
