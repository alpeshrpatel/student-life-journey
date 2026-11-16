# S-R2-056 — Scaffold marketing site

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Growth |
| Type | infra |
| Size | M (≤half day) |
| Priority | P1 |
| Depends on | S-R2-029 |
| Blocks | S-R2-057, S-R2-058, S-R3-008 |
| Executor tier | Tier-2 — a standard static-site scaffold with given structure and deploy target |
| Platforms | web |
| Parallel-safe with | S-R2-009 to S-R2-028, S-R2-030 to S-R2-055, S-R2-059, S-R2-060 |

## 1. Why
The app at `app.<domain>` is behind sign-in and invisible to search engines. The apex domain needs a fast static site for the landing page, the waitlist and, in R3, city guides (`11_GO_TO_MARKET.md` §3; `03_ARCHITECTURE.md` §2: `apps/site`, Astro 7, static assets on the apex domain).

## 2. Context pack
- Relevant docs: `docs/plan/03_ARCHITECTURE.md` §2 (deployable units); `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` (`apps/site` in the tree); `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (Tide tokens); `docs/plan/adr/ADR-0020-analytics-and-privacy.md` (no third-party trackers); `docs/plan/08_HOSTING_AND_SCALING_LADDER.md` (Workers static assets are free and unmetered).
- **Files to read first:** `apps/web/src/styles/tokens.css`, `apps/api/wrangler.jsonc` (naming and environment pattern), `.github/workflows/deploy.yml`, `pnpm-workspace.yaml`, `scripts/check-size.mjs`.
- **Files to create:** `apps/site/package.json` (`@slj/site`), `apps/site/astro.config.mjs`, `apps/site/tsconfig.json`, `apps/site/wrangler.jsonc`, `apps/site/src/layouts/base.astro`, `apps/site/src/pages/index.astro` (placeholder), `apps/site/src/pages/404.astro`, `apps/site/src/styles/site.css` (imports the shared tokens), `apps/site/public/robots.txt`, `apps/site/public/favicon.svg`, `apps/site/public/_headers`, `packages/ui-tokens/package.json` and `packages/ui-tokens/tokens.css` (the token file moved here so both apps import one source), `apps/site/test/build.test.mjs`.
- **Files to modify:** `apps/web/src/styles/tokens.css` (becomes `@import "@slj/ui-tokens/tokens.css";`), `apps/web/scripts/check-contrast.mjs` and `apps/web/src/styles/tokens.test.ts` (read the token file from its new path), `.github/workflows/ci.yml` (build the site), `.github/workflows/deploy.yml` (deploy job `site`), `docs/runbooks/deploy-and-rollback.md`, `eslint.config.js` (Astro files).
- **Files you must NOT touch:** `apps/api/**`.
- Env vars: build-time `PUBLIC_APP_URL` (`https://app.<domain>`), `PUBLIC_SITE_URL` (`https://<domain>`).

## 3. Design notes
- Astro 7, `output: "static"`, **no** client framework integration (no React on the site): pages ship zero JavaScript unless a page adds a small inline module (the waitlist form in S-R2-058 is the only one in R2).
- Deploy target: a second Worker with static assets only — `apps/site/wrangler.jsonc`: `name: "slj-site"`, `assets: { directory: "./dist", not_found_handling: "404-page" }`, environments `preview` (workers.dev host) and `production` (custom domain `<domain>` and `www.<domain>` → redirect to the apex with a redirect rule set in the dashboard; note in the runbook). No Worker script, so no CPU limits apply.
- Layout `base.astro` props: `title`, `description`, `canonicalPath`, optional `noindex`. It renders: `<html lang="en">`, charset, viewport, title, description, canonical link from `PUBLIC_SITE_URL`, the token CSS, a skip link, a header (wordmark linking to `/`, link "Open the app" → `PUBLIC_APP_URL`), `<main id="main">`, a footer (links: Privacy and Terms → `PUBLIC_APP_URL/privacy` and `/terms`; contact email `support@<domain>`; the sentence "Not affiliated with any university, landlord or government.").
- Styling: plain CSS using the Tide custom properties; system font stack as in the app; max content width 68 ch for text, 1120 px for sections; dark theme through `prefers-color-scheme` using the dark tokens. No Tailwind on the site (keeps the build trivial).
- `_headers` (applies to all paths): the same security headers as the app (S-R0-035) with a stricter CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://app.<domain>; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://app.<domain>`.
- No analytics script, no cookies, no fonts from third parties. Page views can be read from Cloudflare's built-in Web Analytics for the zone **only if** it is cookieless and enabled in the dashboard — a founder decision recorded on the board, not code.
- `robots.txt`: allow all; `Sitemap: https://<domain>/sitemap-index.xml` (the sitemap itself arrives in S-R3-011). Preview deployments send `X-Robots-Tag: noindex` (set in the preview environment's `_headers` variant produced by the build when `PUBLIC_SITE_URL` contains `workers.dev`).
- Budget: each page ≤ 60 KB transferred excluding images; checked by `apps/site/test/build.test.mjs` (builds, then asserts `dist/index.html` exists, contains exactly one `<h1>`, has a canonical link, and that the summed size of HTML + CSS + JS for `/` is under the budget).
- Moving the tokens: `packages/ui-tokens` contains only CSS and a `package.json` with `exports`; `apps/web` behaviour must be byte-identical (run the visual and contrast checks).

## 4. Steps
1. `packages/ui-tokens`; switch `apps/web` to it; run the web checks.
2. Scaffold `apps/site` with the layout, placeholder index ("Coming soon" with the tagline) and 404.
3. Wrangler config; CI build; deploy job (preview on pull requests, production on `main` after the API job).
4. Deploy to preview; then attach the apex domain in production (dashboard step, HUMAN — list it in the PR).
5. Commit: `chore(site): scaffold marketing site (S-R2-056)`.

## 5. Acceptance criteria
- AC1: Given `pnpm --filter @slj/site build`, then `dist/index.html` and `dist/404.html` exist and the build test passes.
- AC2: Given the preview URL, then `/` returns 200 with the security headers and `X-Robots-Tag: noindex`; an unknown path returns 404 with the 404 page.
- AC3: Given production, then `https://<domain>/` serves the site and `https://www.<domain>/` redirects to it with 301.
- AC4: Given `apps/web` after the token move, then `pnpm --filter @slj/web build`, the contrast check and the Playwright suite pass unchanged.
- AC5 (negative): Given the built site, then no request goes to a third-party host and no cookie is set (checked in the build test by scanning for `http` URLs outside the two allowed hosts).
- AC6 (negative): Given the site bundle, then it contains no React runtime (`grep -r "react" apps/site/dist` finds nothing).

## 6. Tests to write
`apps/site/test/build.test.mjs`: AC1, AC5, AC6 and the size budget.

## 7. Verification commands
```bash
pnpm --filter @slj/site build && pnpm --filter @slj/site test   # expected: pass
pnpm --filter @slj/web build && pnpm --filter @slj/web contrast && pnpm size   # expected: unchanged
pnpm typecheck && pnpm lint                                     # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (deploy runbook: site job, apex domain)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to add React, Tailwind, a CMS or an image CDN to the site: stop — static Astro and CSS only.
- Astro 7 is not the current major on npm: use the current stable major, record the version in the PR and on the board.

## 10. Rollback / undo note
`git revert`; remove the custom domain from the `slj-site` Worker. The app is unaffected.

## 11. Out of scope
Landing page content (`S-R2-057`); waitlist (`S-R2-058`); city guides (`S-R3-008` to `S-R3-010`); sitemap and social cards (`S-R3-011`).
