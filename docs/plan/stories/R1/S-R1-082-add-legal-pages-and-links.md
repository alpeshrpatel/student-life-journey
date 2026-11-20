# S-R1-082 — Add legal pages and links

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R1 |
| Epic | Privacy and Trust |
| Type | docs |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R0-023 |
| Blocks | S-R1-095, S-R2-024 |
| Executor tier | Tier-2 — drafting from the plan's privacy facts; founder review required |
| Platforms | web |
| Parallel-safe with | S-R1-001 to S-R1-081 |

## 1. Why
Beta users must be able to read what data is collected and what the product does and does not do before they sign in (Google's OAuth consent screen also requires both links).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §15 (data inventory, retention, processors — the source for every statement); `docs/plan/adr/ADR-0020-analytics-and-privacy.md`; spec §23–24 (what the product never does); `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.10.
- **Files to read first:** `apps/web/src/app/router.tsx`, `apps/web/src/screens/signin/signin-screen.tsx`, `apps/api/src/http/routes/config.ts` (legal versions).
- **Files to create:** `apps/web/src/screens/legal/privacy-screen.tsx`, `apps/web/src/screens/legal/terms-screen.tsx`, `apps/web/src/screens/legal/legal-layout.tsx`, `apps/web/src/i18n/locales/en/legal.json`, `apps/web/src/screens/legal/legal.test.tsx`.
- **Files to modify:** `apps/web/src/app/router.tsx` (public routes `/legal/privacy`, `/legal/terms`), `apps/web/src/screens/signin/signin-screen.tsx` (footer links), `apps/web/src/i18n/index.ts`.
- **Files you must NOT touch:** API code.
- Env vars: none.

## 3. Design notes
- Both pages are public (outside the route guards), plain text with headings, max line length 70 characters (`max-w-[70ch]`), version and date at the top ("Version 2026-11-beta"), a "Back" link, and they work signed out.
- The text lives in `legal.json` as arrays of `{ heading, paragraphs[] }` so that R3 can translate it; render paragraphs as text.
- **Privacy notice — required sections** (write plainly; every statement must match `06` §15; if a fact is not in that document, leave it out and list it in the PR for the founder):
  1. Who we are and how to contact us (placeholder `{CONTACT_EMAIL}` read from an i18n variable — the founder supplies it; do not invent an address).
  2. What we collect: Google account name, email and picture; relocation details you enter (cities, arrival date and time, budgets, housing status, transport preferences, optional home area); tasks, saved housing numbers, saved places; concierge messages (stored with emails, phone numbers and long digit runs removed); technical logs with a request ID; optional anonymous usage statistics.
  3. What we do not collect: passwords, card or bank numbers, passport or visa documents, exact home address, precise device location, contacts, advertising identifiers.
  4. How we use it: to build your plan and answer your questions. No advertising, no sale of data.
  5. AI processing: parts of your details are sent to AI model providers to write answers; identity fields and your home area are not sent; pasted listings are used once and not stored; AI output is checked by rules and can still be wrong.
  6. Processors: Cloudflare (hosting, database), Google (sign-in), the configured AI providers, Geoapify (place search), Sentry (error reports, EU), PostHog (statistics, EU) — only those enabled at the time; say that the list is kept current on this page.
  7. Retention: account data until you delete the account; concierge messages 90 days; AI call records 30 days; logs short-lived.
  8. Your choices: change or delete data in Settings; turn statistics off; delete the account (available in the app from the next release; until then by emailing the contact address).
  9. Age: 16 and over.
  10. Changes to this notice and its version.
- **Terms — required sections:** what the service is (a planning aid for non-academic relocation tasks); what it is not (not legal, immigration, medical, financial or academic advice; it does not verify listings, landlords or prices; it never books, pays or contacts anyone); your responsibilities (check facts, especially before paying for housing); beta status (may change or stop; no guarantee of availability); acceptable use; liability wording placeholder marked `[FOUNDER/LAWYER REVIEW]`; governing-law placeholder marked the same; contact.
- These are **drafts for a private beta**. A visible line at the top of both pages: "Beta draft. This text will be reviewed before public launch." S-R2-024 replaces the drafts after review.
- Sign-in footer: "By continuing you agree to the Terms and acknowledge the Privacy Notice." with both links.

## 4. Steps
1. Layout and two pages from the locale file; routes; sign-in links.
2. Tests → pass.
3. Ask the founder (PR description) to read both pages and supply the contact address.
4. Commit: `docs(web): add legal pages and links (S-R1-082)`.

## 5. Acceptance criteria
- AC1: Given a signed-out visitor, when `/legal/privacy` and `/legal/terms` are opened, then each renders its headings, the version line and the beta-draft line.
- AC2: Given the sign-in screen, then both links are present and navigate to the pages.
- AC3 (negative): Given the privacy text, when compared with `06` §15, then it names no processor and no data type that the plan does not list (reviewer check recorded in the PR).
- AC4 (negative): Given the pages, then no placeholder other than the two marked `[FOUNDER/LAWYER REVIEW]` and `{CONTACT_EMAIL}` remains, and there is no "lorem ipsum".
- AC5: Given the pages, then axe reports no violations and headings are in order.

## 6. Tests to write
`legal.test.tsx`: AC1, AC2, AC5; "renders without a session".

## 7. Verification commands
```bash
pnpm --filter @slj/web test     # expected: pass
pnpm typecheck && pnpm lint     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to copy another company's policy text, or to state a legal claim ("GDPR compliant", "your data is 100% secure"): stop — describe facts only; compliance claims need the founder and a lawyer (S-R2-024).

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Final reviewed text and cookie or consent banners (`S-R2-024`, `S-R2-023`); the marketing site's copies of these pages (`S-R2-057`).
