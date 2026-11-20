# S-R0-016 — Scaffold web app with Vite

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Design System |
| Type | infra |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-003 |
| Blocks | S-R0-017, S-R0-020, S-R0-021, S-R0-031 |
| Executor tier | Tier-2 — new toolchain versions (Vite 8, React Router 8, Tailwind 4) |
| Platforms | web |
| Parallel-safe with | S-R0-007 to S-R0-015 |

## 1. Why
The product UI is a static single-page app that the Worker serves and the shells bundle. This story creates it with routing, data-fetching and test tooling in place.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0012-client-framework-and-state.md`; `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §1.
- **Files to read first:** `apps/api/wrangler.jsonc`, `apps/api/package.json`.
- **Files to create:** `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/vite-env.d.ts`, `apps/web/src/app/router.tsx`, `apps/web/src/app/providers.tsx`, `apps/web/src/app/placeholder-screen.tsx`, `apps/web/src/test/setup.ts`, `apps/web/src/app/router.test.tsx`, `apps/api/scripts/ensure-assets-dir.mjs`.
- **Files to modify:** `apps/api/wrangler.jsonc` (assets block), `apps/api/package.json` (`predev`, `pretest`, `prebuild` run the ensure script).
- **Files you must NOT touch:** `apps/api/src/**`, `packages/**`.
- Env vars: `VITE_APP_VERSION`, `VITE_TARGET` (default `web`).

## 3. Design notes
- Dependencies: `react@^19.3.1`, `react-dom`, `react-router@^8.5.1`, `@tanstack/react-query@^5.107.1`; dev: `vite@^8.3.8`, `@vitejs/plugin-react@^6.3.0`, `tailwindcss@^4.3.5`, `@tailwindcss/vite@^4.3.5`, `vitest@^4.1.12`, `jsdom`, `@testing-library/react@^16.3.3`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- Scripts: `dev: "vite"`, `build: "tsc --noEmit && vite build"`, `typecheck`, `test: "vitest run"`.
- `vite.config.ts`: plugins `react()` and `tailwindcss()`; `server: { port: 5173, proxy: { "/api": "http://localhost:8787" } }`; `build.outDir: "dist"`.
- Router (verified import paths, 2026-11-14):

```tsx
// src/app/router.tsx
import { createBrowserRouter } from "react-router";
export const router = createBrowserRouter([
  { path: "/", element: <PlaceholderScreen titleKey="home" /> },
  { path: "*", element: <PlaceholderScreen titleKey="notFound" /> },
]);
// src/main.tsx
import { RouterProvider } from "react-router/dom";
createRoot(document.getElementById("root")!).render(<Providers><RouterProvider router={router} /></Providers>);
```

- `providers.tsx`: `QueryClientProvider` with `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })`.
- `index.html`: `<html lang="en">`, viewport `width=device-width, initial-scale=1` (no `maximum-scale`, fixing defect D-17), `<div id="root">`.
- `apps/api/wrangler.jsonc` addition (keys verified): `"assets": { "directory": "../web/dist", "binding": "ASSETS", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] }`.
- `ensure-assets-dir.mjs`: if `../web/dist/index.html` is missing, create the folder and a stub `index.html` containing `<!doctype html><title>build apps/web first</title>`. This keeps `wrangler dev` and API tests working before the web app is built.
- Placeholder text is temporary English passed as a prop; real strings arrive with i18n (S-R0-020). Add an `eslint-disable-next-line react/jsx-no-literals -- S-R0-020` only where unavoidable.
- Edge cases: deep link refresh (`/anything`) must return the SPA in `wrangler dev`; `/api/*` must reach the Worker, not the SPA.

## 4. Steps
1. Create the package and config files; `pnpm install`.
2. Implement `main.tsx`, router, providers, placeholder → `pnpm --filter @slj/web dev` serves a page at `http://localhost:5173`.
3. Add the assets block and the ensure script → `pnpm --filter @slj/web build && pnpm --filter @slj/api dev`, then `curl -s localhost:8787/some/deep/link | grep -c '<div id="root">'` prints `1` and `curl -s localhost:8787/api/v1/health` returns JSON.
4. Write the router test → `pnpm --filter @slj/web test` passes.
5. `pnpm typecheck && pnpm lint && pnpm --filter @slj/api test` → all pass.
6. Commit: `feat(web): scaffold web app with Vite (S-R0-016)`.

## 5. Acceptance criteria
- AC1: Given `pnpm dev`, when opening `http://localhost:5173/`, then the placeholder renders and `/api/v1/health` is reachable through the proxy.
- AC2: Given a built web app, when the Worker serves `/any/path`, then it returns `index.html`; `/api/v1/health` still returns JSON.
- AC3 (negative): Given an unknown client route, when rendered in a test, then the not-found placeholder is shown.
- AC4: Given `apps/web/dist` does not exist, when running `pnpm --filter @slj/api test`, then tests still pass.

## 6. Tests to write
`apps/web/src/app/router.test.tsx`: renders `/` and an unknown path with `createMemoryRouter`.

## 7. Verification commands
```bash
pnpm --filter @slj/web test && pnpm --filter @slj/web build   # expected: pass, dist/index.html exists
pnpm typecheck && pnpm lint && pnpm test                      # expected: pass
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `react-router` 8 does not export `createBrowserRouter` from `"react-router"` or `RouterProvider` from `"react-router/dom"`: stop and report (V-11).
- `run_worker_first` as an array is rejected by the installed Wrangler: stop and report.

## 10. Rollback / undo note
Delete `apps/web`; revert the two `apps/api` files.

## 11. Out of scope
Tokens (`S-R0-017`), components, i18n, session handling, service worker (R2).
