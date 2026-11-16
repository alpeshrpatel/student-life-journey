# S-R3-031 — Translate app to Spanish

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
| Parallel-safe with | every R3 story except S-R3-013, S-R3-014, S-R3-030, S-R3-032, S-R3-033 (locale files) |

## 1. Why
Spanish is the first additional language (ADR-0025; R3 exit criterion 7). Many movers read English for study but prefer their first language for money, housing and safety — the parts of this product where a misunderstanding costs most.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0025-internationalisation.md` (languages, glossary rule, review rule); `docs/plan/07_UX_DESIGN_SYSTEM.md` §3 (voice: plain, calm, second person, no exclamation marks); `docs/plan/GLOSSARY.md` (product terms); `docs/plan/11_GO_TO_MARKET.md` §13 ("Translations … are reviewed by a fluent speaker before publication").
- **Files to read first:** `apps/web/src/i18n/locales/en/*.json` (all namespaces), `apps/web/src/i18n/index.ts` (`SHIPPED_LOCALES`), `apps/web/scripts/check-locale-keys.mjs`, `apps/api/src/modules/notifications/{catalogue.ts,email-templates.ts}`, `packages/domain/src/housing/risk-checklist.ts` (`RISK_WARNING`), `docs/store/listing.en.json`.
- **Files to create:** `apps/web/src/i18n/locales/es/*.json` (one per English namespace), `apps/web/src/i18n/glossary.es.md`, `apps/api/src/modules/notifications/catalogue.es.ts`, `docs/store/listing.es.json`, `docs/reviews/R3-translation-es.md` (the reviewer's sign-off).
- **Files to modify:** `apps/web/src/i18n/index.ts` (add `es` to `SHIPPED_LOCALES`), notification catalogue and email template lookups (locale parameter with `en` fallback), `scripts/check-store-listing.mjs` (validate every `listing.*.json`), `apps/web/e2e/` (one Spanish journey), production `FLAGS` (`languagesEnabled: true` once signed off).
- **Files you must NOT touch:** English source strings (if an English string is wrong, fix it in its own commit first); domain plan templates (`S-R3-033`).
- Env vars: none.

## 3. Design notes
- Register: neutral Latin American Spanish, informal second person (**tú**), no regionalisms; sentence case; no exclamation marks; same reading level as the English.
- `glossary.es.md` — decide each term once, before translating, and use it everywhere (table: English · Spanish · note). It must include at least: plan, task, priority, readiness, housing option, monthly cost, move-in cash, deposit, utilities, verdict labels (Compatible / Tight / Over budget / Unknown), risk checklist, concierge, saved places, reminder, basic mode, sign in / sign out, delete account, export my data. Product name "Student Life Journey" is not translated.
- **Safety-critical strings** (translate with extra care; the reviewer checks each one against the English word by word, and they are listed in the sign-off):
  - the housing risk warning — English is fixed byte for byte as "Potential risk detected. Verify the property, landlord, lease, and payment method before sending money."; the Spanish must carry all four objects and the "before sending money" condition;
  - the five risk checklist items; the emergency guidance text; the AI limitation notices ("This is general guidance, not legal or medical advice" family); account deletion confirmation; consent texts.
  - The English `RISK_WARNING` constant stays the canonical value in the domain and in tests; the UI shows the locale's translation through its i18n key.
- Mechanics: every key from `en` exists in `es` with the same interpolation variables and plural forms (`_one`, `_other`); no English left untranslated except the product name and proper nouns; lengths: buttons and tab labels may be up to 30% longer — check the five tab labels fit at 360 px without truncation (shorten the Spanish, not the font).
- A machine translation may be used as a **first draft only**; every string is then edited by the executor against the glossary, and the fluent reviewer reads the whole app in Spanish on a phone. The review record lists: reviewer handle, date, build, strings changed, and an explicit line for each safety-critical string. Without the sign-off, `es` stays out of `SHIPPED_LOCALES` in production (it may ship to preview).
- Server-side text: the five reminder titles and bodies, lifecycle emails (if S-R3-014 is done) and the email frame ("Open the app", unsubscribe line) in `catalogue.es.ts`; selection by `profile.locale`.
- Concierge: no prompt translation. Verify with five Spanish test questions on preview that replies come back in Spanish, that guardrail notices appear in Spanish (they are UI strings), and that the deterministic fallback replies exist in Spanish (they are domain text → S-R3-033; until then the fallback may answer in English with the localised notice "Basic mode").
- Store listing: `listing.es.json` with the same keys and limits (Spanish App Store and Play listings are added by the founder afterwards; screenshots can be regenerated with `--locale es` once S-R3-002's spec accepts a locale parameter — add that parameter here).
- Dates, numbers and money come from `format.ts` — nothing to translate.

## 4. Steps
1. Glossary. 2. Translate namespace by namespace; run `i18n:check` after each. 3. Server catalogue. 4. Layout pass at 360 px on every screen; fix overflows by rewording. 5. Spanish Playwright journey (onboarding → dashboard → housing verdict) asserting on three known Spanish strings and the absence of raw keys. 6. Reviewer pass on preview; apply changes; sign-off file. 7. Ship: add to `SHIPPED_LOCALES`, enable the flag. 8. Commit: `feat(repo): translate app to spanish (S-R3-031)`.

## 5. Acceptance criteria
- AC1: Given `pnpm --filter @slj/web i18n:check`, then `es` has exactly the English key set, with matching variables and no empty values.
- AC2: Given Spanish selected, then every screen in the core journey shows Spanish text, no raw key (pattern `\w+\.\w+\.\w+`) and no truncated tab label at 360 px.
- AC3: Given a user with `profile.locale = "es"` and a due reminder, then the in-app notification and the email are in Spanish.
- AC4: Given `docs/reviews/R3-translation-es.md`, then a fluent reviewer has signed off, with each safety-critical string listed.
- AC5 (negative): Given the Spanish risk warning, then it mentions the property, the landlord, the lease and the payment method, and the instruction to verify before sending money (reviewer-checked; a unit test asserts the string is non-empty and differs from the English).
- AC6 (negative): Given the domain tests, then `RISK_WARNING` in English is unchanged byte for byte.
- AC7 (negative): Given no sign-off file, then the production flag change is not made.

## 6. Tests to write
Spanish Playwright journey; notification catalogue test for `es` with fallback to `en` for a missing key; store-listing check for `listing.es.json`.

## 7. Verification commands
```bash
pnpm --filter @slj/web i18n:check && pnpm store:check   # expected: exit 0
pnpm test && pnpm --filter @slj/web e2e                 # expected: pass
pnpm --filter @slj/web build && pnpm size               # expected: entry chunk unchanged (locale chunks are lazy)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (glossary, review record)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- No fluent reviewer is available: finish everything else, ship to preview only, mark the story BLOCKED on the review — do not release unreviewed safety text.
- A string cannot be translated without changing its meaning or layout: raise it; do not paraphrase a safety string to make it fit.

## 10. Rollback / undo note
Remove `es` from `SHIPPED_LOCALES` (users fall back to English; their stored preference is kept).

## 11. Out of scope
Translating city guides and the marketing site (PL-21); regional variants (es-ES).
