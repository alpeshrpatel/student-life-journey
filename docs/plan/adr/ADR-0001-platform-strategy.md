# ADR-0001 — Platform strategy

**TL;DR**
1. One mobile-first React single-page app is the only product UI.
2. It ships as a website and installable PWA first, then inside Capacitor shells for iOS and Android.
3. Desktop is the same PWA installed from Chrome, Edge or Safari; a Tauri wrapper is built only on a trigger.
4. Fallback: rewrite `apps/web` in Expo/React Native; the API, domain and contracts packages are untouched.
5. Reversal cost M. The riskiest piece (native Google sign-in inside the shell) is proven by spike S-R0-044 before any shell story runs.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, CEO, Tech Lead hats |
| Supersedes | Spec §24 ("Native mobile applications" out of scope) for delivery method only |
| Related | ADR-0012 (client stack), ADR-0014 (offline), ADR-0015 (mobile shell), ADR-0016 (desktop shell) |

## Context

Hard constraint 1 requires one product on web, iOS, Android and desktop (Windows, macOS, Linux) for a team of one to three people, starting at $0. The prototype is a Next.js 15 server-rendered app whose pages are already client components calling `/api/*` (for example `legacy/prototype/src/app/(main)/dashboard/page.tsx` after S-R0-001), so its UI is SPA-shaped in practice. The supplied Tide design has two frames built from one component: mobile 390 px with bottom tabs and desktop 1280 px with a sidebar. The product is forms, lists, a checklist and a chat; it has no camera, maps rendering, background location or heavy animation in the MVP.

## Decision drivers

1. Shared code across web, iOS, Android and desktop (weight 3).
2. Effort for a one-to-three person team with AI executors (weight 3).
3. Weak-model implementability: documentation quality, type safety, familiarity (weight 3).
4. Reach: store presence and push notifications on iOS and Android (weight 3).
5. Offline capability on arrival day (weight 2).
6. Stays at $0 until stores are actually needed (weight 2).
7. Reversal cost (weight 1).

## Options

Scores are 1–5 per driver; the maximum weighted total is 85.

| Option | Shared code | Effort | Weak-model | Reach | Offline | $0 | Reversal | Total |
|---|---|---|---|---|---|---|---|---|
| A. Responsive web only, keep Next.js SSR (do nothing) | 5 | 5 | 4 | 1 | 1 | 5 | 5 | 62 |
| B. SPA + installable PWA only | 5 | 5 | 5 | 2 | 3 | 5 | 5 | 72 |
| **C. SPA + PWA + Capacitor shells, desktop by PWA** | 5 | 4 | 4 | 5 | 4 | 4 | 4 | **74** |
| D. Expo / React Native + React Native Web | 4 | 3 | 3 | 5 | 4 | 4 | 3 | 64 |
| E. Flutter (mobile, web, desktop) | 4 | 2 | 3 | 5 | 4 | 4 | 2 | 60 |
| F. Tauri 2 for desktop and mobile | 5 | 3 | 2 | 3 | 4 | 4 | 3 | 58 |
| G. Kotlin Multiplatform or fully native per platform | 1 | 1 | 2 | 5 | 5 | 3 | 1 | 44 |

Notes on the options not chosen:

- **A** cannot be installed, has no offline story and cannot be bundled into a shell because it needs a server to render.
- **B** is phase one of C. On its own it has no store listing, and iOS Web Push needs a Home Screen install on iOS 16.4+ (webkit.org, 2023-02-16).
- **D** gives native UI, but React Native Web output is a poor fit for the public content pages, styling needs a second system (NativeWind), and weak models mix web and native idioms. It remains the fallback because it reuses `@slj/domain`, `@slj/contracts` and `@slj/api-client` unchanged.
- **E** abandons TypeScript, so contracts and the deterministic calculators could no longer be shared with the server.
- **F** would be one shell technology for five targets, but Tauri mobile is younger than Capacitor, its push and social sign-in plugins are thinner, and it adds a Rust toolchain. Tauri 2 remains the desktop fallback only.
- **Electron** was considered for desktop and rejected: about 100 MB per install and separate signing for the same result a PWA gives for free.
- **G** multiplies every screen by three or four.

## Decision

Build **one React SPA (`apps/web`)** and ship it three ways:

| Phase | Platform shipped | How |
|---|---|---|
| R0 | Web (responsive) in production | Static assets served by the API Worker (ADR-0009) |
| R1 | Web, mobile-first and desktop layouts | Same build |
| R2 | Installable PWA on desktop (Windows, macOS, Linux) and Android; Home Screen web app on iOS. iOS and Android Capacitor builds to internal testers (TestFlight, Play Internal Testing) | `vite-plugin-pwa`; `apps/mobile` wraps `apps/web/dist` |
| R3 | Public App Store and Google Play release | Same shells, store review |
| Trigger only | Tauri 2 desktop shell (S-R4-009) | Wraps the same `dist` |

The Capacitor shells bundle the built assets (no remote URL loading) and add native capabilities that take the app beyond a repackaged website, as App Store guideline 4.2 requires: native Google and Apple sign-in, push notifications, secure token storage, deep links, and offline access to the plan and checklist.

## Fitness questions

| Question | Answer |
|---|---|
| (a) iOS, Android, desktop, web with ≥ 70% shared code? | Yes. Roughly 95% of client code is shared; the native delta is `apps/mobile` configuration plus four small platform adapters (auth, storage, push, links). |
| (b) Offline and safe sync? | Yes. The shell bundles the app; data comes from the persisted query cache and a mutation outbox (ADR-0014). |
| (c) Data shape fit? | Not applicable to this layer; see ADR-0003. |
| (d) Switch cost in 12 months? | M. Client rewrite only: about 4–6 weeks for the screens in R1–R2. |
| (e) Weak-model reliability? | Yes. It is a plain Vite + React web app; shell stories are Tier-3 or HUMAN. |
| (f) Free through ~1,000 MAU? | Yes for web and PWA. Stores cost 99 USD per year (Apple) and US$25 once (Google) from R2. |

## Consequences

**Good**
- One UI codebase, one design system, one test suite.
- The deterministic calculators in `@slj/domain` run on-device, so housing math works with no network.
- Desktop needs no code signing or notarisation.

**Bad**
- WebView UI is not native UI: gestures, keyboard handling and scroll physics need care (S-R2-049).
- App Store review risk under guideline 4.2 until native features are in place.
- Firefox on desktop cannot install PWAs; those users use the website in a tab.

**Neutral**
- The authenticated app is not indexed by search engines. Public and SEO pages live in a separate static site, `apps/site` (ADR-0012).

## Reversal cost

**M.** Replace `apps/web` and `apps/mobile` with an Expo app. `apps/api`, `packages/domain`, `packages/contracts`, `packages/ai` and `packages/api-client` are unaffected because the contract is REST plus shared Zod schemas (ADR-0011).

## Flip triggers

Flip to option D (Expo) if any one of these happens:

1. Apple rejects the app under guideline 4.2 twice after S-R2-046, S-R2-047 and S-R2-051 are shipped.
2. In the S-R2-062 readiness review, p75 tap-to-response exceeds 200 ms or list scrolling drops below 50 fps on a mid-range Android phone (reference device: Pixel 6a class).
3. More than 25% of the next two quarters' roadmap needs native-only APIs (home-screen widgets, background location, live activities).

Build the Tauri shell (S-R4-009) if desktop is ≥ 15% of weekly sessions for four consecutive weeks **and** at least 10 users ask for a store-distributed or tray-resident desktop app.

## References

- Spec §24; vision §51 ("Do Not Build Yet").
- `00_PROGRESS_LOG.md` §3.2 (Capacitor 8.6.2, App Store 4.2 and 4.8, iOS Web Push, Tauri 2.12).
- Design artifact "Student Life Journey mobile app design" (mobile 390 and desktop 1280 frames).
