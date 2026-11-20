# S-R3-009 — Build city guide page template

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R3-008 |
| Blocks | S-R3-010, S-R3-011 |
| Executor tier | Tier-2 — a static page generated from validated data |
| Platforms | web |
| Parallel-safe with | every R3 story except S-R3-011 (same layout file) |

## 1. Why
A validated JSON file is not a page. This story renders each published guide as a fast static page with visible sources and dates, plus an index, so that S-R3-010 is pure writing (`11_GO_TO_MARKET.md` §5).

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §5 (template sections; measurement: guide → app start rate); `docs/plan/07_UX_DESIGN_SYSTEM.md` §3 (voice) and §5 (tokens).
- **Files to read first:** `apps/site/src/lib/city-schema.ts`, `apps/site/src/content.config.ts`, `apps/site/src/layouts/base.astro`, `apps/site/src/pages/index.astro`, `apps/site/src/content/landing.ts`.
- **Files to create:** `apps/site/src/pages/cities/[slug].astro`, `apps/site/src/pages/cities/index.astro`, `apps/site/src/components/{sourced-item,guide-section,guide-cta}.astro`, `apps/site/src/lib/guides.ts` (`getPublishedGuides()`), `apps/site/test/guide-page.test.mjs`, `apps/site/test/fixtures/cities/testville.json`.
- **Files to modify:** `apps/site/src/pages/index.astro` (city-guides row, rendered only when at least one guide is published), `apps/site/src/styles/site.css`.
- **Files you must NOT touch:** the schema rules.
- Env vars: none new.

## 3. Design notes
- Routes: `/cities/` (index) and `/cities/<slug>/` for every guide with `status: "published"`. Drafts and `_`-prefixed files produce no page. With zero published guides, `/cities/` is not generated and the landing row is absent.
- Page structure for a guide (headings exact, `{city}` substituted):
  1. `<h1>` "Your first week in {city}"; under it the `intro`; a line "Checked on {reviewedOn, long date} by {reviewedBy}."
  2. `<h2>` "Getting from the airport" — `airportToCity` items.
  3. `<h2>` "Phone and data on day one" — `phoneAndData` items.
  4. `<h2>` "Where to get the basics" — `basics` as a definition list (category label → advice). A fixed note under it: "We don't recommend particular shops. Search the category near your address."
  5. `<h2>` "Getting around" — `transit` items, then `money` items if any.
  6. `<h2>` "Emergency numbers" — the emergency number in large text with its source; the non-emergency line if present. Fixed note: "In an emergency, call first."
  7. `<h2>` "First-week checklist" — an ordered list (plain text, not interactive).
  8. Call to action (`guide-cta.astro`): `<h2>` "Turn this into your own plan"; text "Tell us when you arrive and your budget. We'll put these steps in order for you."; primary link "Start my plan — free" → `PUBLIC_APP_URL/?src=guide-{slug}`; secondary link "Check what a listing really costs" → `PUBLIC_APP_URL/housing?src=guide-{slug}`.
  9. Footer note: "Facts on this page were checked on the dates shown. Things change — follow the source links to confirm. Spotted a mistake? Email support@<domain>."
- `sourced-item.astro`: the text, then a small line "Source: {sourceName} · checked {verifiedOn}" where the source name links to `sourceUrl` with `rel="noopener nofollow"` and opens in the same tab.
- Index page: `<h1>` "First-week guides"; a list of published cities (city, region) sorted by city name; intro sentence "Short, sourced guides for your first week. We add a city only when a person has checked every fact."
- Metadata: title "First week in {city}: airport, phone, transit, essentials"; description from `intro` cut at 155 characters on a word boundary; canonical `/cities/{slug}/`. Structured data: one JSON-LD `Article` block with `headline`, `dateModified` = `reviewedOn`, `author` = the organisation name — nothing else (no `FAQPage`, no ratings).
- The `src` query parameter is the attribution hook: the app already records the first-touch `src` value with `signed_up` (S-R1-084 client events); confirm the parameter name there and reuse it.
- No JavaScript on guide pages; the same page budget (≤ 60 KB excluding images); no images in R3.
- Print stylesheet: the checklist and emergency numbers print cleanly on one page (hide header, footer and call to action).

## 4. Steps
1. `guides.ts` loader and the two routes; components.
2. Styles including print; landing row.
3. Tests with the `testville` fixture (the test build points the collection at the fixtures folder through an environment variable read in `content.config.ts`).
4. Commit: `feat(site): build city guide page template (S-R3-009)`.

## 5. Acceptance criteria
- AC1: Given a published fixture guide, when the site builds, then `/cities/testville/index.html` exists with one `<h1>`, the seven sections in order, and every sourced item showing a source link and a date.
- AC2: Given the index, then it lists exactly the published guides.
- AC3: Given the call to action, then both links carry `src=guide-testville`.
- AC4: Given an accessibility scan of the built page, then there are no serious or critical findings; headings do not skip levels.
- AC5 (negative): Given a draft guide, then no page and no index entry is generated for it.
- AC6 (negative): Given zero published guides, then `/cities/` does not exist and the landing page shows no guides row.
- AC7 (negative): Given the built guide page, then it contains no script tag other than the JSON-LD block.

## 6. Tests to write
`apps/site/test/guide-page.test.mjs`: AC1–AC3, AC5–AC7 by building with fixtures and parsing the HTML.

## 7. Verification commands
```bash
pnpm --filter @slj/site test && pnpm --filter @slj/site build   # expected: pass
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (screenshots of the fixture page at 360 and 1280 px)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a map embed, weather widget, price table or comments: stop.
- You are about to render a field that the schema does not define: stop — extend the schema in its own story.

## 10. Rollback / undo note
`git revert`; guide JSON files remain valid.

## 11. Out of scope
Writing guides (`S-R3-010`); sitemap and social cards (`S-R3-011`); translated guides (PL-21).
