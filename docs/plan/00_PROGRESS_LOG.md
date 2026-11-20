# 00 — Progress Log

**TL;DR**
1. This is the running log of the planning package under `docs/plan/` (process rule R10).
2. Section 1 lists every deliverable with its status and open assumptions.
3. Section 2 is the locked decision digest; the ADRs are the long form and win on any conflict.
4. Section 3 is the ledger of externally verified facts (`verified-on: 2026-11-14`) with source URLs.
5. Section 4 is the planned story manifest. `12_BACKLOG_INDEX.md` is generated from the story files and is authoritative once it exists.

**Execution mode:** `PLAN_ONLY`. Only `docs/plan/**` and `docs/BOARD.md` are written by the planner. Every other repo change is a story.

**How to resume if this run stops:** read Section 0 only. It names the next file and the cheapest way to continue. Section 2 and Section 4 hold everything needed to stay consistent.

---

## 0. Resume checkpoint (read this first; updated after every batch)

| Item | State |
|---|---|
| Checkpoint written | 2026-11-15 |
| Story files on disk | R0 47/47 · R1 95/95 · R2 62/62 · R3 32/40 · R4 0/9 (236 of 253) |
| Last story written | `stories/R3/S-R3-032-translate-app-to-simplified-chinese.md` |
| **Next story to write** | **S-R3-033** (then manifest order: R3 → R4) |
| After the stories | `12_BACKLOG_INDEX.md` → Section 9 checklist → `99_FINAL_REPORT.md` → `docs/BOARD.md` → final chat message |

**Cheap resume procedure (do exactly this, nothing more):**
1. Confirm counts: `for r in R0 R1 R2 R3 R4; do ls docs/plan/stories/$r | wc -l; done`.
2. Read this Section 0, then only the manifest rows in Section 4 for the IDs still missing. Do not re-read finished stories, the ADRs or the session transcript.
3. Read one finished story as the format sample: `stories/R2/S-R2-039-add-notification-preferences.md` (89 lines).
4. Write about eight story files per message, in manifest order. After each batch, update the table above (counts, last, next).
5. Open an ADR only when a story needs an exact value from it (grep for the value; do not read the whole file).

**Story format (fixed):** title `# S-Rn-NNN — Title`; `**Status:** TODO` line with the HTML comment; field table (Release, Epic, Type, Size, Priority, Depends on, Blocks, Executor tier, Platforms, Parallel-safe with); sections 1 Why · 2 Context pack · 3 Design notes · 4 Steps · 5 Acceptance criteria (Given/When/Then, at least one negative) · 6 Tests to write · 7 Verification commands · 8 Definition of Done checklist (five fixed boxes) · 9 Stop conditions · 10 Rollback / undo note · 11 Out of scope. File name `S-Rn-NNN-kebab-title.md`. Commit line `type(scope): title (S-Rn-NNN)`. Sizes: XS ≤30 min, S ≤2 h, M ≤half day.

**Facts the remaining stories rely on (so nothing has to be re-read):**
- Bundle ID `app.studentlifejourney`; Capacitor 8 in `apps/mobile` (`webDir: "../web/dist"`), built with `pnpm --filter @slj/web build:native` (`VITE_TARGET=native`, `VITE_API_BASE_URL=https://app.<domain>`) then `npx cap sync`. The web app and the API share one origin, `https://app.<domain>` (the `workers.dev` host before S-R2-029). The marketing site is `apps/site` (Astro 7, static) on the apex `https://<domain>`.
- Shell origins: `capacitor://localhost` (iOS), `https://localhost` (Android). Minimum OS: iOS 16, Android 8 (API 26). Plugins: `@capgo/capacitor-social-login` 8.7, `@aparajita/capacitor-secure-storage` 8, `@capacitor/push-notifications` 8, `@capacitor/app`, `@sentry/capacitor`.
- Sessions: opaque database sessions from Better Auth 1.7; cookie on web, `Authorization: Bearer` in shells via the `bearer()` plugin and the `set-auth-token` response header (ADR-0006); Google from R0, magic link S-R2-032, Apple S-R2-047.
- Web code reaches device features only through `apps/web/src/platform/{auth,storage,push,links}.ts` (one interface each, `web` and `native` implementations selected by `Capacitor.isNativePlatform()`); screens never import Capacitor.
- Notifications: `NotificationChannel { kind; enabledFor(userId); deliver(userId, payload) }` in a `ChannelRegistry`; table `push_subscription` (`kind` `webpush` | `fcm`); `POST /api/v1/push/subscriptions`; flags `pushEnabled`, `remindersEnabled`; fixed catalogue text only.
- Email: `EmailSender` port with `renderEmail`, Resend adapter, 90 emails/day global cap, tags; unsubscribe token signed with `UNSUBSCRIBE_SECRET`.
- Budgets: `usage_counter` + `BudgetService.consume/enforce`; AI tiers `AI_CHEAP_CHAIN` / `AI_STRONG_CHAIN`; `ai_call` table records cost; evals live in `packages/ai/evals/` and run with `pnpm evals` (live runs: `pnpm evals:live`, S-R3-024).
- Flags: one `FLAGS` JSON variable parsed in `apps/api/src/config/flags.ts`, served by `GET /api/v1/config`, read on web with `useConfig()` (safe default: everything false except `signupsOpen`).
- Analytics: first-party pipeline `POST /api/v1/events` → PostHog EU with HMAC-hashed IDs; consent via `analyticsAllowed`.
- Free-plan limits every backend story respects: 10 ms CPU per request, 50 database calls per invocation, batch-only transactions (`uow.commit()` → D1 `batch()`), ≤100 bound parameters per statement.
- Never-do list: no invented listings, prices or availability; no claim that an external action happened; no passwords or card numbers stored; no raw LLM output past Zod validation.

**Session notes**
- 2026-11-15: resumed at S-R2-041. Section 1 rows for files 11, 13, 14, 15 and the story batches added below.
- 2026-11-15 (later): executor hand-over built (`EXECUTOR_PROMPT.md`, `EXECUTION_LOG.md`, `tools/tracker.py`, `.claude/commands/run-stories.md`; tracker = Section 5). Story writing is paused at S-R3-033: 17 stories remain to write (S-R3-033 to S-R3-040, S-R4-001 to S-R4-009). After writing them run `python3 docs/plan/tools/tracker.py sync` so the tracker picks up their tier and dependencies, then continue with the backlog index, the review checklist, the final report and the board.
- 2026-11-15: R2 finished. V-42 added to `13_ASSUMPTIONS_RISKS.md`. S-R3-022 specifies the official `@anthropic-ai/sdk` inside the adapter file (model rules for `claude-haiku-5-5` and `claude-sonnet-5-5`: no sampling parameters, no forced tool choice, structured outputs through `output_config.format`). Deviations from the manifest's dependency lists are deliberate and listed for the final report: S-R2-051 also depends on S-R2-048; S-R2-062 also on 039 and 060; S-R3-016 also on 011, 021, 025, 029; S-R2-043 uses `dist-native` as `webDir`.

---

## 1. Deliverable log

| # | File | Status | Open assumptions / notes |
|---|---|---|---|
| 1 | `00_PROGRESS_LOG.md` | DONE (living) | — |
| 2 | `adr/ADR-0001-platform-strategy.md` | DONE | Depends on spike S-R0-044 |
| 3 | `adr/ADR-0003-data-model-and-database-per-environment.md` | DONE | — |
| 4 | `adr/ADR-0004-orm-and-migrations.md` | DONE | V-07 (drizzle-kit folder layout) |
| 5 | `adr/ADR-0005-auth-provider.md` | DONE | A-03 (no production users exist) |
| 6 | `adr/ADR-0007-ai-orchestration-pattern.md` | DONE | — |
| 7 | `adr/ADR-0009-hosting-rung-0.md` | DONE | Depends on spike S-R0-043 |
| 8 | `adr/ADR-0000-stack-fit-gate.md` | DONE | Three unproven cells, three spikes |
| 9 | `adr/ADR-0002-backend-runtime-and-framework.md` | DONE | — |
| 10 | `adr/ADR-0006-session-and-token-model.md` | DONE | — |
| 11 | `adr/ADR-0008-ai-provider-abstraction-and-model-routing.md` | DONE | V-12, V-13 (structured output on compatibility endpoints) |
| 12 | `adr/ADR-0010-monorepo-and-tooling.md` | DONE | V-26 (exact TypeScript 6.0.x and ESLint 9.x patches) |
| 13 | `adr/ADR-0011-api-style-and-contract-sharing.md` | DONE | V-16 |
| 14 | `adr/ADR-0012-client-framework-and-state.md` | DONE | V-11 |
| 15 | `adr/ADR-0013-design-system-approach.md` | DONE | — |
| 16 | `adr/ADR-0014-offline-and-sync-strategy.md` | DONE | RK-11 |
| 17 | `adr/ADR-0015-mobile-shell.md` | DONE | V-24 |
| 18 | `adr/ADR-0016-desktop-shell.md` | DONE | V-05 |
| 19 | `adr/ADR-0017-background-jobs-and-events.md` | DONE | V-15 |
| 20 | `adr/ADR-0018-prompt-and-eval-management.md` | DONE | — |
| 21 | `adr/ADR-0019-maps-and-places-provider.md` | DONE | V-01 |
| 22 | `adr/ADR-0020-analytics-and-privacy.md` | DONE | V-02, A-01 |
| 23 | `adr/ADR-0021-error-tracking.md` | DONE | V-09 |
| 24 | `adr/ADR-0022-testing-stack.md` | DONE | V-20 |
| 25 | `adr/ADR-0023-feature-flags.md` | DONE | — |
| 26 | `adr/ADR-0024-secrets-and-configuration.md` | DONE | — |
| 27 | `adr/ADR-0025-internationalisation.md` | DONE | A-01 |
| 28 | `adr/ADR-0026-notifications-and-push.md` | DONE | Depends on spike S-R0-047 |
| 29 | `adr/ADR-0027-name-licence-and-repository-visibility.md` | DONE | V-23 |
| 30 | `01_EXECUTIVE_BRIEF.md` | DONE | A-01, A-02, A-06, A-11, A-13 |
| 31 | `02_PRODUCT_STRATEGY.md` | DONE | V-21 (competitor facts from third-party sources) |
| 32 | `03_ARCHITECTURE.md` | DONE | — |
| 33 | `GLOSSARY.md` | DONE | Written early so later files share one vocabulary |
| 34 | `04_REPO_STRUCTURE_AND_CONVENTIONS.md` | DONE | V-26 |
| 35 | `05_AI_ARCHITECTURE.md` | DONE | A-10; V-12, V-13, V-14 |
| 36 | `06_DATA_AND_AUTH.md` | DONE | A-03, A-17; V-34, V-35, V-36 |
| 37 | `07_UX_DESIGN_SYSTEM.md` | DONE | A-14. Token CSS corrected after writing (theme variables referenced themselves); semantic token names now used everywhere |
| 38 | `08_HOSTING_AND_SCALING_LADDER.md` | DONE | V-02, V-05, V-09; several paid-plan prices UNVERIFIED |
| 39 | `09_TEST_QA_OBSERVABILITY.md` | DONE | V-38 (coverage provider in the Workers test runtime) |
| 40 | `10_RELEASE_PLAN.md` | DONE | A-02; V-10 |
| 41 | `11_GO_TO_MARKET.md` | DONE | A-06, A-11 |
| 42 | `13_ASSUMPTIONS_RISKS.md` | DONE | Holds the A-NN, V-NN and RK-NN lists |
| 43 | `14_PARKING_LOT.md` | DONE | Triggers gate every R4 story |
| 44 | `15_CODEBASE_DISPOSITION.md` | DONE | D-01..D-30 and M-01..M-15 |
| 45 | `stories/R0/` (47 files) | DONE | — |
| 46 | `stories/R1/` (95 files) | DONE | — |
| 47 | `stories/R2/` (62 files) | DONE | V-42 added (Apple authorisation code in the sign-in plugin) |
| 48 | `stories/R3/` (40 files) | IN PROGRESS | See Section 0 for the next ID |
| 49 | `stories/R4/` (9 files) | TODO | — |
| 50 | `12_BACKLOG_INDEX.md` | TODO | Generated from the story files' field tables |
| 51 | Section 9 review checklist and consistency sweep | TODO | Results go into `99_FINAL_REPORT.md` |
| 52 | `99_FINAL_REPORT.md` | TODO | Must note that `docs/BOARD.md` was edited under PLAN_ONLY |
| 53 | `docs/BOARD.md` full update | TODO | — |
| 54 | `EXECUTOR_PROMPT.md`, `EXECUTION_LOG.md`, `tools/tracker.py`, `.claude/commands/run-stories.md` | DONE | Hand-over to the executor agent. Tracker is Section 5 below; the planner's Section 0 is only for finishing the story files |

(Rows are appended as each file is completed.)

---

## 2. Locked decision digest

Each line is decided. Runner-up and flip trigger live in the named ADR.

| # | Decision | Pick | ADR |
|---|---|---|---|
| 1 | Platform strategy | One mobile-first React SPA. Web + installable PWA first; iOS and Android through Capacitor 8 shells; desktop through PWA install. Tauri 2 desktop shell only on trigger. Client fallback: Expo rewrite of `apps/web` only. | ADR-0001, ADR-0015, ADR-0016 |
| 2 | Ship order of platforms | R0–R1 web (responsive). R2 PWA install (desktop + Android + iOS Home Screen) and Capacitor builds to internal testers. R3 public App Store and Play release. Tauri: parked. | ADR-0001 |
| 3 | Backend | TypeScript, Hono 4 on Cloudflare Workers, modular monolith. One Worker serves the SPA assets and `/api/*` on the same origin. | ADR-0002, ADR-0009 |
| 4 | Data model | Relational. SQLite everywhere at rungs 0–2: Cloudflare D1 in preview and production, local D1 (SQLite file) in dev, isolated D1 in tests. Postgres only on numeric trigger. On-device store is IndexedDB, not SQLite. | ADR-0003, ADR-0014 |
| 5 | Data access | Drizzle ORM 0.45 + drizzle-kit 0.31 generating SQL; applied with `wrangler d1 migrations apply`. Repository pattern; atomic `batch()` as the only transaction primitive. | ADR-0004 |
| 6 | Auth | Better Auth 1.7 self-hosted in our D1. Google required (R0). Sign in with Apple and email magic link in R2. No passwords, ever. | ADR-0005 |
| 7 | Session model | Opaque DB-backed session. Web/PWA: httpOnly SameSite=Lax cookie on the same origin. Native shells: the same session token as a Bearer token kept in OS secure storage. | ADR-0006 |
| 8 | AI orchestration | Own small framework in `packages/ai`: intent Router (Chain of Responsibility) → specialist workflow Agents (Template Method) → deterministic Tool Registry (Registry + Command) → Guardrail chain. No LLM-driven tool loops in R1. | ADR-0007 |
| 9 | AI providers | `AIProvider` port. One hand-written `OpenAICompatibleProvider` adapter (OpenAI, Gemini, Workers AI, Groq, Ollama all speak it) + `HeuristicProvider` + `FakeProvider`. Decorators for retry/timeout, circuit breaker, budget, tracing. Native Anthropic adapter in R3. | ADR-0008 |
| 10 | Model routing | Two tiers, configured by env chain. $0 default: Workers AI (`llama-3.1-8b` CHEAP, `llama-4-scout` STRONG) → heuristic. Paid default: OpenAI `gpt-5-nano` CHEAP, `gpt-5-mini` STRONG → Gemini `gemini-3.5-flash-lite` → heuristic. Gemini free tier is forbidden for user content. | ADR-0008 |
| 11 | AI budget | Per user per day: 40 concierge messages, 6 plan regenerations, 20 listing extractions, and a hard 30,000 micro-USD ($0.03) cost cap. Global monthly cap `AI_MONTHLY_BUDGET_USD` (default 10). Degrade STRONG → CHEAP → heuristic. | ADR-0008 |
| 12 | Plan generation | Deterministic baseline plan from domain rules, returned immediately. The LLM only enhances (summary, reasons, up to 5 extra tasks) asynchronously and never blocks activation. | ADR-0007 |
| 13 | Hosting rung 0 | Cloudflare Workers Free + D1 Free + Workers static assets. $0, commercial use allowed, no cold starts. | ADR-0009 |
| 14 | Monorepo | pnpm 12 workspaces, no Turborepo. `apps/{api,web,mobile,site}` + `packages/{domain,contracts,ai,api-client}`. Internal packages export TypeScript source (no build step). | ADR-0010 |
| 15 | API style | REST + JSON under `/api/v1`. Zod 4 schemas in `packages/contracts` shared by server and client. OpenAPI document generated with `@hono/zod-openapi`. | ADR-0011 |
| 16 | Client stack | Vite 8, React 19, React Router 8 (data mode), TanStack Query 5, React Hook Form 7 + Zod resolver. No global state library. | ADR-0012 |
| 17 | Design system | The supplied "Modernist / Tide" design is the visual source of truth. Tailwind CSS 4 tokens as CSS variables, own components in `apps/web/src/ui` on Radix primitives, Lucide icons, self-hosted Archivo. | ADR-0013 |
| 18 | Offline | Server-authoritative. Persisted read cache + idempotent mutation outbox + on-device deterministic calculators. Not local-first. | ADR-0014 |
| 19 | Jobs and events | Transactional outbox table in D1, drained by `ctx.waitUntil` fast path and a 1-minute Cron Trigger. Cloudflare Queues only on trigger. | ADR-0017 |
| 20 | Prompts and evals | Prompts are versioned TypeScript modules in `packages/ai/src/prompts`. Own Vitest eval harness with golden JSON cases; deterministic safety assertions gate CI. promptfoo is the runner-up. | ADR-0018 |
| 21 | Places and maps | Geoapify (OSM data, storing results allowed) for geocoding, autocomplete and places, behind `GeocodingProvider` / `PlacesProvider`; labelled demo provider when no key. No embedded map in R1; MapLibre + OpenFreeMap in R3. | ADR-0019 |
| 22 | Analytics | PostHog Cloud (EU) fed only by our API (server-side capture + first-party `/api/v1/events`). No third-party script, no cookies, pseudonymous IDs, no session replay. | ADR-0020 |
| 23 | Error tracking | Sentry (free Developer plan), `@sentry/cloudflare` + `@sentry/react`, PII scrubbing on. | ADR-0021 |
| 24 | Testing | Vitest 4.1 everywhere; `@cloudflare/vitest-plugin` for API integration tests on real D1; Testing Library; Playwright + axe for E2E; Maestro for mobile smoke in R3. | ADR-0022 |
| 25 | Feature flags | Typed flags from Worker env served by `GET /api/v1/config`. Deterministic hash-bucket percentage rollouts in R3. No flag vendor. | ADR-0023 |
| 26 | Secrets | `wrangler secret put` per environment, `.dev.vars` locally, GitHub Actions secrets for deploy. Zod validation of env at startup. | ADR-0024 |
| 27 | i18n | i18next + react-i18next, English from R0 with no hard-coded strings. Spanish and Simplified Chinese in R3. Logical CSS properties for RTL readiness. | ADR-0025 |
| 28 | Notifications | In-app centre + email (Resend) + Web Push in R2; native push through FCM in R2 shells. | ADR-0026 |
| 29 | Name, licence, visibility | Keep "Student Life Journey". Private repository, proprietary licence. | ADR-0027 |
| 30 | Toolchain pins | Node 24 LTS, pnpm 12.18, TypeScript 6.0.x (TS 7 is outside typescript-eslint's range), ESLint 9.x (jsx-a11y does not yet accept 10), Prettier 3.10. | ADR-0010 |
| 31 | Money and dates | Money is INTEGER minor units + ISO 4217 code. Arrival date is a local `YYYY-MM-DD` string plus destination IANA time zone. No `Float` money, no `Date` for calendar dates. | ADR-0003 |
| 32 | Scope cuts | Interests are not collected. Life Readiness and My Life move to R2. "First five routes" and the embedded map are deferred. Housing listings search stays out (no invented listings). | `02_PRODUCT_STRATEGY.md`, `14_PARKING_LOT.md` |

### 2.1 Conventions (one scheme, used everywhere)

- **IDs:** stories `S-R{n}-{NNN}`; ADRs `ADR-NNNN`; assumptions `A-NN`; risks `RK-NN`; parking-lot items `PL-NN`; triggers `T-NN`; verify items `V-NN`; repo discrepancies `D-NN`; threats `TH-NN`; experiments `X-NN`.
- **Packages:** `@slj/domain`, `@slj/contracts`, `@slj/ai`, `@slj/api-client`; apps `@slj/api`, `@slj/web`, `@slj/mobile`, `@slj/site`.
- **Files:** kebab-case file names; one exported React component per file, PascalCase export.
- **Database:** snake_case, singular table names (`task`, `plan`, `relocation_profile`). Better Auth keeps its default tables (`user`, `session`, `account`, `verification`).
- **API:** kebab-case paths under `/api/v1`, camelCase JSON, error envelope `{ "error": { "code", "message", "details?", "requestId" } }`.
- **Env vars:** `SCREAMING_SNAKE_CASE`. Client-exposed build vars are prefixed `VITE_`.
- **Branches / commits:** `feat/S-R1-018-tasks-api`; Conventional Commits with the story ID, e.g. `feat(api): add tasks API (S-R1-018)`.
- **Spec references:** "spec §N" means `docs/student_life_relocation_agent_focused_mvp.md` section N; "vision §N" means `docs/student_life_relocation_agent_mvp.md` section N.
- **Executor tiers:** Tier-1 cheapest model, Tier-2 mid model, Tier-3 frontier model or human, HUMAN for chores only a person can do.

---

## 3. Verified facts ledger (`verified-on: 2026-11-14`)

Every number below was read from the cited page on 2026-11-14 unless marked otherwise. Anything not in this ledger is listed as `UNVERIFIED` in `13_ASSUMPTIONS_RISKS.md`.

### 3.1 Cloudflare

| Fact | Value | Source |
|---|---|---|
| Workers Free requests | 100,000/day, resets 00:00 UTC, Error 1027 when exceeded | https://developers.cloudflare.com/workers/platform/limits/ |
| Workers Free CPU | 10 ms per HTTP request and per Cron Trigger invocation (CPU, not wall time) | same |
| Workers Free other | 128 MB memory, 50 subrequests/request, 6 simultaneous outgoing connections, 64 env vars, 100 Workers, 5 Cron Triggers/account | same |
| Worker size | 64 MiB uncompressed on both plans; no compressed size limit | same |
| Static assets | 20,000 files per version (Free), 25 MiB per file; asset requests are billable only if the Worker script is invoked | same; https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/ |
| Workers Paid | $5/month minimum; 10M requests and 30M CPU-ms included; $0.30 per extra million requests; $0.02 per extra million CPU-ms; CPU up to 5 min (default 30 s); 10,000 subrequests; 250 Cron Triggers | https://developers.cloudflare.com/workers/platform/pricing/ |
| D1 Free | 10 databases, 500 MB per database, 5 GB per account, Time Travel 7 days, 50 queries per Worker invocation (a `batch()` counts as one), 5M rows read/day, 100,000 rows written/day; queries fail after the daily cap until reset | https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/ |
| D1 Paid | 10 GB per database (cannot be raised), Time Travel 30 days, 1,000 queries per invocation; 25B rows read and 50M rows written per month included; $0.001/M reads, $1.00/M writes, $0.75/GB-month | same |
| D1 engine limits | 100 KB statement, 100 bound parameters, 2 MB row, 30 s query, 100 columns per table | same |
| D1 transactions | `batch()` statements run as one SQL transaction (all-or-nothing). Interactive `BEGIN`/`COMMIT` from a Worker is not documented | https://developers.cloudflare.com/d1/worker-api/d1-database/ |
| KV Free | 100,000 reads/day, 1,000 writes/day, 1 GB | https://developers.cloudflare.com/workers/platform/pricing/ |
| Workers Logs Free | 200,000 events/day, 3-day retention; moves to Cloudflare Observability pricing on 2026-12-01 | same |
| Queues on Free | Available since 2026-02-04; 10,000 operations/day; 24-hour retention | https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/ |
| R2 Free | 10 GB-month, 1M Class A, 10M Class B operations, free egress | https://developers.cloudflare.com/r2/pricing/ |
| Workers AI | 10,000 neurons/day free; $0.011 per 1,000 neurons beyond. `@cf/meta/llama-4-scout-17b-16e-instruct` $0.270/M in, $0.850/M out; `@cf/meta/llama-3.1-8b-instruct-fp8-fast` $0.045/M in, $0.384/M out; `@cf/meta/llama-3.3-70b-instruct-fp8-fast` $0.293/M in, $2.253/M out | https://developers.cloudflare.com/workers-ai/platform/pricing/ |
| Workers AI OpenAI compatibility | Base URL `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1`, `/chat/completions` | https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/ |
| AI Gateway | Analytics, caching and rate limiting are free on all plans | https://developers.cloudflare.com/ai-gateway/reference/pricing/ |
| Wrangler config | `assets.{directory,binding,not_found_handling,run_worker_first}`; `run_worker_first` accepts an array of patterns from Wrangler 4.20; `triggers.crons`; `d1_databases[].{migrations_dir,migrations_pattern}`; bindings and vars are not inherited by named environments; a named environment deploys as `<name>-<env>` | Cloudflare docs: static-assets, cron-triggers, d1/reference/migrations, wrangler/environments |
| D1 commands | `wrangler d1 create`, `wrangler d1 migrations apply <DB> --local\|--remote`, `wrangler d1 export <DB> --output=<file>.sql`, `wrangler d1 time-travel restore <DB> --timestamp=<ts>` | https://developers.cloudflare.com/d1/reference/migrations/ ; https://developers.cloudflare.com/d1/reference/time-travel/ |
| Deploy semantics | `wrangler deploy` sends 100% of traffic to the new version; D1 state is not versioned and is not rolled back by a code rollback | https://developers.cloudflare.com/workers/configuration/versions-and-deployments/ |
| Vitest integration | Package is `@cloudflare/vitest-plugin` (replaces `@cloudflare/vitest-pool-workers`); needs `vitest@^4.1.0`; `cloudflareTest({ wrangler: { configPath } })`; `env` and `exports` from `cloudflare:workers`; storage isolated per test file | https://developers.cloudflare.com/workers/testing/vitest-integration/ |
| Local secrets | `.dev.vars` (dotenv format) next to the Wrangler config; `wrangler secret put <KEY>`; `wrangler types` generates the `Env` type | https://developers.cloudflare.com/workers/configuration/secrets/ |

### 3.2 Auth, mobile and store policy

| Fact | Value | Source |
|---|---|---|
| Better Auth version | 1.7.23 (npm `latest`) | https://registry.npmjs.org/better-auth/latest |
| Better Auth stewardship | Maintains Auth.js since 2025-09-22; joined Vercel 2026-07-07; stays open source | https://better-auth.com/blog/authjs-joins-better-auth ; https://www.better-auth.com/blog/better-auth-joins-vercel |
| Lucia | Deprecated March 2025 | https://lucia-auth.com/ |
| Google ID-token sign-in | `authClient.signIn.social({ provider: "google", idToken: { token, accessToken } })`; server `clientId` may be an array of client IDs | https://www.better-auth.com/docs/authentication/google |
| Apple ID-token sign-in | Same call with `provider: "apple"` and optional `nonce`; server needs `appBundleIdentifier`; client-secret JWT expires within 6 months | https://www.better-auth.com/docs/authentication/apple |
| Bearer plugin | Token returned in the `set-auth-token` response header; sent back as `Authorization: Bearer <token>` | https://www.better-auth.com/docs/plugins/bearer |
| Sessions | `expiresIn` default 7 days; `updateAge`; `authClient.revokeSessions()` revokes all; cookie cache optional | https://www.better-auth.com/docs/concepts/session-management |
| Accounts | Linking enabled by default; `trustedProviders`; `user.deleteUser.enabled` is off by default | https://www.better-auth.com/docs/concepts/users-accounts |
| Schema generation | `npx auth@latest generate` writes the Drizzle schema; core tables `user`, `session`, `account`, `verification` | https://www.better-auth.com/docs/concepts/database |
| Workers notes | Node compatibility is on by default from compatibility date 2026-08-04; KV cannot back `secondaryStorage`; set `advanced.ipAddress.ipAddressHeaders: ["cf-connecting-ip"]` | https://www.better-auth.com/docs/guides/cloudflare |
| Capacitor | 8.6.2 current; Capacitor 9 forecast for end of November 2026 | https://registry.npmjs.org/@capacitor%2Fcore/latest ; ionic.io blog |
| Native social login | `@capgo/capacitor-social-login` 8.7.11 documents a Better Auth integration (Google and Apple ID tokens) | https://capgo.app/docs/plugins/social-login/better-auth/ |
| Google OAuth in webviews | Authorization requests must not use an embedded user-agent; native apps use the system browser or Google Sign-In SDK; custom URI schemes are no longer supported; loopback is for desktop only | https://developers.google.com/identity/protocols/oauth2/policies ; https://developers.google.com/identity/protocols/oauth2/native-app |
| App Store 4.8 | An app that uses third-party login for the primary account must offer an equivalent option that limits data to name and email, lets users hide their email, and does not track for ads | https://developer.apple.com/app-store/review/guidelines/ |
| App Store 4.2 / 5.1.1(v) | The app must be more than a repackaged website; account creation requires in-app account deletion | same |
| Apple Developer Program | 99 USD per year | https://developer.apple.com/programs/whats-included/ |
| Google Play | US$25 one-time; personal accounts created after 2023-11-13 need a closed test with at least 12 testers for at least 14 days before production | https://support.google.com/googleplay/android-developer/answer/6112435 ; https://support.google.com/googleplay/android-developer/answer/14151465 |
| iOS Web Push | iOS/iPadOS 16.4+, only for web apps added to the Home Screen; no Apple Developer Program needed | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ |
| Tauri | 2.12.x stable; targets Windows, macOS, Linux, iOS, Android; signing required on most platforms; macOS notarisation outside the store | https://v2.tauri.app/distribute/ |

### 3.3 LLM prices (USD per 1M tokens, standard tier)

| Model | Input | Output | Source |
|---|---|---|---|
| OpenAI `gpt-5-nano` | 0.05 | 0.40 | https://developers.openai.com/api/docs/pricing |
| OpenAI `gpt-5-mini` | 0.25 | 2.00 | same |
| OpenAI `gpt-5.4-nano` | 0.20 | 1.25 | same |
| OpenAI `gpt-5.4-mini` | 0.75 | 4.50 | same |
| OpenAI `gpt-6-luna` | 0.10 | 0.50 | same |
| Google `gemini-3.5-flash-lite` | 0.30 | 2.50 | https://aistudio.google.com/docs/pricing |
| Google `gemini-3.8-flash` | 0.75 until 2026-12-31, then 1.50 | 3.75 until 2026-12-31, then 7.50 | same |
| Anthropic Claude Haiku 5.5 (prompts ≤ 100k tokens) | 0.10 | 0.50 | https://platform.claude.com/docs/en/about-claude/pricing |
| Anthropic Claude Sonnet 5.5 | 2.00 | 10.00 | same |

Other verified LLM facts: Gemini free tier content is used to improve Google products, paid tier content is not (pricing page row). `gemini-2.5-flash` shuts down 2026-12-01. Gemini's OpenAI-compatible base URL is `https://generativelanguage.googleapis.com/v1beta/openai/` and is labelled beta (https://aistudio.google.com/docs/openai).

### 3.4 Other services

| Service | Free tier facts | Source |
|---|---|---|
| Geoapify | 3,000 credits/day, 5 req/s soft limit, commercial use allowed, "Powered by Geoapify" + OpenStreetMap attribution required on Free, results may be cached, stored and redistributed, Places costs 1 credit per 20 places, geocoding and autocomplete cost 1 credit | https://www.geoapify.com/pricing/ ; https://www.geoapify.com/places-api/ ; https://apidocs.geoapify.com/docs/places/ |
| Geoapify Places request | `GET https://api.geoapify.com/v2/places?categories=…&filter=circle:lon,lat,radiusMeters&bias=proximity:lon,lat&limit=…&apiKey=…`; categories `commercial.supermarket`, `healthcare.pharmacy`, `healthcare.clinic_or_praxis`, `healthcare.hospital`, `public_transport`, `service.cleaning.laundry` | https://apidocs.geoapify.com/docs/places/ |
| OpenFreeMap | Free, no API key, commercial use allowed, attribution required | https://openfreemap.org/ |
| Sentry Developer | 1 user, 5,000 errors/month, 30-day retention; Team plan $29/month | https://sentry.io/pricing/ |
| PostHog | First 1M product-analytics events per month free | https://posthog.com/docs/product-analytics/pricing |
| Resend | 3,000 emails/month, 100/day, 3 domains; Pro $20/month | https://resend.com/pricing |
| GitHub Actions | GitHub Free private repos include $12/month of compute (about 2,000 Linux 2-core minutes); macOS minutes cost about 10x; public repos are free | https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| Vercel Hobby | Non-commercial personal use only | https://vercel.com/docs/limits/fair-use-guidelines |
| Supabase Free | 500 MB database, 50,000 MAU, 2 projects, paused after 1 week of inactivity | https://supabase.com/pricing |
| Neon Free | 100 CU-hours per project per month, compute suspends after 5 minutes idle | https://neon.com/pricing |
| Turso Free | 100 databases, 5 GB, 500M row reads and 10M row writes per month | https://turso.tech/pricing |
| Clerk Hobby | 50,000 monthly retained users; Pro $25/month | https://clerk.com/pricing |
| Firebase Auth (Spark) | 50,000 MAU for email and social sign-in | https://firebase.google.com/pricing |
| Render Free | Web service spins down after 15 minutes idle (about 1 minute to wake); free Postgres expires after 30 days | https://render.com/docs/free |
| Fly.io | No free tier for new organisations | https://docs.fly.io/about/pricing |
| Railway | $5 one-time trial credit; free plan has $1/month credit | https://railway.com/pricing |

### 3.5 Package versions (npm `latest`, read from `registry.npmjs.org`)

`hono` 4.13.18 · `@hono/zod-openapi` 1.6.3 (peer `zod ^4`) · `zod` 4.6.7 · `drizzle-orm` 0.45.4 · `drizzle-kit` 0.31.11 · `better-auth` 1.7.23 · `wrangler` 4.162.0 (Node ≥ 22.12) · `@cloudflare/vitest-plugin` 1.8.2 (peer `vitest ^4.1.0 || ^5`) · `vitest` 4.1.12 (dist-tag `V4`; `latest` is 5.1.0) · `vite` 8.3.8 · `@vitejs/plugin-react` 6.3.0 · `react` 19.3.1 · `react-router` 8.5.1 · `@tanstack/react-query` 5.107.1 · `@tanstack/react-query-persist-client` 5.107.1 · `@tanstack/query-async-storage-persister` 5.107.1 · `idb-keyval` 6.3.0 · `react-hook-form` 7.92.0 · `@hookform/resolvers` 7.0.6 · `tailwindcss` 4.3.5 · `@tailwindcss/vite` 4.3.5 · `class-variance-authority` 0.7.1 · `tailwind-merge` 3.7.0 · `clsx` 2.1.1 · `lucide-react` 1.73.0 · `@radix-ui/react-dialog` 1.3.1 · `@fontsource-variable/archivo` 5.3.0 · `i18next` 27.1.1 · `react-i18next` 18.0.1 · `vite-plugin-pwa` 2.0.0 · `@playwright/test` 1.65.1 · `@axe-core/playwright` 4.14.0 · `@testing-library/react` 16.3.3 · `typescript` 7.0.2 (`typescript-eslint` 8.72.2 accepts `<6.1.0`, so we pin 6.0.x) · `eslint` 10.15.0 (`eslint-plugin-jsx-a11y` 6.10.2 accepts up to `^9`, so we pin 9.x) · `prettier` 3.10.1 · `dependency-cruiser` 18.7.2 · `husky` 9.1.7 · `lint-staged` 17.6.0 · `@commitlint/cli` 21.2.4 · `size-limit` 14.3.0 · `@lhci/cli` 0.16.1 · `@capacitor/core` 8.6.2 · `@capacitor/cli` 8.6.2 · `@capacitor/ios` 8.6.2 · `@capgo/capacitor-social-login` 8.7.11 · `@capacitor/push-notifications` 8.1.3 · `@aparajita/capacitor-secure-storage` 8.0.1 · `@tauri-apps/cli` 2.12.4 · `@sentry/cloudflare` 11.12.0 · `@sentry/react` 11.12.0 · `posthog-js` 1.449.1 · `astro` 7.4.12 · `jose` 6.2.17 · `@pushforge/builder` 2.0.5 · `maplibre-gl` 6.18.0 · `promptfoo` 0.125.1 · `pnpm` 12.18.0. Node LTS lines: 26 "Lithium" (26.13.1), 24 "Krypton" (24.22.3), 22 "Jod" (22.23.5) from https://nodejs.org/dist/index.json.

### 3.6 Domain availability (registry check through a domain-search tool, point in time)

| Domain | Result | Quoted first-year price |
|---|---|---|
| `studentlifejourney.app` | available | $20 |
| `studentlifejourney.com` | available | $17 |
| `softlanding.app` | unavailable | — |
| `firstweek.app` | unavailable | — |
| `arrivo.app` | unavailable | — |
| `unpackd.app` | unavailable | — |
| `dayzero.app` | unavailable | — |
| `tideover.app` | unavailable | — |

Availability is not a hold. Social handles were not checked.

---

## 4. Planned story manifest

Counts: R0 47 · R1 95 · R2 62 · R3 40 · R4 9 · total 253. Sizes: XS under 30 min, S up to 2 h, M up to half a day. `12_BACKLOG_INDEX.md` supersedes this section once generated.

### R0 — Walking skeleton

| ID | Title | Epic | Type | Size | Tier | Depends on |
|---|---|---|---|---|---|---|
| S-R0-001 | Archive prototype under legacy | Repo Foundation | refactor | S | 1 | — |
| S-R0-002 | Initialise pnpm workspace root | Repo Foundation | infra | S | 1 | 001 |
| S-R0-003 | Add lint and format toolchain | Repo Foundation | infra | S | 2 | 002 |
| S-R0-004 | Create domain package with date math | Repo Foundation | feature | S | 1 | 002 |
| S-R0-005 | Create contracts package with error codes | Platform Runtime | feature | S | 1 | 002 |
| S-R0-006 | Scaffold API Worker with health route | Platform Runtime | infra | M | 2 | 004, 005 |
| S-R0-007 | Add environment validation module | Platform Runtime | feature | S | 1 | 006 |
| S-R0-008 | Add error envelope and request IDs | Platform Runtime | feature | S | 2 | 005, 006 |
| S-R0-009 | Add structured request logging | Observability | feature | XS | 1 | 008 |
| S-R0-010 | Add D1 database with Drizzle | Platform Runtime | infra | M | 2 | 006 |
| S-R0-011 | Create Google OAuth web client | Human Chores | chore | S | HUMAN | — |
| S-R0-012 | Generate Better Auth schema migration | Identity | infra | S | 2 | 010 |
| S-R0-013 | Mount Better Auth with Google | Identity | feature | M | 3 | 007, 011, 012 |
| S-R0-014 | Add session guard and me endpoint | Identity | feature | S | 2 | 008, 013 |
| S-R0-015 | Add test-only session endpoint | Identity | test | S | 2 | 014 |
| S-R0-016 | Scaffold web app with Vite | Design System | infra | M | 2 | 003 |
| S-R0-017 | Add Tide design tokens | Design System | feature | S | 1 | 016 |
| S-R0-018 | Build Button and Tag primitives | Design System | feature | S | 1 | 017 |
| S-R0-019 | Build Field and Input primitives | Design System | feature | S | 1 | 017 |
| S-R0-020 | Add i18n scaffolding | Internationalisation | infra | S | 1 | 016 |
| S-R0-021 | Create typed API client package | Platform Runtime | feature | S | 2 | 005, 016 |
| S-R0-022 | Add session provider and route guards | Identity | feature | S | 2 | 014, 021 |
| S-R0-023 | Build sign-in screen | Identity | feature | S | 1 | 018, 020, 022 |
| S-R0-024 | Add relocation profile table and repository | Onboarding | feature | M | 2 | 012 |
| S-R0-025 | Add onboarding endpoint | Onboarding | feature | M | 2 | 004, 014, 024 |
| S-R0-026 | Compute first priority in domain | Plan and Tasks | feature | S | 1 | 004 |
| S-R0-027 | Add dashboard endpoint | Plan and Tasks | feature | S | 2 | 025, 026 |
| S-R0-028 | Build app shell with navigation | Design System | feature | M | 2 | 018, 022 |
| S-R0-029 | Build minimal onboarding wizard | Onboarding | feature | M | 2 | 019, 022, 025 |
| S-R0-030 | Build dashboard hero with priority | Plan and Tasks | feature | S | 2 | 027, 028 |
| S-R0-031 | Add CI workflow | Repo Foundation | infra | S | 2 | 006, 016 |
| S-R0-032 | Add dependency boundary checks | Repo Foundation | infra | S | 2 | 031 |
| S-R0-033 | Add commit hooks and commit linting | Repo Foundation | infra | XS | 1 | 003 |
| S-R0-034 | Add Playwright smoke journey | Quality | test | M | 3 | 015, 029, 030 |
| S-R0-035 | Add security headers and CSRF checks | Privacy and Trust | feature | S | 2 | 013 |
| S-R0-036 | Create Cloudflare account and databases | Human Chores | chore | S | HUMAN | — |
| S-R0-037 | Configure preview and production environments | Platform Runtime | infra | S | 2 | 010, 036 |
| S-R0-038 | Add deploy workflow | Platform Runtime | infra | M | 3 | 031, 037 |
| S-R0-039 | Create Sentry project | Human Chores | chore | XS | HUMAN | — |
| S-R0-040 | Add Sentry to API and web | Observability | feature | S | 2 | 038, 039 |
| S-R0-041 | Write README and runbook index | Repo Foundation | docs | S | 1 | 038 |
| S-R0-042 | Write deploy and rollback runbook | Operations | docs | S | 2 | 038 |
| S-R0-043 | Measure Worker CPU for streaming | Quality | spike | M | 3 | 038 |
| S-R0-044 | Prove Capacitor Google sign-in | Mobile Shell | spike | M | 3 | 013, 038 |
| S-R0-045 | Verify production walking skeleton | Human Chores | chore | S | HUMAN | 034, 035, 040 |
| S-R0-046 | Mark legacy specs as superseded | Repo Foundation | docs | XS | 1 | 041 |
| S-R0-047 | Prove Web Push from Worker | Notifications | spike | S | 3 | 038 |

### R1 — Core promise

| ID | Title | Epic | Type | Size | Tier | Depends on |
|---|---|---|---|---|---|---|
| S-R1-001 | Add Money value object | Housing | feature | S | 1 | S-R0-004 |
| S-R1-002 | Port housing cost calculators | Housing | refactor | S | 1 | 001 |
| S-R1-003 | Add affordability verdict rules | Housing | feature | S | 2 | 002 |
| S-R1-004 | Add listing risk checklist rules | Housing | feature | XS | 1 | 003 |
| S-R1-005 | Define task and plan types | Plan and Tasks | feature | S | 1 | S-R0-004 |
| S-R1-006 | Implement journey phase state | Plan and Tasks | feature | S | 1 | 005 |
| S-R1-007 | Implement priority specifications | Plan and Tasks | feature | M | 2 | 005, 006 |
| S-R1-008 | Author baseline task templates | Plan and Tasks | feature | M | 2 | 005 |
| S-R1-009 | Implement baseline plan builder | Plan and Tasks | feature | M | 2 | 006, 008 |
| S-R1-010 | Add late-arrival plan rules | Plan and Tasks | feature | S | 1 | 009 |
| S-R1-011 | Implement plan reconciliation | Plan and Tasks | feature | M | 3 | 009 |
| S-R1-012 | Add task and plan tables | Plan and Tasks | feature | M | 2 | 005 |
| S-R1-013 | Add atomic batch unit of work | Platform Runtime | feature | S | 2 | S-R0-010 |
| S-R1-014 | Add outbox table and event bus | Platform Runtime | feature | M | 2 | 013 |
| S-R1-015 | Add cron outbox dispatcher | Platform Runtime | infra | S | 2 | 014 |
| S-R1-016 | Add idempotency middleware | Platform Runtime | feature | S | 2 | 013 |
| S-R1-017 | Generate baseline plan at onboarding | Plan and Tasks | feature | M | 2 | 010, 011, 012, 014 |
| S-R1-018 | Add tasks API | Plan and Tasks | feature | M | 2 | 012, 016 |
| S-R1-019 | Add plan API | Plan and Tasks | feature | S | 2 | 017 |
| S-R1-020 | Rank dashboard priorities | Plan and Tasks | feature | S | 2 | 007, 018 |
| S-R1-021 | Add relocation settings endpoint | Onboarding | feature | S | 2 | 017 |
| S-R1-022 | Add profile preferences endpoint | Onboarding | feature | S | 2 | 013 |
| S-R1-023 | Add usage counters and budgets | AI Core | feature | M | 2 | 013 |
| S-R1-024 | Add housing option table and API | Housing | feature | M | 2 | 003, 004, 016 |
| S-R1-025 | Add housing evaluate endpoint | Housing | feature | S | 2 | 003, 004 |
| S-R1-026 | Create Geoapify API key | Human Chores | chore | XS | HUMAN | — |
| S-R1-027 | Add geocoding provider with cache | Places | feature | M | 2 | 013, 026 |
| S-R1-028 | Add places provider with cache | Places | feature | M | 2 | 027 |
| S-R1-029 | Add essential places endpoint | Places | feature | S | 2 | 028 |
| S-R1-030 | Add saved places API | Places | feature | S | 2 | 029 |
| S-R1-031 | Add destination autocomplete endpoint | Places | feature | S | 2 | 023, 027 |
| S-R1-032 | Add age attestation and consent fields | Privacy and Trust | feature | S | 2 | 022 |
| S-R1-033 | Create AI package with core interfaces | AI Core | feature | S | 2 | S-R0-005 |
| S-R1-034 | Add fake provider for tests | AI Core | test | XS | 1 | 033 |
| S-R1-035 | Implement SSE stream parser | AI Core | feature | S | 2 | 033 |
| S-R1-036 | Implement OpenAI-compatible adapter | AI Core | feature | M | 3 | 035 |
| S-R1-037 | Port heuristic provider | AI Core | refactor | M | 2 | 009, 033 |
| S-R1-038 | Add retry and timeout decorator | AI Core | feature | S | 2 | 034 |
| S-R1-039 | Add circuit breaker decorator | AI Core | feature | S | 2 | 034 |
| S-R1-040 | Add budget decorator | AI Core | feature | S | 2 | 023, 034 |
| S-R1-041 | Add tracing decorator and call log | Observability | feature | M | 2 | 013, 034 |
| S-R1-042 | Implement provider factory | AI Core | feature | S | 2 | 036, 037, 038, 039, 040, 041 |
| S-R1-043 | Add prompt registry | AI Core | feature | S | 2 | 033 |
| S-R1-044 | Define AI task schemas | AI Core | feature | S | 2 | 033 |
| S-R1-045 | Implement context builder with redaction | AI Core | feature | M | 2 | 012, 033 |
| S-R1-046 | Implement tool registry | AI Core | feature | S | 2 | 033 |
| S-R1-047 | Register core deterministic tools | AI Core | feature | M | 2 | 020, 025, 029, 046 |
| S-R1-048 | Implement input guardrails | AI Core | feature | M | 2 | 033 |
| S-R1-049 | Implement output guardrails | AI Core | feature | M | 3 | 044 |
| S-R1-050 | Implement intent router chain | AI Core | feature | M | 2 | 042, 044 |
| S-R1-051 | Implement base agent template | AI Core | feature | S | 2 | 045, 046, 048, 049 |
| S-R1-052 | Implement planning agent | AI Core | feature | M | 3 | 043, 051 |
| S-R1-053 | Implement housing agent | AI Core | feature | M | 2 | 043, 051 |
| S-R1-054 | Implement listing extraction | Housing | feature | M | 3 | 043, 051 |
| S-R1-055 | Implement concierge agent | Concierge | feature | M | 2 | 043, 051 |
| S-R1-056 | Implement orchestrator | AI Core | feature | M | 3 | 050, 052, 053, 055 |
| S-R1-057 | Add conversation tables and memory | Concierge | feature | M | 2 | 013, 033 |
| S-R1-058 | Add concierge streaming endpoint | Concierge | feature | M | 3 | 023, 047, 056, 057 |
| S-R1-059 | Wire plan enhancement handler | Plan and Tasks | feature | M | 2 | 015, 017, 052 |
| S-R1-060 | Wire housing explanation and extraction | Housing | feature | S | 2 | 025, 053, 054 |
| S-R1-061 | Configure Workers AI provider chain | AI Core | infra | S | 2 | 042 |
| S-R1-062 | Build eval harness runner | Quality | test | M | 3 | 056 |
| S-R1-063 | Author safety golden set | Quality | test | M | 2 | 062 |
| S-R1-064 | Author quality golden set | Quality | test | S | 2 | 062 |
| S-R1-065 | Add query client and API hooks | Design System | feature | S | 2 | S-R0-022 |
| S-R1-066 | Build segmented control and chips | Design System | feature | S | 1 | S-R0-018 |
| S-R1-067 | Build checkbox and task row | Design System | feature | S | 1 | S-R0-018 |
| S-R1-068 | Build toast and banner | Design System | feature | S | 2 | S-R0-018 |
| S-R1-069 | Build state blocks | Design System | feature | S | 1 | S-R0-018 |
| S-R1-070 | Build dialog primitive | Design System | feature | S | 2 | S-R0-018 |
| S-R1-071 | Build full onboarding wizard | Onboarding | feature | M | 2 | 031, 032, 065, 066 |
| S-R1-072 | Build dashboard screen | Plan and Tasks | feature | M | 2 | 020, 065, 067, 068, 069 |
| S-R1-073 | Build tasks screen | Plan and Tasks | feature | M | 2 | 018, 065, 066, 067, 069 |
| S-R1-074 | Build plan screen | Plan and Tasks | feature | M | 2 | 019, 065, 066, 067, 069 |
| S-R1-075 | Build housing evaluate form | Housing | feature | M | 2 | 025, 065, 066 |
| S-R1-076 | Build housing result panel | Housing | feature | M | 2 | 060, 075 |
| S-R1-077 | Build paste listing flow | Housing | feature | M | 2 | 060, 070, 075 |
| S-R1-078 | Build housing compare view | Housing | feature | S | 2 | 024, 076 |
| S-R1-079 | Build places screen | Places | feature | M | 2 | 029, 030, 065, 066, 069 |
| S-R1-080 | Build concierge screen | Concierge | feature | M | 3 | 058, 065, 069 |
| S-R1-081 | Build settings screen | Onboarding | feature | M | 2 | 021, 022, 065 |
| S-R1-082 | Add legal pages and links | Privacy and Trust | docs | S | 2 | S-R0-023 |
| S-R1-083 | Create PostHog project | Human Chores | chore | XS | HUMAN | — |
| S-R1-084 | Add analytics event pipeline | Observability | feature | M | 2 | 013, 083 |
| S-R1-085 | Instrument core funnel events | Observability | feature | S | 2 | 017, 018, 025, 029, 058, 084 |
| S-R1-086 | Add client event endpoint and tracker | Observability | feature | S | 2 | 065, 084 |
| S-R1-087 | Publish OpenAPI document | Quality | test | S | 2 | 018, 019, 024, 029, 058 |
| S-R1-088 | Add API contract tests | Quality | test | M | 2 | 087 |
| S-R1-089 | Add core journey E2E | Quality | test | M | 3 | 071, 072, 073, 074, 076, 079, 080, 081 |
| S-R1-090 | Add accessibility checks to E2E | Quality | test | S | 2 | 089 |
| S-R1-091 | Add bundle size budget | Quality | test | S | 1 | 080 |
| S-R1-092 | Add dev seed script | Repo Foundation | infra | S | 1 | 017 |
| S-R1-093 | Delete legacy prototype | Repo Foundation | refactor | XS | 1 | 002, 028, 037, 050 |
| S-R1-094 | Create LLM provider key with cap | Human Chores | chore | XS | HUMAN | 061 |
| S-R1-095 | Run beta readiness review | Human Chores | chore | S | HUMAN | 063, 082, 085, 088, 090, 091 |

### R2 — Installable and trustworthy

| ID | Title | Epic | Type | Size | Tier | Depends on |
|---|---|---|---|---|---|---|
| S-R2-001 | Add web app manifest and icons | Offline and Install | feature | S | 1 | S-R1-095 |
| S-R2-002 | Add service worker for app shell | Offline and Install | feature | M | 2 | 001 |
| S-R2-003 | Persist query cache to IndexedDB | Offline and Install | feature | S | 2 | S-R1-065 |
| S-R2-004 | Add offline mutation outbox | Offline and Install | feature | M | 3 | 003 |
| S-R2-005 | Add offline indicator and states | Offline and Install | feature | S | 1 | 003 |
| S-R2-006 | Add install prompt | Offline and Install | feature | S | 2 | 001 |
| S-R2-007 | Run housing math offline | Offline and Install | feature | S | 2 | 003 |
| S-R2-008 | Verify desktop PWA install | Offline and Install | test | S | HUMAN | 002, 006 |
| S-R2-009 | Implement readiness score in domain | Plan and Tasks | feature | S | 2 | S-R1-005 |
| S-R2-010 | Add readiness to dashboard endpoint | Plan and Tasks | feature | S | 2 | 009 |
| S-R2-011 | Build readiness block and My Life grid | Plan and Tasks | feature | M | 2 | 010 |
| S-R2-012 | Add dark theme tokens | Design System | feature | S | 2 | S-R0-017 |
| S-R2-013 | Add theme switcher | Design System | feature | XS | 1 | 012 |
| S-R2-014 | Run accessibility audit and fixes | Quality | test | M | 3 | S-R1-090 |
| S-R2-015 | Add reduced motion and zoom support | Quality | feature | S | 2 | 014 |
| S-R2-016 | Add pseudo-locale and RTL smoke test | Internationalisation | test | S | 2 | S-R0-020 |
| S-R2-017 | Add onboarding timing metric | Observability | feature | XS | 1 | S-R1-086 |
| S-R2-018 | Add data export endpoint | Privacy and Trust | feature | M | 2 | S-R1-095 |
| S-R2-019 | Add account deletion endpoint | Privacy and Trust | feature | M | 3 | 018 |
| S-R2-020 | Build privacy controls in settings | Privacy and Trust | feature | M | 2 | 018, 019 |
| S-R2-021 | Add retention purge job | Privacy and Trust | feature | S | 2 | S-R1-015 |
| S-R2-022 | Add audit log | Privacy and Trust | feature | S | 2 | S-R1-013 |
| S-R2-023 | Add analytics consent handling | Privacy and Trust | feature | S | 2 | S-R1-084 |
| S-R2-024 | Finalise privacy policy and terms | Privacy and Trust | docs | S | HUMAN | S-R1-082 |
| S-R2-025 | Add scheduled database export backup | Operations | infra | S | 2 | S-R0-038 |
| S-R2-026 | Rehearse database restore | Operations | chore | S | HUMAN | 025 |
| S-R2-027 | Run security review checklist | Privacy and Trust | test | M | 3 | 019, 022 |
| S-R2-028 | Buy domain and move DNS | Human Chores | chore | S | HUMAN | — |
| S-R2-029 | Attach custom domains to Worker | Platform Runtime | infra | S | 2 | 028 |
| S-R2-030 | Create Resend account and verify domain | Human Chores | chore | XS | HUMAN | 028 |
| S-R2-031 | Add email sender adapter | Notifications | feature | S | 2 | 030 |
| S-R2-032 | Add magic link sign-in | Identity | feature | M | 3 | 031 |
| S-R2-033 | Add notification table and API | Notifications | feature | M | 2 | S-R1-013 |
| S-R2-034 | Build notification centre | Notifications | feature | S | 2 | 033 |
| S-R2-035 | Add reminder rules in domain | Notifications | feature | S | 2 | S-R1-006 |
| S-R2-036 | Add reminder scheduler job | Notifications | feature | M | 2 | 033, 035 |
| S-R2-037 | Add email digest delivery | Notifications | feature | S | 2 | 031, 036 |
| S-R2-038 | Add web push subscription and delivery | Notifications | feature | M | 3 | 002, 036 |
| S-R2-039 | Add notification preferences | Notifications | feature | S | 2 | 033 |
| S-R2-040 | Enrol in Apple Developer Program | Human Chores | chore | S | HUMAN | — |
| S-R2-041 | Register Google Play developer account | Human Chores | chore | S | HUMAN | — |
| S-R2-042 | Create native OAuth clients | Human Chores | chore | S | HUMAN | 040, 041 |
| S-R2-043 | Scaffold Capacitor project | Mobile Shell | infra | M | 3 | S-R0-044 |
| S-R2-044 | Add shell API base URL and CORS | Mobile Shell | feature | S | 2 | 029, 043 |
| S-R2-045 | Add bearer session storage for shells | Mobile Shell | feature | M | 3 | 044 |
| S-R2-046 | Add native Google sign-in | Mobile Shell | feature | M | 3 | 042, 045 |
| S-R2-047 | Add Sign in with Apple | Identity | feature | M | 3 | 042, 045 |
| S-R2-048 | Add deep links and app links | Mobile Shell | feature | M | 3 | 029, 043 |
| S-R2-049 | Polish native chrome | Mobile Shell | feature | S | 2 | 043 |
| S-R2-050 | Create Firebase project for FCM | Human Chores | chore | XS | HUMAN | 041 |
| S-R2-051 | Add native push registration | Notifications | feature | M | 3 | 038, 043, 050 |
| S-R2-052 | Add FCM delivery channel | Notifications | feature | M | 3 | 036, 050 |
| S-R2-053 | Add Sentry to mobile shell | Observability | feature | XS | 2 | 043 |
| S-R2-054 | Ship Android internal test build | Mobile Shell | chore | S | HUMAN | 046, 049 |
| S-R2-055 | Ship iOS TestFlight build | Mobile Shell | chore | S | HUMAN | 047, 049 |
| S-R2-056 | Scaffold marketing site | Growth | infra | M | 2 | 029 |
| S-R2-057 | Build landing page | Growth | feature | M | 2 | 056 |
| S-R2-058 | Add waitlist endpoint and form | Growth | feature | S | 2 | 056 |
| S-R2-059 | Add in-app feedback form | Growth | feature | S | 2 | S-R1-081 |
| S-R2-060 | Add account linking in settings | Identity | feature | S | 2 | 032, 047 |
| S-R2-061 | Set up beta programme | Human Chores | chore | S | HUMAN | 057, 059 |
| S-R2-062 | Run release readiness review | Human Chores | chore | S | HUMAN | 008, 014, 020, 027, 054, 055, 061 |

### R3 — Launch and learn

| ID | Title | Epic | Type | Size | Tier | Depends on |
|---|---|---|---|---|---|---|
| S-R3-001 | Write store listing copy | Growth | docs | S | 2 | S-R2-062 |
| S-R3-002 | Produce store screenshots | Growth | chore | S | 2 | 001 |
| S-R3-003 | Complete store privacy declarations | Human Chores | chore | S | HUMAN | S-R2-024 |
| S-R3-004 | Add minimum version gate | Mobile Shell | feature | S | 2 | S-R2-043 |
| S-R3-005 | Run Play closed test | Human Chores | chore | S | HUMAN | S-R2-054 |
| S-R3-006 | Submit iOS app for review | Human Chores | chore | S | HUMAN | 002, 003, 004 |
| S-R3-007 | Release Android to production | Human Chores | chore | XS | HUMAN | 003, 005 |
| S-R3-008 | Define city guide content schema | Growth | feature | S | 2 | S-R2-056 |
| S-R3-009 | Build city guide page template | Growth | feature | M | 2 | 008 |
| S-R3-010 | Author five seed city guides | Growth | docs | M | HUMAN | 009 |
| S-R3-011 | Add sitemap and social metadata | Growth | feature | S | 1 | 009 |
| S-R3-012 | Add referral codes and attribution | Growth | feature | M | 2 | S-R2-062 |
| S-R3-013 | Build invite screen | Growth | feature | S | 2 | 012 |
| S-R3-014 | Add onboarding email sequence | Growth | feature | M | 2 | S-R2-037 |
| S-R3-015 | Build metrics dashboards | Observability | chore | S | HUMAN | S-R1-085 |
| S-R3-016 | Execute launch sequence | Human Chores | chore | M | HUMAN | 006, 007, 010, 013, 015, 040 |
| S-R3-017 | Add percentage rollout flags | Operations | feature | S | 2 | S-R0-007 |
| S-R3-018 | Add experiment assignment and exposure | Operations | feature | S | 2 | 017 |
| S-R3-019 | Run first onboarding experiment | Growth | chore | S | HUMAN | 018 |
| S-R3-020 | Add AI response cache | AI Core | feature | S | 2 | S-R1-042 |
| S-R3-021 | Add global AI budget kill switch | AI Core | feature | S | 2 | S-R1-023 |
| S-R3-022 | Add Anthropic provider adapter | AI Core | feature | M | 3 | S-R1-042 |
| S-R3-023 | Run model bake-off with evals | AI Core | chore | S | HUMAN | 022, 024 |
| S-R3-024 | Add nightly live-model evals | Quality | test | S | 2 | S-R1-063 |
| S-R3-025 | Add cost and usage alerts | Operations | feature | S | 2 | 021, S-R2-031 |
| S-R3-026 | Write SQLite to Postgres copy script | Operations | infra | M | 3 | S-R2-025 |
| S-R3-027 | Rehearse Postgres migration | Operations | chore | M | HUMAN | 026 |
| S-R3-028 | Add load test baseline | Operations | test | S | 2 | S-R2-062 |
| S-R3-029 | Rehearse rung 1 upgrade | Operations | chore | S | HUMAN | 028 |
| S-R3-030 | Add language switcher and locale formats | Internationalisation | feature | S | 2 | S-R2-016 |
| S-R3-031 | Translate app to Spanish | Internationalisation | feature | M | 2 | 030 |
| S-R3-032 | Translate app to Simplified Chinese | Internationalisation | feature | M | 2 | 030 |
| S-R3-033 | Localise baseline plan templates | Internationalisation | feature | M | 2 | 030 |
| S-R3-034 | Add Arrival Pass fake door | Growth | feature | S | 2 | 018 |
| S-R3-035 | Add disclosed partner links | Growth | feature | S | 2 | 017 |
| S-R3-036 | Add mobile smoke tests | Quality | test | M | 3 | S-R2-054 |
| S-R3-037 | Add Lighthouse budget check | Quality | test | S | 2 | S-R2-002 |
| S-R3-038 | Add map view to places | Places | feature | M | 2 | S-R1-079 |
| S-R3-039 | Review launch metrics and decide | Human Chores | chore | S | HUMAN | 016 |
| S-R3-040 | Hold beta kill-or-continue review | Human Chores | chore | S | HUMAN | S-R2-062 |

### R4 — Expansion (each gated by a trigger in `14_PARKING_LOT.md`)

| ID | Title | Epic | Type | Size | Tier | Depends on |
|---|---|---|---|---|---|---|
| S-R4-001 | Add connectivity agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-002 | Add emergency plan agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-003 | Add budget planner agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-004 | Add transport routes agent slice | Expansion Agents | feature | M | 3 | S-R3-038 |
| S-R4-005 | Add grocery planner agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-006 | Add health navigation agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-007 | Add activities discovery agent slice | Expansion Agents | feature | M | 3 | S-R3-039 |
| S-R4-008 | Add routine coach agent slice | Expansion Agents | feature | M | 3 | S-R4-007 |
| S-R4-009 | Build Tauri desktop shell | Desktop Shell | infra | M | 3 | S-R3-039 |

---

## 5. Execution tracker

Written and updated by the executor agent through `docs/plan/tools/tracker.py` (see `docs/plan/EXECUTOR_PROMPT.md`).
Do not edit by hand unless you are the founder marking a human chore.

| Status | Meaning |
|---|---|
| `TODO` | Not started |
| `IN PROGRESS` | An executor is working on it (or died while doing so: resume it) |
| `DONE` | Every acceptance criterion was demonstrated and the story's commit exists |
| `DONE*` | Done locally; at least one acceptance criterion needs a human, an account or a deployment (see `docs/plan/EXECUTION_LOG.md`). Counts as satisfied for dependants |
| `WAITING HUMAN` | A person must act (HUMAN-tier story, or a human step named by the log). Founder sets `DONE` when finished |
| `BLOCKED` | Stopped on a stop condition or a failure the executor could not resolve; reason in the log |

Columns: story · title · executor tier (`1`, `2`, `3`, `HUMAN`) · size · dependencies · status · commit (short hash of the story's code commit) · PR (link of the pull request that carries it).


| ID | Title | Tier | Size | Depends on | Status | Commit | PR |
|---|---|---|---|---|---|---|---|
| S-R0-001 | Archive prototype under legacy | 1 | S | — | DONE | 1eadc09ea9 | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-002 | Initialise pnpm workspace root | 1 | S | S-R0-001 | DONE | bd5e8e5974 | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-003 | Add lint and format toolchain | 2 | S | S-R0-002 | DONE | ab87151cd2 | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-004 | Create domain package with date math | 1 | S | S-R0-002 | DONE | 3371d9acdb | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-005 | Create contracts package with error codes | 1 | S | S-R0-002 | DONE | f13f9afde0 | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-006 | Scaffold API Worker with health route | 2 | M | S-R0-004, S-R0-005 | DONE | b6461e98c6 | https://github.com/alpeshrpatel/student-life-journey/pull/2 |
| S-R0-007 | Add configuration module with flags | 1 | S | S-R0-006 | DONE | 262da8479b | — |
| S-R0-008 | Add error envelope and request IDs | 2 | S | S-R0-005, S-R0-006 | DONE | d5791fe532 | — |
| S-R0-009 | Add structured request logging | 1 | XS | S-R0-008 | DONE | 1519f77ad4 | — |
| S-R0-010 | Add D1 database with Drizzle | 2 | M | S-R0-006 | DONE | 7bf7320a06 | — |
| S-R0-011 | Create Google OAuth web client | HUMAN | S | — | WAITING HUMAN | — | — |
| S-R0-012 | Generate Better Auth schema migration | 2 | S | S-R0-010 | DONE | 3bcd997dab | — |
| S-R0-013 | Mount Better Auth with Google | 3 | M | S-R0-007, S-R0-011, S-R0-012 | TODO | — | — |
| S-R0-014 | Add session guard and me endpoint | 2 | S | S-R0-008, S-R0-013 | TODO | — | — |
| S-R0-015 | Add test-only session endpoint | 2 | S | S-R0-014 | TODO | — | — |
| S-R0-016 | Scaffold web app with Vite | 2 | M | S-R0-003 | DONE | 6444d9ff1f | — |
| S-R0-017 | Add Tide design tokens | 1 | S | S-R0-016 | TODO | — | — |
| S-R0-018 | Build Button and Tag primitives | 1 | S | S-R0-017 | TODO | — | — |
| S-R0-019 | Build Field and Input primitives | 1 | S | S-R0-017 | TODO | — | — |
| S-R0-020 | Add i18n scaffolding | 1 | S | S-R0-016 | TODO | — | — |
| S-R0-021 | Create typed API client package | 2 | S | S-R0-005, S-R0-016 | TODO | — | — |
| S-R0-022 | Add session provider and route guards | 2 | S | S-R0-014, S-R0-021 | TODO | — | — |
| S-R0-023 | Build sign-in screen | 1 | S | S-R0-018, S-R0-020, S-R0-022 | TODO | — | — |
| S-R0-024 | Add relocation profile table and repository | 2 | M | S-R0-012 | TODO | — | — |
| S-R0-025 | Add onboarding endpoint | 2 | M | S-R0-004, S-R0-014, S-R0-024 | TODO | — | — |
| S-R0-026 | Compute first priority in domain | 1 | S | S-R0-004 | TODO | — | — |
| S-R0-027 | Add dashboard endpoint | 2 | S | S-R0-025, S-R0-026 | TODO | — | — |
| S-R0-028 | Build app shell with navigation | 2 | M | S-R0-018, S-R0-022 | TODO | — | — |
| S-R0-029 | Build minimal onboarding wizard | 2 | M | S-R0-019, S-R0-022, S-R0-025 | TODO | — | — |
| S-R0-030 | Build dashboard hero with priority | 2 | S | S-R0-027, S-R0-028 | TODO | — | — |
| S-R0-031 | Add CI workflow | 2 | S | S-R0-006, S-R0-016 | TODO | — | — |
| S-R0-032 | Add dependency boundary checks | 2 | S | S-R0-031 | TODO | — | — |
| S-R0-033 | Add commit hooks and commit linting | 1 | XS | S-R0-003 | TODO | — | — |
| S-R0-034 | Add Playwright smoke journey | 3 | M | S-R0-015, S-R0-029, S-R0-030 | TODO | — | — |
| S-R0-035 | Add security headers and CSRF checks | 2 | S | S-R0-013 | TODO | — | — |
| S-R0-036 | Create Cloudflare account and databases | HUMAN | S | — | WAITING HUMAN | — | — |
| S-R0-037 | Configure preview and production environments | 2 | S | S-R0-010, S-R0-036 | TODO | — | — |
| S-R0-038 | Add deploy workflow | 3 | M | S-R0-031, S-R0-037 | TODO | — | — |
| S-R0-039 | Create Sentry project | HUMAN | XS | — | WAITING HUMAN | — | — |
| S-R0-040 | Add Sentry to API and web | 2 | S | S-R0-038, S-R0-039 | TODO | — | — |
| S-R0-041 | Write README and runbook index | 1 | S | S-R0-038 | TODO | — | — |
| S-R0-042 | Write deploy and rollback runbook | 2 | S | S-R0-038 | TODO | — | — |
| S-R0-043 | Measure Worker CPU for streaming | 3 | M | S-R0-038 | TODO | — | — |
| S-R0-044 | Prove Capacitor Google sign-in | 3 | M | S-R0-013, S-R0-038 | TODO | — | — |
| S-R0-045 | Verify production walking skeleton | HUMAN | S | S-R0-034, S-R0-035, S-R0-040, S-R0-042 | TODO | — | — |
| S-R0-046 | Mark legacy specs as superseded | 1 | XS | S-R0-041 | TODO | — | — |
| S-R0-047 | Prove Web Push from Worker | 3 | S | S-R0-038 | TODO | — | — |
| S-R1-001 | Add Money value object | 1 | S | S-R0-004 | TODO | — | — |
| S-R1-002 | Port housing cost calculators | 1 | S | S-R1-001 | TODO | — | — |
| S-R1-003 | Add affordability verdict rules | 2 | S | S-R1-002 | TODO | — | — |
| S-R1-004 | Add listing risk checklist rules | 1 | XS | S-R1-003 | TODO | — | — |
| S-R1-005 | Define task and plan types | 1 | S | S-R0-004 | TODO | — | — |
| S-R1-006 | Implement journey phase state | 1 | S | S-R1-005 | TODO | — | — |
| S-R1-007 | Implement priority specifications | 2 | M | S-R1-005, S-R1-006 | TODO | — | — |
| S-R1-008 | Author baseline task templates | 2 | M | S-R1-005 | TODO | — | — |
| S-R1-009 | Implement baseline plan builder | 2 | M | S-R1-006, S-R1-008 | TODO | — | — |
| S-R1-010 | Add late-arrival plan rules | 1 | S | S-R1-009 | TODO | — | — |
| S-R1-011 | Implement plan reconciliation | 3 | M | S-R1-009 | TODO | — | — |
| S-R1-012 | Add task and plan tables | 2 | M | S-R1-005, S-R1-013 | TODO | — | — |
| S-R1-013 | Add atomic batch unit of work | 2 | S | S-R0-010 | TODO | — | — |
| S-R1-014 | Add outbox table and event bus | 2 | M | S-R1-013 | TODO | — | — |
| S-R1-015 | Add cron outbox dispatcher | 2 | S | S-R1-014 | TODO | — | — |
| S-R1-016 | Add idempotency middleware | 2 | S | S-R1-013 | TODO | — | — |
| S-R1-017 | Generate baseline plan at onboarding | 2 | M | S-R1-010, S-R1-011, S-R1-012, S-R1-014 | TODO | — | — |
| S-R1-018 | Add tasks API | 2 | M | S-R1-012, S-R1-016 | TODO | — | — |
| S-R1-019 | Add plan API | 2 | S | S-R1-017, S-R1-018 | TODO | — | — |
| S-R1-020 | Rank dashboard priorities | 2 | S | S-R1-007, S-R1-018 | TODO | — | — |
| S-R1-021 | Add relocation settings endpoint | 2 | S | S-R1-017 | TODO | — | — |
| S-R1-022 | Add profile preferences endpoint | 2 | S | S-R1-013 | TODO | — | — |
| S-R1-023 | Add usage counters and budgets | 2 | M | S-R1-013, S-R1-018, S-R1-019 | TODO | — | — |
| S-R1-024 | Add housing option table and API | 2 | M | S-R1-003, S-R1-004, S-R1-016, S-R1-022 | TODO | — | — |
| S-R1-025 | Add housing evaluate endpoint | 2 | S | S-R1-003, S-R1-004, S-R1-024 | TODO | — | — |
| S-R1-026 | Create Geoapify API key | HUMAN | XS | — | TODO | — | — |
| S-R1-027 | Add geocoding provider with cache | 2 | M | S-R1-013, S-R1-014, S-R1-017, S-R1-023, S-R1-026 | TODO | — | — |
| S-R1-028 | Add places provider with cache | 2 | M | S-R1-027 | TODO | — | — |
| S-R1-029 | Add essential places endpoint | 2 | S | S-R1-028 | TODO | — | — |
| S-R1-030 | Add saved places API | 2 | S | S-R1-029 | TODO | — | — |
| S-R1-031 | Add destination autocomplete endpoint | 2 | S | S-R1-023, S-R1-027 | TODO | — | — |
| S-R1-032 | Add age attestation and consent fields | 2 | S | S-R1-017, S-R1-022 | TODO | — | — |
| S-R1-033 | Create AI package with core interfaces | 2 | S | S-R0-004, S-R0-005 | TODO | — | — |
| S-R1-034 | Add fake provider for tests | 1 | XS | S-R1-033 | TODO | — | — |
| S-R1-035 | Implement SSE stream parser | 2 | S | S-R1-033 | TODO | — | — |
| S-R1-036 | Implement OpenAI-compatible adapter | 3 | M | S-R1-035 | TODO | — | — |
| S-R1-037 | Port heuristic provider | 2 | M | S-R1-009, S-R1-033, S-R1-044 | TODO | — | — |
| S-R1-038 | Add retry and timeout decorator | 2 | S | S-R1-034 | TODO | — | — |
| S-R1-039 | Add circuit breaker decorator | 2 | S | S-R1-034 | TODO | — | — |
| S-R1-040 | Add budget decorator | 2 | S | S-R1-023, S-R1-034, S-R1-036 | TODO | — | — |
| S-R1-041 | Add tracing decorator and call log | 2 | M | S-R1-013, S-R1-023, S-R1-034, S-R1-036 | TODO | — | — |
| S-R1-042 | Implement provider factory | 2 | S | S-R1-036, S-R1-037, S-R1-038, S-R1-039, S-R1-040, S-R1-041 | TODO | — | — |
| S-R1-043 | Add prompt registry | 2 | S | S-R1-033 | TODO | — | — |
| S-R1-044 | Define AI task schemas | 2 | S | S-R1-004, S-R1-005, S-R1-033 | TODO | — | — |
| S-R1-045 | Implement context builder with redaction | 2 | M | S-R1-012, S-R1-020, S-R1-024, S-R1-033 | TODO | — | — |
| S-R1-046 | Implement tool registry | 2 | S | S-R1-033, S-R1-045 | TODO | — | — |
| S-R1-047 | Register core deterministic tools | 2 | M | S-R1-020, S-R1-025, S-R1-029, S-R1-046 | TODO | — | — |
| S-R1-048 | Implement input guardrails | 2 | M | S-R1-033, S-R1-044, S-R1-045 | TODO | — | — |
| S-R1-049 | Implement output guardrails | 3 | M | S-R1-044, S-R1-048 | TODO | — | — |
| S-R1-050 | Implement intent router chain | 2 | M | S-R1-042, S-R1-043, S-R1-044 | TODO | — | — |
| S-R1-051 | Implement base agent template | 2 | S | S-R1-045, S-R1-046, S-R1-048, S-R1-049 | TODO | — | — |
| S-R1-052 | Implement planning agent | 3 | M | S-R1-043, S-R1-051 | TODO | — | — |
| S-R1-053 | Implement housing agent | 2 | M | S-R1-043, S-R1-051, S-R1-052 | TODO | — | — |
| S-R1-054 | Implement listing extraction | 3 | M | S-R1-043, S-R1-044, S-R1-048 | TODO | — | — |
| S-R1-055 | Implement concierge agent | 2 | M | S-R1-043, S-R1-051, S-R1-052 | TODO | — | — |
| S-R1-056 | Implement orchestrator | 3 | M | S-R1-050, S-R1-052, S-R1-053, S-R1-055 | TODO | — | — |
| S-R1-057 | Add conversation tables and memory | 2 | M | S-R1-013, S-R1-033, S-R1-055 | TODO | — | — |
| S-R1-058 | Add concierge streaming endpoint | 3 | M | S-R1-023, S-R1-047, S-R1-056, S-R1-057, S-R0-043 | TODO | — | — |
| S-R1-059 | Wire plan enhancement handler | 2 | M | S-R1-015, S-R1-017, S-R1-052, S-R1-058 | TODO | — | — |
| S-R1-060 | Wire housing explanation and extraction | 2 | S | S-R1-025, S-R1-053, S-R1-054, S-R1-058 | TODO | — | — |
| S-R1-061 | Configure Workers AI provider chain | 2 | S | S-R1-042, S-R1-058 | TODO | — | — |
| S-R1-062 | Build eval harness runner | 3 | M | S-R1-034, S-R1-054, S-R1-056 | TODO | — | — |
| S-R1-063 | Author safety golden set | 2 | M | S-R1-062 | TODO | — | — |
| S-R1-064 | Author quality golden set | 2 | S | S-R1-062 | TODO | — | — |
| S-R1-065 | Add query keys and config hook | 2 | S | S-R0-022, S-R0-030 | TODO | — | — |
| S-R1-066 | Build segmented control and chips | 1 | S | S-R0-018 | TODO | — | — |
| S-R1-067 | Build checkbox and task row | 1 | S | S-R0-018, S-R0-020 | TODO | — | — |
| S-R1-068 | Build toast and banner | 2 | S | S-R0-018 | TODO | — | — |
| S-R1-069 | Build state blocks | 1 | S | S-R0-018 | TODO | — | — |
| S-R1-070 | Build dialog primitive | 2 | S | S-R0-018 | TODO | — | — |
| S-R1-071 | Build full onboarding wizard | 2 | M | S-R1-031, S-R1-032, S-R1-065, S-R1-066, S-R1-068 | TODO | — | — |
| S-R1-072 | Build dashboard screen | 2 | M | S-R1-020, S-R1-065, S-R1-067, S-R1-068, S-R1-069 | TODO | — | — |
| S-R1-073 | Build tasks screen | 2 | M | S-R1-018, S-R1-065, S-R1-066, S-R1-067, S-R1-069, S-R1-072 | TODO | — | — |
| S-R1-074 | Build plan screen | 2 | M | S-R1-019, S-R1-059, S-R1-065, S-R1-066, S-R1-067, S-R1-069, S-R1-072 | TODO | — | — |
| S-R1-075 | Build housing evaluate form | 2 | M | S-R1-025, S-R1-065, S-R1-066, S-R1-068 | TODO | — | — |
| S-R1-076 | Build housing result panel | 2 | M | S-R1-060, S-R1-075 | TODO | — | — |
| S-R1-077 | Build paste listing flow | 2 | M | S-R1-060, S-R1-070, S-R1-075 | TODO | — | — |
| S-R1-078 | Build housing compare view | 2 | S | S-R1-024, S-R1-076 | TODO | — | — |
| S-R1-079 | Build places screen | 2 | M | S-R1-029, S-R1-030, S-R1-065, S-R1-066, S-R1-068, S-R1-069 | TODO | — | — |
| S-R1-080 | Build concierge screen | 3 | M | S-R1-058, S-R1-065, S-R1-068, S-R1-069 | TODO | — | — |
| S-R1-081 | Build settings screen | 2 | M | S-R1-021, S-R1-022, S-R1-065, S-R1-066, S-R1-068, S-R1-071 | TODO | — | — |
| S-R1-082 | Add legal pages and links | 2 | S | S-R0-023 | TODO | — | — |
| S-R1-083 | Create PostHog project | HUMAN | XS | — | TODO | — | — |
| S-R1-084 | Add analytics event pipeline | 2 | M | S-R1-013, S-R1-032, S-R1-083 | TODO | — | — |
| S-R1-085 | Instrument core funnel events | 2 | S | S-R1-017, S-R1-018, S-R1-024, S-R1-025, S-R1-029, S-R1-030, S-R1-058, S-R1-059, S-R1-060, S-R1-084 | TODO | — | — |
| S-R1-086 | Add client event endpoint and tracker | 2 | S | S-R1-065, S-R1-080, S-R1-084 | TODO | — | — |
| S-R1-087 | Publish OpenAPI document | 2 | S | S-R1-018, S-R1-019, S-R1-024, S-R1-029, S-R1-058 | TODO | — | — |
| S-R1-088 | Add API contract tests | 2 | M | S-R1-087 | TODO | — | — |
| S-R1-089 | Add core journey E2E | 3 | M | S-R1-071, S-R1-072, S-R1-073, S-R1-074, S-R1-076, S-R1-077, S-R1-078, S-R1-079, S-R1-080, S-R1-081 | TODO | — | — |
| S-R1-090 | Add accessibility checks to E2E | 2 | S | S-R1-089 | TODO | — | — |
| S-R1-091 | Add bundle size budget | 1 | S | S-R1-080 | TODO | — | — |
| S-R1-092 | Add dev seed script | 1 | S | S-R1-017, S-R1-024, S-R1-030 | TODO | — | — |
| S-R1-093 | Delete legacy prototype | 1 | XS | S-R1-002, S-R1-008, S-R1-011, S-R1-037, S-R1-050, S-R1-052, S-R1-053, S-R1-055, S-R1-056, S-R1-081, S-R1-092 | TODO | — | — |
| S-R1-094 | Create LLM provider key with cap | HUMAN | XS | S-R1-061, S-R1-063 | TODO | — | — |
| S-R1-095 | Run beta readiness review | HUMAN | S | S-R1-063, S-R1-082, S-R1-085, S-R1-086, S-R1-088, S-R1-090, S-R1-091, S-R1-093 | TODO | — | — |
| S-R2-001 | Add web app manifest and icons | 1 | S | S-R1-095 | TODO | — | — |
| S-R2-002 | Add service worker for app shell | 2 | M | S-R2-001 | TODO | — | — |
| S-R2-003 | Persist query cache to IndexedDB | 2 | S | S-R1-065, S-R1-095 | TODO | — | — |
| S-R2-004 | Add offline mutation outbox | 3 | M | S-R2-003, S-R1-016 | TODO | — | — |
| S-R2-005 | Add offline indicator and states | 1 | S | S-R2-003, S-R2-004 | TODO | — | — |
| S-R2-006 | Add install prompt | 2 | S | S-R2-001, S-R2-002 | TODO | — | — |
| S-R2-007 | Run housing math offline | 2 | S | S-R2-003, S-R2-005 | TODO | — | — |
| S-R2-008 | Verify desktop PWA install | HUMAN | S | S-R2-002, S-R2-004, S-R2-005, S-R2-006, S-R2-007 | TODO | — | — |
| S-R2-009 | Implement readiness score in domain | 2 | S | S-R1-005, S-R1-095 | TODO | — | — |
| S-R2-010 | Add readiness to dashboard endpoint | 2 | S | S-R2-009 | TODO | — | — |
| S-R2-011 | Build readiness block and My Life grid | 2 | M | S-R2-010 | TODO | — | — |
| S-R2-012 | Add dark theme tokens | 2 | S | S-R0-017, S-R1-095 | TODO | — | — |
| S-R2-013 | Add theme switcher | 1 | XS | S-R2-012 | TODO | — | — |
| S-R2-014 | Run accessibility audit and fixes | 3 | M | S-R1-090 | TODO | — | — |
| S-R2-015 | Add reduced motion and zoom support | 2 | S | S-R2-014 | TODO | — | — |
| S-R2-016 | Add pseudo-locale and RTL smoke test | 2 | S | S-R0-020, S-R1-095 | TODO | — | — |
| S-R2-017 | Add onboarding timing metric | 1 | XS | S-R1-086 | TODO | — | — |
| S-R2-018 | Add data export endpoint | 2 | M | S-R1-095, S-R2-022 | TODO | — | — |
| S-R2-019 | Add account deletion endpoint | 3 | M | S-R2-018, S-R2-022 | TODO | — | — |
| S-R2-020 | Build privacy controls in settings | 2 | M | S-R2-018, S-R2-019, S-R1-070, S-R1-081 | TODO | — | — |
| S-R2-021 | Add retention purge job | 2 | S | S-R1-015, S-R1-095 | TODO | — | — |
| S-R2-022 | Add audit log | 2 | S | S-R1-013, S-R1-095 | TODO | — | — |
| S-R2-023 | Add analytics consent handling | 2 | S | S-R1-084, S-R1-086, S-R2-022 | TODO | — | — |
| S-R2-024 | Finalise privacy policy and terms | HUMAN | S | S-R1-082, S-R2-019, S-R2-021, S-R2-023 | TODO | — | — |
| S-R2-025 | Add scheduled database export backup | 2 | S | S-R0-038, S-R1-095 | TODO | — | — |
| S-R2-026 | Rehearse database restore | HUMAN | S | S-R2-025 | TODO | — | — |
| S-R2-027 | Run security review checklist | 3 | M | S-R2-019, S-R2-021, S-R2-022, S-R2-032, S-R2-038 | TODO | — | — |
| S-R2-028 | Buy domain and move DNS | HUMAN | S | — | TODO | — | — |
| S-R2-029 | Attach custom domains to Worker | 2 | S | S-R2-028 | TODO | — | — |
| S-R2-030 | Create Resend account and verify domain | HUMAN | XS | S-R2-028 | TODO | — | — |
| S-R2-031 | Add email sender adapter | 2 | S | S-R2-030 | TODO | — | — |
| S-R2-032 | Add magic link sign-in | 3 | M | S-R2-029, S-R2-031 | TODO | — | — |
| S-R2-033 | Add notification table and API | 2 | M | S-R1-013, S-R1-095 | TODO | — | — |
| S-R2-034 | Build notification centre | 2 | S | S-R2-033 | TODO | — | — |
| S-R2-035 | Add reminder rules in domain | 2 | S | S-R1-006, S-R1-010, S-R1-095 | TODO | — | — |
| S-R2-036 | Add reminder scheduler job | 2 | M | S-R2-033, S-R2-035 | TODO | — | — |
| S-R2-037 | Add email digest delivery | 2 | S | S-R2-031, S-R2-036 | TODO | — | — |
| S-R2-038 | Add web push subscription and delivery | 3 | M | S-R2-002, S-R2-036, S-R0-047 | TODO | — | — |
| S-R2-039 | Add notification preferences | 2 | S | S-R2-033, S-R2-037 | TODO | — | — |
| S-R2-040 | Enrol in Apple Developer Program | HUMAN | S | — | TODO | — | — |
| S-R2-041 | Register Google Play developer account | HUMAN | S | — | TODO | — | — |
| S-R2-042 | Create native OAuth clients | HUMAN | S | S-R2-040, S-R2-041 | TODO | — | — |
| S-R2-043 | Scaffold Capacitor project | 3 | M | S-R0-044 | TODO | — | — |
| S-R2-044 | Add shell API base URL and CORS | 2 | S | S-R2-029, S-R2-043 | TODO | — | — |
| S-R2-045 | Add bearer session storage for shells | 3 | M | S-R2-044 | TODO | — | — |
| S-R2-046 | Add native Google sign-in | 3 | M | S-R2-042, S-R2-045 | TODO | — | — |
| S-R2-047 | Add Sign in with Apple | 3 | M | S-R2-040, S-R2-042, S-R2-045 | TODO | — | — |
| S-R2-048 | Add deep links and app links | 3 | M | S-R2-029, S-R2-043 | TODO | — | — |
| S-R2-049 | Polish native chrome | 2 | S | S-R2-043 | TODO | — | — |
| S-R2-050 | Create Firebase project for FCM | HUMAN | XS | S-R2-040, S-R2-041 | TODO | — | — |
| S-R2-051 | Add native push registration | 3 | M | S-R2-038, S-R2-043, S-R2-048, S-R2-050 | TODO | — | — |
| S-R2-052 | Add FCM delivery channel | 3 | M | S-R2-036, S-R2-038, S-R2-050 | TODO | — | — |
| S-R2-053 | Add Sentry to mobile shell | 2 | XS | S-R2-043 | TODO | — | — |
| S-R2-054 | Ship Android internal test build | HUMAN | S | S-R2-041, S-R2-046, S-R2-049 | TODO | — | — |
| S-R2-055 | Ship iOS TestFlight build | HUMAN | S | S-R2-040, S-R2-047, S-R2-049 | TODO | — | — |
| S-R2-056 | Scaffold marketing site | 2 | M | S-R2-029 | TODO | — | — |
| S-R2-057 | Build landing page | 2 | M | S-R2-056 | TODO | — | — |
| S-R2-058 | Add waitlist endpoint and form | 2 | S | S-R2-056 | TODO | — | — |
| S-R2-059 | Add in-app feedback form | 2 | S | S-R1-081 | TODO | — | — |
| S-R2-060 | Add account linking in settings | 2 | S | S-R2-032, S-R2-047 | TODO | — | — |
| S-R2-061 | Set up beta programme | HUMAN | S | S-R2-057, S-R2-058, S-R2-059 | TODO | — | — |
| S-R2-062 | Run release readiness review | HUMAN | S | S-R2-008, S-R2-014, S-R2-020, S-R2-027, S-R2-039, S-R2-054, S-R2-055, S-R2-060, S-R2-061 | TODO | — | — |
| S-R3-001 | Write store listing copy | 2 | S | S-R2-062 | TODO | — | — |
| S-R3-002 | Produce store screenshots | 2 | S | S-R3-001 | TODO | — | — |
| S-R3-003 | Complete store privacy declarations | HUMAN | S | S-R2-024 | TODO | — | — |
| S-R3-004 | Add minimum version gate | 2 | S | S-R2-043 | TODO | — | — |
| S-R3-005 | Run Play closed test | HUMAN | S | S-R2-054 | TODO | — | — |
| S-R3-006 | Submit iOS app for review | HUMAN | S | S-R2-055, S-R3-001, S-R3-002, S-R3-003, S-R3-004 | TODO | — | — |
| S-R3-007 | Release Android to production | HUMAN | XS | S-R3-001, S-R3-002, S-R3-003, S-R3-004, S-R3-005 | TODO | — | — |
| S-R3-008 | Define city guide content schema | 2 | S | S-R2-056 | TODO | — | — |
| S-R3-009 | Build city guide page template | 2 | M | S-R3-008 | TODO | — | — |
| S-R3-010 | Author five seed city guides | HUMAN | M | S-R3-009 | TODO | — | — |
| S-R3-011 | Add sitemap and social metadata | 1 | S | S-R3-009 | TODO | — | — |
| S-R3-012 | Add referral codes and attribution | 2 | M | S-R2-062 | TODO | — | — |
| S-R3-013 | Build invite screen | 2 | S | S-R3-012 | TODO | — | — |
| S-R3-014 | Add onboarding email sequence | 2 | M | S-R2-037, S-R2-039 | TODO | — | — |
| S-R3-015 | Build metrics dashboards | HUMAN | S | S-R1-085 | TODO | — | — |
| S-R3-016 | Execute launch sequence | HUMAN | M | S-R3-006, S-R3-007, S-R3-010, S-R3-011, S-R3-013, S-R3-015, S-R3-021, S-R3-025, S-R3-029, S-R3-040 | TODO | — | — |
| S-R3-017 | Add percentage rollout flags | 2 | S | S-R0-007 | TODO | — | — |
| S-R3-018 | Add experiment assignment and exposure | 2 | S | S-R3-017 | TODO | — | — |
| S-R3-019 | Run first onboarding experiment | HUMAN | S | S-R3-018 | TODO | — | — |
| S-R3-020 | Add AI response cache | 2 | S | S-R1-042 | TODO | — | — |
| S-R3-021 | Add global AI budget kill switch | 2 | S | S-R1-023 | TODO | — | — |
| S-R3-022 | Add Anthropic provider adapter | 3 | M | S-R1-042 | TODO | — | — |
| S-R3-023 | Run model bake-off with evals | HUMAN | S | S-R3-022, S-R3-024 | TODO | — | — |
| S-R3-024 | Add nightly live-model evals | 2 | S | S-R1-063 | TODO | — | — |
| S-R3-025 | Add cost and usage alerts | 2 | S | S-R3-021, S-R2-031 | TODO | — | — |
| S-R3-026 | Write SQLite to Postgres copy script | 3 | M | S-R2-025 | TODO | — | — |
| S-R3-027 | Rehearse Postgres migration | HUMAN | M | S-R3-026 | TODO | — | — |
| S-R3-028 | Add load test baseline | 2 | S | S-R2-062 | TODO | — | — |
| S-R3-029 | Rehearse rung 1 upgrade | HUMAN | S | S-R3-028 | TODO | — | — |
| S-R3-030 | Add language switcher and locale formats | 2 | S | S-R2-016 | TODO | — | — |
| S-R3-031 | Translate app to Spanish | 2 | M | S-R3-030 | TODO | — | — |
| S-R3-032 | Translate app to Simplified Chinese | 2 | M | S-R3-030 | TODO | — | — |
| S-R3-033 | Localise baseline plan templates | 2 | M | S-R3-030 | TODO | — | — |
| S-R3-034 | Add Arrival Pass fake door | 2 | S | S-R3-018 | TODO | — | — |
| S-R3-035 | Add disclosed partner links | 2 | S | S-R3-017 | TODO | — | — |
| S-R3-036 | Add mobile smoke tests | 3 | M | S-R2-054 | TODO | — | — |
| S-R3-037 | Add Lighthouse budget check | 2 | S | S-R2-002 | TODO | — | — |
| S-R3-038 | Add map view to places | 2 | M | S-R1-079 | TODO | — | — |
| S-R3-039 | Review launch metrics and decide | HUMAN | S | S-R3-016 | TODO | — | — |
| S-R3-040 | Hold beta kill-or-continue review | HUMAN | S | S-R2-062 | TODO | — | — |
| S-R4-001 | Add connectivity agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-002 | Add emergency plan agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-003 | Add budget planner agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-004 | Add transport routes agent slice | 3 | M | S-R3-038 | TODO | — | — |
| S-R4-005 | Add grocery planner agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-006 | Add health navigation agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-007 | Add activities discovery agent slice | 3 | M | S-R3-039 | TODO | — | — |
| S-R4-008 | Add routine coach agent slice | 3 | M | S-R4-007 | TODO | — | — |
| S-R4-009 | Build Tauri desktop shell | 3 | M | S-R3-039 | TODO | — | — |
