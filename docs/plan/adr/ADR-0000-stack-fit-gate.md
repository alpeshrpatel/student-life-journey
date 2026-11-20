# ADR-0000 — Stack fit gate

**TL;DR**
1. This page checks the chosen end-to-end stack against eleven capabilities before any story is written.
2. Eight cells are "yes" on documentary evidence; three are "unproven" in our exact combination.
3. Each unproven cell has a time-boxed spike in R0 with a pass/fail criterion and a named fallback.
4. No story after R0 may start on a capability whose spike has not passed or whose fallback has not been adopted.
5. The stack: Vite + React SPA, Capacitor shells, Hono on Cloudflare Workers, D1 (SQLite) with Drizzle, Better Auth, own AI layer.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14); re-evaluated when S-R0-043, S-R0-044 and S-R0-047 report |
| Deciders | Architect, QA hats |
| Related | ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0008, ADR-0009, ADR-0014, ADR-0026 |

## The chosen stack in one line per layer

| Layer | Choice |
|---|---|
| Client | Vite 8 + React 19 SPA (`apps/web`), mobile-first, Tailwind CSS 4 |
| Mobile shell | Capacitor 8 (`apps/mobile`) bundling `apps/web/dist` |
| Desktop | Installable PWA; Tauri 2 only on trigger |
| Backend | Hono 4 on Cloudflare Workers (`apps/api`), REST + Zod contracts |
| Data | Cloudflare D1 (SQLite) + Drizzle ORM; IndexedDB on device |
| Auth | Better Auth 1.7, Google + Apple + magic link, cookie on web, Bearer in shells |
| AI | `packages/ai`: router, workflow agents, tool registry, guardrails; OpenAI-compatible adapter + heuristic provider |

## Gate table

| # | Capability | How the stack delivers it | Verdict | Evidence | Spike / fallback if unproven |
|---|---|---|---|---|---|
| 1 | Web | Static SPA served by the Worker's static assets with SPA fallback | **Yes** | Cloudflare static-assets docs (`not_found_handling: "single-page-application"`) | — |
| 2 | iOS | Capacitor 8 shell with bundled assets, native sign-in and push | **Yes** | Capacitor 8.6.2 is the active major; bundling a Vite build is its default path | Risk of App Store 4.2 handled by native features (ADR-0001) |
| 3 | Android | Same shell | **Yes** | Same | Play closed test of 12 testers for 14 days is a scheduling fact (S-R3-005) |
| 4 | Desktop (Windows, macOS, Linux) | PWA install from Chrome, Edge or Safari; same origin, same code | **Yes** | Standard web platform feature; Firefox cannot install and uses the website | Tauri 2.12 wraps the same build if a trigger fires (ADR-0016) |
| 5 | Offline | Service worker app shell on web; bundled assets in shells; IndexedDB query cache + mutation outbox; on-device calculators from `@slj/domain` | **Yes** | TanStack Query persistence and paused-mutation APIs are documented; calculators are pure TypeScript | iOS can evict WebView storage under pressure: noted as RK-11 |
| 6 | Auth on every platform | Web and desktop PWA: Better Auth cookie session. Native: Google/Apple SDK ID token → Better Auth `idToken` sign-in → Bearer token in secure storage | **Unproven** for native in our combination (Better Auth on Workers + D1 + `bearer()` + `@capgo/capacitor-social-login`) | Each piece is documented; Capgo publishes a Better Auth integration page | **S-R0-044.** Pass: on an Android emulator and an iOS simulator, native Google sign-in returns a session and `GET /api/v1/me` answers 200 with a Bearer token. Fail → adopt Firebase Authentication (ADR-0005 fallback) before R2 |
| 7 | AI streaming responses | `fetch` to the provider with `stream: true`; Worker re-emits Server-Sent Events with Hono `streamSSE` | **Unproven** under the 10 ms CPU cap of Workers Free | Streaming itself is standard; CPU cost of session lookup + SSE parsing + guardrails is unmeasured | **S-R0-043.** Pass: p99 CPU ≤ 8 ms over 100 authenticated streamed replies of about 400 tokens. Fail → upgrade to Workers Paid ($5/month, rung 1) or send non-streamed replies on Free |
| 8 | Push notifications | Web Push (VAPID, `aes128gcm`) sent from the Worker with `@pushforge/builder`; native through `@capacitor/push-notifications` and FCM HTTP v1 | **Unproven** on Workers Free (ES256 signing and payload encryption cost CPU) | Library READMEs state Workers support; not measured by us | **S-R0-047.** Pass: one Web Push delivered from the deployed Worker to Chrome with CPU ≤ 8 ms. Fail → reminders by email and in-app only at rung 0; push enabled at rung 1 |
| 9 | DB sync / migration | Forward-only SQL migrations applied by `wrangler d1 migrations apply`; 7-day Time Travel; documented export; SQLite → Postgres runbook rehearsed in R3 | **Yes** | D1 migration and Time Travel docs | Rehearsal stories S-R2-026 and S-R3-027 |
| 10 | Free-tier hosting | Workers Free + D1 Free + static assets | **Yes** | Limits verified 2026-11-14 (`00_PROGRESS_LOG.md` §3.1); commercial use is not restricted | Ladder in `08_HOSTING_AND_SCALING_LADDER.md` |
| 11 | Weak-model implementability | TypeScript end to end, Zod contracts, pasted signatures in every story, tests on the real runtime | **Yes, with conditions** | Hono, Drizzle, React, Tailwind, Zod and Vitest are mainstream and well documented | Conditions: scaffolding and auth stories are Tier-2/3; boundary lint in CI (S-R0-032); library versions pinned |

## Rules that follow from the gate

1. S-R0-043, S-R0-044 and S-R0-047 are part of the R0 exit criteria (`10_RELEASE_PLAN.md`).
2. If S-R0-044 fails, ADR-0005 is superseded by a Firebase Authentication ADR **before** any R2 identity or mobile story starts. R0 and R1 web stories are unaffected because they depend only on the `SessionResolver` seam.
3. If S-R0-043 fails, the founder chooses between rung 1 ($5/month) and non-streamed replies, records the choice in `docs/BOARD.md`, and S-R1-058 is implemented accordingly (the story contains both variants).
4. If S-R0-047 fails, S-R2-038 and S-R2-052 move behind the rung 1 upgrade.

## Named fallback stack (if Cloudflare as a whole must be left)

Hono on Node 24 in a container (Cloud Run or equivalent) + Turso (libSQL) + the same Drizzle schema + static assets on any static host. Estimated effort 2–5 days (ADR-0009).

## References

- Hard constraint 3.12 of the planning brief.
- `00_PROGRESS_LOG.md` §3 (verified facts).
