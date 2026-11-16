# S-R3-011 — Add sitemap and social metadata

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Growth |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R3-009 |
| Blocks | S-R3-016 |
| Executor tier | Tier-1 — one official integration and a few meta tags with exact values |
| Platforms | web |
| Parallel-safe with | every R3 story except S-R3-009 (same layout file) |

## 1. Why
Search engines find pages through a sitemap, and links pasted into chats and forums — our main channels — look trustworthy only with a proper title, description and image (`11_GO_TO_MARKET.md` §5 "Measurement": search impressions and clicks per guide).

## 2. Context pack
- Relevant docs: `docs/plan/11_GO_TO_MARKET.md` §5; `docs/plan/stories/R2/S-R2-056-scaffold-marketing-site.md` (layout props, `robots.txt`, preview `noindex`).
- **Files to read first:** `apps/site/astro.config.mjs`, `apps/site/src/layouts/base.astro`, `apps/site/public/robots.txt`, `apps/site/test/build.test.mjs`.
- **Files to create:** `apps/site/test/seo.test.mjs`.
- **Files to modify:** `apps/site/astro.config.mjs` (`site: PUBLIC_SITE_URL`, integration `@astrojs/sitemap`), `apps/site/package.json`, `apps/site/src/layouts/base.astro`, `docs/runbooks/README.md` (Search Console steps).
- **Files you must NOT touch:** page content.
- Env vars: `PUBLIC_SITE_URL` (existing).

## 3. Design notes
- Sitemap: `@astrojs/sitemap` with default settings produces `sitemap-index.xml` and `sitemap-0.xml` containing every generated page except `/404`. `robots.txt` already points to `sitemap-index.xml`. Preview builds (`PUBLIC_SITE_URL` containing `workers.dev`) skip the integration.
- `base.astro` head, for every page (values from props; exact tag set):

```html
<link rel="canonical" href="{PUBLIC_SITE_URL}{canonicalPath}" />
<meta property="og:type" content="{ogType}" />            <!-- "website" by default, "article" on guides -->
<meta property="og:site_name" content="Student Life Journey" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{PUBLIC_SITE_URL}{canonicalPath}" />
<meta property="og:image" content="{PUBLIC_SITE_URL}/og-default.png" />
<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Student Life Journey — Know what to do next." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#f2f5f4" />
```

  New optional layout props: `ogType`, `noindex` (adds `<meta name="robots" content="noindex">`; used by the 404 page).
- One shared image (`og-default.png` from S-R2-057) for all pages in R3; per-city images are not generated.
- Rules checked by the test for every HTML file in `dist/`: exactly one `<title>` (≤ 60 characters), one meta description (50–160 characters), one canonical link that is absolute and matches the file's path, the Open Graph tags above, `lang` on `<html>`; titles and descriptions are unique across pages.
- App side: the web app at `app.<domain>` must **not** be indexed: confirm that the Worker sends `X-Robots-Tag: noindex` on the SPA HTML (add it in `security-headers.ts` if absent — a one-line change allowed in this story) and that `app.<domain>/robots.txt` disallows all.
- Runbook steps (HUMAN, after deploy): verify the domain property in Google Search Console with a DNS TXT record in Cloudflare; submit `https://<domain>/sitemap-index.xml`; the same in Bing Webmaster Tools (import from Search Console). Record the dates on the board. No tracking script is added — Search Console needs none.

## 4. Steps
1. Integration and `site` setting; layout tags and props.
2. `seo.test.mjs`; app-side `noindex` check.
3. Deploy; validate one guide URL with a link-preview debugger; do the runbook steps.
4. Commit: `feat(site): add sitemap and social metadata (S-R3-011)`.

## 5. Acceptance criteria
- AC1: Given the production build, then `dist/sitemap-index.xml` exists and the sitemap lists `/`, `/cities/` and each published guide with absolute `https://<domain>` URLs.
- AC2: Given every built page, then the SEO test passes (title, description, canonical, Open Graph tags, uniqueness).
- AC3: Given a guide URL pasted into a link-preview tool, then the title, description and image appear.
- AC4 (negative): Given a preview build, then no sitemap is generated and pages carry `noindex`.
- AC5 (negative): Given `https://app.<domain>/`, then the response has `X-Robots-Tag: noindex` and the app pages are absent from the sitemap.
- AC6 (negative): Given the 404 page, then it is not in the sitemap and has `noindex`.

## 6. Tests to write
`apps/site/test/seo.test.mjs`: AC1, AC2, AC4, AC6. API test for the `X-Robots-Tag` header (AC5).

## 7. Verification commands
```bash
pnpm --filter @slj/site build && pnpm --filter @slj/site test   # expected: pass
curl -sI https://app.<domain>/ | grep -i x-robots-tag           # expected: noindex
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add keyword-stuffed text, hidden text, doorway pages or generated pages per keyword: stop.
- You are about to add an analytics or tag-manager script: stop — ADR-0020.

## 10. Rollback / undo note
`git revert`; search engines drop the sitemap on their next fetch.

## 11. Out of scope
Per-page social images; structured data beyond the guide's `Article` block; paid search (`11` §11).
