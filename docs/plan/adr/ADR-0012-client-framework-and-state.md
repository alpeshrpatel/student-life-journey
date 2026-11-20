# ADR-0012 — Client framework and state

**TL;DR**
1. The product UI is a Vite 8 + React 19 + TypeScript single-page app in `apps/web`.
2. Routing: React Router 8 in data mode. Server state: TanStack Query 5. Forms: React Hook Form 7 with the Zod resolver.
3. There is no global state library; session, theme and locale use React context.
4. Public marketing and SEO pages are a separate static Astro site, `apps/site`, added in R2.
5. Reversal cost M; runner-up is Next.js with static export.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, Tech Lead hats |
| Supersedes | Next.js 15 App Router client in `legacy/prototype/src/app/**` |
| Related | ADR-0001, ADR-0011, ADR-0013, ADR-0014 |

## Context

The client must build to static files that can be served by the Worker and bundled into Capacitor shells (ADR-0001). Executors are weak models: a framework with two execution modes (server and client) invites code that compiles in one mode and fails in the other. The prototype's screens are already client components that fetch JSON in `useEffect`, with loading and error handling repeated by hand in every page.

## Decision drivers

1. Builds to static files that bundle into shells (weight 3).
2. Weak-model reliability: one mental model (weight 3).
3. Simple testing (weight 2).
4. Ecosystem and longevity (weight 2).
5. SEO for public pages (weight 1).
6. Founder familiarity (weight 1).

## Options

Scores 1–5; maximum weighted total 60.

| Option | Static bundle | Weak-model | Testing | Ecosystem | SEO | Familiarity | Total |
|---|---|---|---|---|---|---|---|
| A. Next.js App Router with a server (do nothing) | 1 | 4 | 3 | 5 | 5 | 5 | 41 |
| B. Next.js with `output: "export"` | 4 | 3 | 3 | 5 | 5 | 5 | 47 |
| **C. Vite + React SPA** | 5 | 5 | 5 | 5 | 1 | 3 | **54** |
| D. React Router framework mode or TanStack Start (SPA + prerender) | 4 | 3 | 4 | 4 | 4 | 2 | 43 |
| E. Expo + React Native Web | 3 | 3 | 3 | 4 | 2 | 2 | 36 |
| F. SvelteKit or SolidStart | 4 | 2 | 4 | 3 | 4 | 1 | 37 |

- **B** is the runner-up: the founder already ships Next.js static exports, and it would host the public pages too. It loses because weak models habitually reach for server actions, route handlers, `cookies()` and middleware, all of which break a static export.
- **C** has no SEO, which is acceptable: the authenticated app should not be indexed, and public pages go to `apps/site`.

## Decision

| Concern | Choice | Runner-up | Rule |
|---|---|---|---|
| Build | Vite 8, `@vitejs/plugin-react` 6 | — | `vite build` → `apps/web/dist` |
| Routing | `react-router` 8, data mode: `createBrowserRouter` from `"react-router"`, `RouterProvider` from `"react-router/dom"` | TanStack Router | Routes declared once in `apps/web/src/app/router.tsx`; the router object is created at module scope. Loaders and actions are not used |
| Server state | `@tanstack/react-query` 5 | SWR | All API reads through `useQuery` hooks in `apps/web/src/lib/queries/*.ts`; all writes through `useMutation` hooks in `apps/web/src/lib/mutations/*.ts`; screens never call `fetch` |
| Forms | `react-hook-form` 7 + `@hookform/resolvers` (Zod) | TanStack Form | Form schemas come from `@slj/contracts` |
| Validation | `zod` 4 | Valibot | Same schemas as the server |
| Client state | React state and context only | Zustand | Adding a state library needs a new ADR |
| Styling and components | ADR-0013 | — | — |
| i18n | ADR-0025 | — | No string literals in JSX |
| Build targets | `VITE_TARGET=web` (default, with service worker from R2) and `VITE_TARGET=native` (no service worker, absolute `VITE_API_BASE_URL`) | — | One codebase, two builds |
| Public site | Astro 7 static site in `apps/site` (R2) | Next.js static export | Content collections with Zod schemas enforce sources and dates on city guides (S-R3-008) |

Screen layout rule: each screen lives in `apps/web/src/screens/<name>/` with `<name>-screen.tsx` (data wiring and states) and presentational parts beside it. A screen is at most 150 lines; larger parts are split.

Dev topology: `vite` on port 5173 proxies `/api` to `wrangler dev` on port 8787, so the browser sees one origin in development too.

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms, ≥ 70% shared? | Yes; the same build runs in browsers, the PWA and Capacitor. |
| (b) Offline? | TanStack Query persistence and paused mutations (ADR-0014). |
| (c) Data shape? | Not applicable. |
| (d) Switch cost in 12 months? | M: screens are thin; hooks and `@slj/api-client` carry over to Next.js or Expo. |
| (e) Weak-model reliability? | Highest of the options: plain React, explicit routes, no server/client split. |
| (f) Free through ~1,000 MAU? | Yes. |

## Consequences

**Good:** fastest build and test loop; no hydration; identical behaviour in every shell.

**Bad:** two front-end toolchains once `apps/site` exists; first paint depends on JavaScript (budget: ≤ 200 kB gzip initial JS, S-R1-091).

**Neutral:** React Router 8 is a new major; `NavLink`, `Navigate` and `useNavigate` are assumed to be exported from `"react-router"` as in v7 (V-11).

## Reversal cost

**M.**

## Flip trigger

Move to Next.js static export if `apps/site` and `apps/web` need to share more than five components beyond tokens, or if maintaining two front-end toolchains costs more than one day a month.

## References

- Spec §4, §5.2.
- https://reactrouter.com/start/data/installation ; `00_PROGRESS_LOG.md` §3.5.
