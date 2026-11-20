# S-R2-016 — Add pseudo-locale and RTL smoke test

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Internationalisation |
| Type | test |
| Size | S (≤2 h) |
| Priority | P2 |
| Depends on | S-R0-020, S-R1-095 |
| Blocks | S-R3-030 |
| Executor tier | Tier-2 — test tooling for translation readiness |
| Platforms | web |
| Parallel-safe with | S-R2-001 to S-R2-015, S-R2-017 to S-R2-062 |

## 1. Why
Translations arrive in R3. A pseudo-locale now reveals hard-coded strings, concatenated sentences and layouts that break with longer text; an RTL smoke run proves that logical properties were used (ADR-0025).

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0025-internationalisation.md`; `docs/plan/07_UX_DESIGN_SYSTEM.md` §11 (long-string and RTL layout rules).
- **Files to read first:** `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/locales/en/*.json`, `eslint.config.js` (the rule that bans string literals in JSX).
- **Files to create:** `apps/web/scripts/make-pseudo-locale.mjs`, `apps/web/src/i18n/pseudo.ts`, `apps/web/e2e/i18n.spec.ts`, `apps/web/src/i18n/locale-files.test.ts`.
- **Files to modify:** `apps/web/src/i18n/index.ts` (register pseudo-locales in dev and test builds only), `apps/web/package.json` (script `"i18n:pseudo"`).
- **Files you must NOT touch:** English strings.
- Env vars: none.

## 3. Design notes
- Two pseudo-locales, generated at runtime from the English resources (no files to maintain): `en-XA` (accented and 40% longer: each string becomes `[` + accented characters + padding `~` to +40% + `]`, leaving `{{variables}}`, `<tags>` and plural suffix keys untouched) and `ar-XB` (the same transform plus `dir="rtl"` on `<html>`).
- `pseudo.ts`: `export function pseudoize(resources: Resource): Resource`. Enabled only when `import.meta.env.DEV` or `MODE === "test"`; selected with `?lng=en-XA` (the detector reads the query parameter in dev and test only). Production builds contain neither the code nor the option (verify with a bundle search).
- `locale-files.test.ts` (unit): every key used in code exists in the English files and every English key is used — implement with a static scan: collect `t("ns:key")`, `t("key")` with `useTranslation("ns")`, and `i18nKey="…"` occurrences by regex; report unknown and unused keys; allow a small `DYNAMIC_KEYS` list for keys built at runtime (such as `tasks:priority.${p}`) declared as prefixes.
- `i18n.spec.ts` (Playwright, Chromium):
  1. With `?lng=en-XA`, walk the main screens (seeded user) and collect all visible text nodes; assert each either starts with `[` and ends with `]`, or is user data (the destination city, task titles from the domain catalogue — these are domain-localised separately — amounts, dates), or matches an allow-list of brand words ("Google"). Any other plain string is a hard-coded literal → fail with the text and a selector.
  2. With `en-XA` at 390 px width: no horizontal scroll; the bottom tabs and the primary buttons do not clip (`scrollWidth <= clientWidth` per element).
  3. With `?lng=ar-XB`: `<html dir="rtl">`; the sidebar is on the right at desktop width; the "Skip to content" link and the back icon are mirrored; no horizontal scroll. This is a smoke check, not a full RTL audit.
- Dates, numbers and money in the pseudo-locales use `en` formatting.
- Fix what the specs find: move literals to locale files; replace string concatenation by interpolation; replace `ml-*`/`pl-*`/`left-*`/`text-left` utilities by logical ones (`ms-*`, `ps-*`, `start-*`, `text-start`).

## 4. Steps
1. `pseudoize` with unit tests (variables and tags preserved).
2. Key-consistency test; fix findings.
3. E2E spec; fix findings.
4. Commit: `test(web): add pseudo-locale and RTL smoke test (S-R2-016)`.

## 5. Acceptance criteria
- AC1: Given `?lng=en-XA` in dev, then interface text renders in bracketed, lengthened form with variables substituted correctly.
- AC2: Given the E2E walk, then no hard-coded interface string is found outside the allow-list.
- AC3: Given `ar-XB`, then the document direction is RTL and no screen scrolls horizontally.
- AC4 (negative): Given the production bundle, then it contains neither `en-XA` nor `pseudoize`.
- AC5 (negative): Given a key used in code but missing from the English files (local experiment), then the unit test fails naming the key.

## 6. Tests to write
`pseudo` unit tests; `locale-files.test.ts`; `e2e/i18n.spec.ts`.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm e2e                                 # expected: pass
pnpm build && grep -rl "en-XA" apps/web/dist ; echo "exit=$?"           # expected: exit=1
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- More than 30 hard-coded strings are found: fix them in this story only if it fits two hours; otherwise list the files on the board and split a follow-up story.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Real translations and the language switcher (`S-R3-030` to `S-R3-033`); a full RTL design pass (parked until an RTL language is planned).
