# S-R2-001 — Add web app manifest and icons

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R1-095 |
| Blocks | S-R2-002, S-R2-006 |
| Executor tier | Tier-1 — static files and meta tags |
| Platforms | web, desktop |
| Parallel-safe with | S-R2-003, S-R2-009, S-R2-012, S-R2-018, S-R2-022, S-R2-028 |

## 1. Why
An installable app needs a manifest and icons. Desktop is "the installed PWA" (ADR-0016), so this is also the first step of the desktop platform.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0001-platform-strategy.md`; `docs/plan/adr/ADR-0016-desktop-shell.md`; `docs/plan/07_UX_DESIGN_SYSTEM.md` §5 (tokens: ground `#f2f5f4`, accent `#226a66`), §10 (icons).
- **Files to read first:** `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/public/`.
- **Files to create:** `apps/web/public/manifest.webmanifest`, `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon-180.png`, `favicon.svg`, `apps/web/scripts/make-icons.mjs`, `apps/web/src/test/manifest.test.ts`.
- **Files to modify:** `apps/web/index.html` (link the manifest and icons; `theme-color` for light and dark), `apps/web/package.json` (devDependency `sharp`; script `"icons": "node scripts/make-icons.mjs"`).
- **Files you must NOT touch:** the service worker (next story).
- Env vars: none.

## 3. Design notes
- Icon source: `apps/web/public/icons/source.svg` — a simple mark in the Tide style: a 512 square with `ground` background and a solid `accent` square tile carrying the lower-case letters "sl" in Archivo 800, flush left (no gradients, 0 radius; the OS applies its own mask). The maskable variant keeps all content inside the central 80% safe zone on a full-bleed `accent` background with `ground` letters.
- `make-icons.mjs` renders the PNG sizes from the SVG with `sharp`; generated PNGs are committed (builds must not need `sharp`).
- Manifest (exact keys): `name` "Student Life Journey", `short_name` "SLJ", `description` "Plan your move: arrival, housing costs, first week.", `id` "/", `start_url` "/dashboard?source=pwa", `scope` "/", `display` "standalone", `orientation` "portrait-primary", `background_color` "#f2f5f4", `theme_color` "#226a66", `lang` "en", `dir` "ltr", `categories` ["lifestyle", "productivity"], `icons` (192, 512 `any`; 512 `maskable`), `shortcuts`: Tasks (`/tasks`), Housing (`/housing`), Chat (`/concierge`).
- `index.html`: `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`, `<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">`, `<meta name="theme-color" content="#f2f5f4" media="(prefers-color-scheme: light)">` and a dark one (`#131c1b` or the dark ground token once S-R2-012 lands), `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="SLJ">`. Remove any `maximum-scale` from the viewport meta (defect D-17).
- The Worker must serve `.webmanifest` with `Content-Type: application/manifest+json` (check the assets handler; add a header rule in `apps/web/public/_headers` if the default differs).
- The product name comes from ADR-0027's decision; if the founder has chosen a different public name on the board, use it here and nowhere hard-code it elsewhere (read from the i18n `common:app.name` key in the app).

## 4. Steps
1. Source SVG and generator script → PNGs.
2. Manifest and head tags.
3. Unit test that parses the manifest and checks the keys and that every icon file exists.
4. `pnpm build` → open Chrome DevTools → Application → Manifest: no errors or warnings.
5. Commit: `feat(web): add web app manifest and icons (S-R2-001)`.

## 5. Acceptance criteria
- AC1: Given the built app, when the manifest is fetched, then it is valid JSON with the keys above and status 200 with a manifest content type.
- AC2: Given Chrome's Application panel, then "Installability" shows only the missing service worker (fixed by S-R2-002) and no icon or manifest warning.
- AC3 (negative): Given `index.html`, then the viewport meta contains no `maximum-scale` and no `user-scalable=no`.
- AC4: Given each icon path in the manifest, then the file exists with the stated pixel size.

## 6. Tests to write
`apps/web/src/test/manifest.test.ts`: AC1 (file-level), AC3, AC4 (read PNG headers for dimensions).

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm build   # expected: pass
curl -sI http://localhost:8787/manifest.webmanifest | grep -i content-type   # expected: application/manifest+json (with pnpm dev running)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `sharp` cannot be installed on the executor's machine: draw the PNGs with any tool at the exact sizes and commit them; keep the script for later.

## 10. Rollback / undo note
`git revert`.

## 11. Out of scope
Service worker (`S-R2-002`); install prompt (`S-R2-006`); store icons and splash screens (`S-R2-049`).
