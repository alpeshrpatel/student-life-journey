# S-R2-057 — Build landing page

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Growth |
| Type | feature |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-056 |
| Blocks | S-R2-061 |
| Executor tier | Tier-2 — one static page from a given wireframe and given copy |
| Platforms | web |
| Parallel-safe with | S-R2-009 to S-R2-055, S-R2-058 to S-R2-060 |

## 1. Why
The open beta needs one public page that says what the product does, what it refuses to do, and where to start (`11_GO_TO_MARKET.md` §3 and §4). It replaces the "Coming soon" placeholder from S-R2-056.

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §3 (messaging hierarchy, "What we never say"), §4 (wireframe and copy rules), §13 (ethics checklist); `docs/plan/07_UX_DESIGN_SYSTEM.md` §3 (voice: plain, short, no exclamation marks) and §5 (tokens).
- **Files to read first:** `apps/site/src/layouts/base.astro`, `apps/site/src/styles/site.css`, `apps/site/test/build.test.mjs`.
- **Files to create:** `apps/site/src/components/{hero,pillars,worked-example,boundaries,start-cta}.astro`, `apps/site/src/content/landing.ts` (all copy as one typed object), `apps/site/public/og-default.png` (1200×630, the wordmark and one line on the ground colour), `apps/site/test/landing.test.mjs`.
- **Files to modify:** `apps/site/src/pages/index.astro`, `apps/site/src/styles/site.css`.
- **Files you must NOT touch:** `apps/web/**`, `apps/api/**`.
- Env vars: none beyond `PUBLIC_APP_URL`, `PUBLIC_SITE_URL`.

## 3. Design notes
- Sections, in order (copy is exact; it lives in `landing.ts` so a later translation is one file):
  1. **Hero** — eyebrow "Moving to a new city?"; `<h1>` "Know what to do next."; paragraph "Tell us where you're going, when you arrive and your budget. We'll show you what matters first."; primary link-button "Start my plan — free" → `PUBLIC_APP_URL`; beside it the text "No ads. Nothing for sale."
  2. **Pillars** (`<h2 class="visually-hidden">What you get</h2>`, three items, each an `<h3>` and one sentence): "Your next steps" — "A short, ordered list for before arrival, your first 24 hours and your first week."; "The real cost" — "Monthly cost and move-in cash for any listing, checked against your budget."; "Arrival day" — "A first-24-hours list that still works when you're offline."
  3. **Worked example** — `<h2>` "See the real cost"; a static definition list: Rent $780 · Utilities $85 · Transit $64 → **$929 a month**; caption "An example with made-up numbers. Your own numbers stay private." (The wireframe's "$949" does not equal the sum of its three lines; use the correct sum, 929, and record the correction in the PR.) A secondary link "Check a listing" → `PUBLIC_APP_URL/housing`.
  4. **Boundaries** — `<h2>` "What this is not"; two short lists: "We don't do: listings, bookings, visas, courses." and "We never: invent prices or places, show ads, sell your data."
  5. **Start** — `<h2>` "Start before you pack"; the primary button again; under it a slot where the waitlist form (S-R2-058) and, from R3, store badges are placed. Until S-R2-058 lands, the slot is empty.
- The city-guides row of the wireframe is **not** rendered until guides exist (S-R3-009); no empty links.
- Visual rules: flush-left text; exactly one accent-filled element per viewport (the primary button); no stock photos, no illustrations of people, no testimonials, no user counts; generous white space; the worked example sits on the `surface` token with a 1 px `line` border. Mobile first: single column under 720 px; three pillar columns from 720 px.
- Accessibility: one `<h1>`; landmark regions; link-buttons are `<a>` elements with at least 44 px height; contrast from the tokens; the worked example is real text, not an image.
- Metadata through the layout: title "Student Life Journey — Know what to do next"; description = the promise sentence; `og:title`, `og:description`, `og:image` = `/og-default.png`, `og:type` website, `twitter:card` summary_large_image (full social metadata for other pages arrives in S-R3-011).
- Performance: no JavaScript on this page; one CSS file; the Open Graph image is not loaded by the page itself.
- Honesty check (from `11` §13): every sentence must be true in the shipped product on the day of release — "works offline" depends on S-R2-002 to S-R2-004 being DONE; if they are not, remove that clause until they are.

## 4. Steps
1. `landing.ts` with the copy; components; page.
2. Styles; check at 360, 768 and 1280 px, light and dark.
3. Tests; deploy to preview; read the page aloud once — cut anything that sounds like an advert.
4. Commit: `feat(site): build landing page (S-R2-057)`.

## 5. Acceptance criteria
- AC1: Given `/` on the built site, then it has exactly one `<h1>` with the text "Know what to do next." and two links to `PUBLIC_APP_URL` labelled "Start my plan — free".
- AC2: Given the worked example, then the three amounts sum to the total shown, and the caption labels it as an example.
- AC3: Given the page at 360 px width, then there is no horizontal scroll and every link target is at least 44 px high.
- AC4: Given an automated accessibility scan (axe through Playwright against the built files), then there are no serious or critical findings.
- AC5 (negative): Given the page text, then none of these appear: "guaranteed", "verified listings", "find you an apartment", "AI knows best", "visa" outside the "We don't do" line, any user count, any testimonial.
- AC6 (negative): Given the built page, then it loads no script and makes no third-party request.

## 6. Tests to write
`apps/site/test/landing.test.mjs`: AC1, AC2 (parse the numbers and add them), AC5 (word list), AC6. The axe check for AC4 runs in the existing Playwright project with a `file://` or preview-server target.

## 7. Verification commands
```bash
pnpm --filter @slj/site build && pnpm --filter @slj/site test   # expected: pass
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (screenshots at three widths, both themes)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add a carousel, animation library, video or chat widget: stop.
- You want to add a claim that is not in `11_GO_TO_MARKET.md` §3: stop and ask the founder.

## 10. Rollback / undo note
`git revert` restores the placeholder page.

## 11. Out of scope
Waitlist form (`S-R2-058`); store badges (`S-R3-016`); city guides (`S-R3-009`); translations of the site (PL-21).
