# S-R3-032 — Translate app to Simplified Chinese

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Internationalisation |
| Type | feature |
| Size | M (≤half day, plus a fluent reviewer's pass) |
| Priority | P1 |
| Depends on | S-R3-030 |
| Blocks | — |
| Executor tier | Tier-2 for the files and checks; a fluent human reviewer signs off before release |
| Platforms | web, mobile, backend |
| Parallel-safe with | every R3 story except S-R3-013, S-R3-014, S-R3-030, S-R3-031, S-R3-033 (locale files) |

## 1. Why
Simplified Chinese is the second additional language (ADR-0025; R3 exit criterion 7). It also exercises what Spanish does not: a non-Latin script, no plural forms, different line breaking and font fallback.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0025-internationalisation.md`; `docs/plan/07_UX_DESIGN_SYSTEM.md` §3 (voice) and §5 (font stack); `docs/plan/GLOSSARY.md`; `docs/plan/stories/R3/S-R3-031-translate-app-to-spanish.md` (**the same method applies — read it first; this story lists only the differences**).
- **Files to read first:** as in S-R3-031, plus `apps/web/src/styles/base.css` (font stack, `word-break` rules).
- **Files to create:** `apps/web/src/i18n/locales/zh-Hans/*.json`, `apps/web/src/i18n/glossary.zh-Hans.md`, `apps/api/src/modules/notifications/catalogue.zh-Hans.ts`, `docs/store/listing.zh-Hans.json`, `docs/reviews/R3-translation-zh-Hans.md`.
- **Files to modify:** `apps/web/src/i18n/index.ts` (`SHIPPED_LOCALES`), `apps/web/src/styles/base.css` (CJK font fallback and line-breaking), notification lookups (shared with S-R3-031 — whichever lands second only adds its catalogue), `apps/web/e2e/` (one Chinese journey).
- **Files you must NOT touch:** English source strings; domain plan templates (`S-R3-033`).
- Env vars: none.

## 3. Design notes
- Register: Simplified Chinese as used in mainland China (`zh-Hans`), polite and plain, addressing the user as **你** (not 您 — matches the product's informal, calm voice); full-width punctuation (，。：？); no exclamation marks; Arabic numerals for amounts and dates.
- Spacing convention: a half-width space between Chinese characters and Latin words or numbers is **not** inserted by hand; rely on the browser. The product name stays "Student Life Journey" in Latin script.
- Glossary (`glossary.zh-Hans.md`): the same term list as Spanish, decided before translating. Pay particular attention to: deposit (押金), utilities (水电费 or 水电杂费 — choose one), move-in cash, verdict labels, concierge (do not translate as a hotel role; choose a neutral "助手"-style term and record it), readiness.
- Plurals: Chinese has one plural category. Every English key with `_one` and `_other` needs **only** `_other` in `zh-Hans`; the key-check script must treat plural suffix sets per locale according to `Intl.PluralRules` (extend `check-locale-keys.mjs` if it compares suffixes literally — add a test).
- Interpolation order: Chinese word order often differs; use the named variables freely in a different order — never split a sentence across two keys to work around order.
- Typography and layout:
  - Font stack: append system CJK fonts after the existing stack: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif` — no web font is downloaded.
  - Line breaking: for `:lang(zh-Hans)` set `line-break: strict; word-break: normal; overflow-wrap: anywhere` on text containers so that long Latin tokens (URLs, emails) still wrap.
  - Chinese strings are usually **shorter** than English; check that buttons and chips do not collapse below the 44 px target and that headings do not look orphaned; line height for body text at least 1.6 for Chinese.
  - Italic is not used for emphasis in Chinese (no italic CJK faces): where English uses `<em>`, the Chinese string uses plain text or the design system's strong style.
- Dates and numbers: from `format.ts` (`2027年1月9日`); currency stays the user's currency (for example `US$949.00` as `Intl` renders it for `zh-Hans` — accept `Intl`'s output).
- Safety-critical strings: the same list as S-R3-031, checked one by one by the reviewer and listed in the sign-off. The risk warning must name all four things to verify (房源、房东、租约、付款方式) and the condition "before sending money".
- Concierge: verify with five Chinese test questions on preview that replies are in Simplified Chinese and that guardrail patterns still work — the forbidden-claim patterns in `packages/ai/src/guardrails/patterns.ts` were written for English. **This is a real gap**: add Chinese (and, if S-R3-031 has landed, Spanish) variants of the invented-listing, availability, verification and performed-action patterns, with at least five eval cases per language per family in `packages/ai/evals/cases/safety/` (the model can say "I have booked it for you" in any language). If S-R3-031 landed first without this, add the Spanish patterns here.
- Store listing `listing.zh-Hans.json`: note in the README that the mainland China App Store storefront has extra legal requirements (an ICP filing for apps) — the founder decides separately whether to offer the app there; the translation serves Chinese-speaking users in other storefronts regardless.

## 4. Steps
1. Glossary. 2. Key-check plural handling. 3. Translate; `i18n:check`. 4. CSS for CJK; layout pass on every screen at 360 px and 1280 px. 5. Server catalogue. 6. Guardrail patterns and eval cases for non-English output. 7. Chinese Playwright journey. 8. Reviewer pass; sign-off. 9. Ship. 10. Commit: `feat(repo): translate app to simplified chinese (S-R3-032)`.

## 5. Acceptance criteria
- AC1: Given `i18n:check`, then `zh-Hans` passes with only `_other` plural forms and matching variables.
- AC2: Given Chinese selected, then the core journey shows Chinese text with no raw keys, no tofu (missing-glyph boxes) on Windows, macOS, Android and iOS, and all touch targets at least 44 px.
- AC3: Given a long URL inside a Chinese paragraph at 360 px, then there is no horizontal scroll.
- AC4: Given `pnpm evals`, then the new non-English safety cases pass: a scripted model output claiming in Chinese (and Spanish) that a booking or payment was made is blocked or repaired by the guardrails.
- AC5: Given `docs/reviews/R3-translation-zh-Hans.md`, then a fluent reviewer has signed off with each safety-critical string listed.
- AC6 (negative): Given a browser language of `zh-TW`, then the app starts in English, not Simplified Chinese (the switcher still offers 简体中文).
- AC7 (negative): Given no sign-off, then `zh-Hans` is not in production `SHIPPED_LOCALES`.

## 6. Tests to write
Key-check plural test; Chinese Playwright journey; guardrail pattern unit tests and the eval cases; notification catalogue test for `zh-Hans`.

## 7. Verification commands
```bash
pnpm --filter @slj/web i18n:check && pnpm store:check   # expected: exit 0
pnpm test && pnpm evals && pnpm --filter @slj/web e2e   # expected: pass
pnpm --filter @slj/web build && pnpm size               # expected: entry chunk unchanged
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (glossary, review record)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No fluent reviewer: preview only; story BLOCKED on review.
- The guardrails cannot reliably detect non-English forbidden claims with patterns: stop and report — the fallback is to keep concierge replies in English for that locale (a prompt instruction plus a UI notice) until a better check exists; do not ship an unguarded language.

## 10. Rollback / undo note
Remove `zh-Hans` from `SHIPPED_LOCALES`.

## 11. Out of scope
Traditional Chinese; the mainland China storefront decision; translated city guides (PL-21).
