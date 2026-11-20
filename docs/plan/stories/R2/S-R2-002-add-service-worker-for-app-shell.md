# S-R2-002 — Add service worker for app shell

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Offline and Install |
| Type | feature |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R2-001 |
| Blocks | S-R2-008, S-R2-038, S-R3-037 |
| Executor tier | Tier-2 — caching rules that must never serve stale API data or a broken shell |
| Platforms | web, desktop |
| Parallel-safe with | S-R2-003, S-R2-009 to S-R2-013, S-R2-018, S-R2-022 |

## 1. Why
On arrival day the mover may have no connection. The app must still open (ADR-0014). The service worker caches the application shell; data offline is the next stories' job.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0014-offline-and-sync-strategy.md` (table "What works offline", rules); `docs/plan/03_ARCHITECTURE.md` §14 (caching table); `docs/plan/07_UX_DESIGN_SYSTEM.md` §2.10 ("Update available" bar).
- External docs: https://vite-pwa-org.netlify.app/guide/ (plugin options `injectManifest` vs `generateSW`, `registerType`).
- **Files to read first:** `apps/web/vite.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/app/app-shell.tsx`, `apps/api/src/http/middleware/security.ts` (CSP `worker-src`).
- **Files to create:** `apps/web/src/platform/service-worker.ts` (registration and update hook), `apps/web/src/app/update-bar.tsx`, `apps/web/src/app/update-bar.test.tsx`, `apps/web/e2e/offline.spec.ts`.
- **Files to modify:** `apps/web/vite.config.ts` (add `vite-plugin-pwa`), `apps/web/package.json` (devDependency `vite-plugin-pwa` at its current major; `workbox-window`), `apps/web/src/main.tsx`, `apps/web/src/app/app-shell.tsx` (render `<UpdateBar />`), `apps/web/src/i18n/locales/en/common.json`, `apps/api/src/http/middleware/security.ts` (ensure `worker-src 'self'`; `Service-Worker-Allowed` not needed for root scope), `apps/web/public/_headers` or the asset config (`/sw.js` → `Cache-Control: no-cache`).
- **Files you must NOT touch:** API routes.
- Env vars: `VITE_TARGET` (the service worker is **not** registered when `VITE_TARGET=native`; shells bundle their assets).

## 3. Design notes
- Plugin configuration: `strategies: "generateSW"`, `registerType: "prompt"`, `manifest: false` (the manifest file from S-R2-001 is used as is), `workbox`:
  - `globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"]` (precache the shell, fonts and icons);
  - `navigateFallback: "/index.html"`, `navigateFallbackDenylist: [/^\/api\//]`;
  - `runtimeCaching: []` — **no runtime caching of `/api/*`**. API data offline comes only from the persisted query cache (S-R2-003), so that sign-out can clear it and no response is ever served to the wrong user;
  - `cleanupOutdatedCaches: true`, `clientsClaim: false`, `skipWaiting: false` (a new version activates only when the user accepts, to avoid swapping code under an open form).
- `service-worker.ts`: `export function registerAppServiceWorker(onNeedRefresh: () => void): { update(): Promise<void> }` using `workbox-window`'s `Workbox` class (or the plugin's `virtual:pwa-register`); check for an update on load and every 60 minutes while the tab is visible.
- `UpdateBar`: a non-modal bar above the bottom tabs: "A new version is ready." + `Button` "Reload" (calls `messageSkipWaiting()` then reloads) + dismiss; `role="status"`.
- API requests: unchanged — `fetch` goes to the network; when offline they fail and TanStack Query handles the state.
- Registration happens after `window.load` to keep first paint fast; only when `import.meta.env.PROD` and the target is not native.
- E2E (`offline.spec.ts`, Chromium only): load the app signed in → wait for `navigator.serviceWorker.ready` → `context.setOffline(true)` → reload → the app shell renders (the heading or the offline state is visible, not the browser error page).
- Edge cases: first visit offline (nothing cached) → browser error is acceptable; a deploy while the tab is open → the bar appears at the next check; private windows without service worker support → the app works as before.

## 4. Steps
1. Plugin configuration; build → `dist/sw.js` and the precache manifest exist.
2. Registration module and update bar with a unit test (mock the registration).
3. Headers for `sw.js`; CSP check.
4. E2E offline reload test (runs against the production build served by the Worker: add a Playwright project or reuse `pnpm build` + `wrangler dev`).
5. Commit: `feat(web): add service worker for app shell (S-R2-002)`.

## 5. Acceptance criteria
- AC1: Given the production build, then `sw.js` is served with `Cache-Control: no-cache` and precaches `index.html`, the entry script and the fonts.
- AC2: Given a visited app and the network switched off, when the page is reloaded, then the app shell renders.
- AC3: Given a new deployment, when the update check runs, then the "A new version is ready." bar appears and "Reload" loads the new version.
- AC4 (negative): Given the generated service worker, then it contains no runtime caching route for `/api/`.
- AC5 (negative): Given `VITE_TARGET=native`, then no service worker is registered.
- AC6: Given Chrome's Application panel, then the app is reported as installable.

## 6. Tests to write
`update-bar.test.tsx`: bar appears on the callback; Reload triggers the update function. `e2e/offline.spec.ts`: AC2. Build-output test (Node script or Vitest): AC4.

## 7. Verification commands
```bash
pnpm build && grep -c "/api/" apps/web/dist/sw.js    # expected: only the navigateFallback denylist reference
pnpm e2e                                              # expected: offline spec passes
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `vite-plugin-pwa` does not support the installed Vite major: stop and report the peer range; the fallback is a hand-written 40-line service worker with a build-time file list — a decision for the founder, not a silent switch.
- The bundle budget (`pnpm size`) fails because of `workbox-window`: load the registration module lazily.

## 10. Rollback / undo note
`git revert` **and** ship a self-unregistering `sw.js` for one release (a service worker cannot be removed by deleting the file): `self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", async () => { await self.registration.unregister(); (await self.clients.matchAll()).forEach((c) => c.navigate(c.url)); });`.

## 11. Out of scope
Data offline (`S-R2-003`, `S-R2-004`); push handlers (`S-R2-038`); background sync API (not used — replay happens when the app is open).
