# 09 — Test, QA and Observability (QA / Release Manager hat)

**TL;DR**
1. Assume every external dependency fails and every input is hostile; tests prove the product still behaves.
2. The pyramid is wide at the bottom: pure domain tests, then API integration tests on real D1 inside the Workers runtime, then a thin layer of Playwright journeys.
3. The database, the domain rules, the contracts and session checks are never mocked; paid third parties are always faked.
4. AI behaviour has its own gate: a golden safety set that must pass 100% on every pull request.
5. "Release-ready" is a checklist of measurable facts (section 9), not a feeling.

Decisions: ADR-0018, ADR-0020, ADR-0021, ADR-0022.

---

## 1. Test pyramid

```text
                      ▲  Manual: screen reader audit, device checks, store pre-flight (per release)
                     ╱ ╲
                    ╱E2E╲            Playwright: ~15 journeys + axe on 7 screens      (minutes)
                   ╱─────╲           Maestro: 3 Android smoke flows (R3)
                  ╱ Evals ╲          Golden set: ≥ 40 safety + ≥ 20 quality cases     (seconds)
                 ╱─────────╲
                ╱ Component ╲        Testing Library: every ui/ component, every screen state
               ╱─────────────╲
              ╱ API integration╲     Vitest in workerd + real D1: every route, every module
             ╱──────────────────╲    Contract tests: every response parsed by @slj/contracts
            ╱ Unit: domain, ai,  ╲   Pure functions, guardrails, router, decorators, parsers
           ╱  contracts, client   ╲                                                  (milliseconds)
          ╱────────────────────────╲
           Static: TypeScript strict · ESLint · dependency-cruiser · Prettier
```

## 2. Tools by layer

| Layer | Tool | Location | Runs in CI stage |
|---|---|---|---|
| Static | `tsc --noEmit`, ESLint 9, dependency-cruiser, Prettier | repo root | 2–5 |
| Domain unit | Vitest (node) | `packages/domain/src/**/*.test.ts` | 6 |
| Contracts | Vitest | `packages/contracts/src/**/*.test.ts` | 6 |
| API client | Vitest with a fake `fetch` | `packages/api-client/src/**/*.test.ts` | 6 |
| AI unit | Vitest with `FakeProvider` and in-memory ports | `packages/ai/src/**/*.test.ts` | 6 |
| AI evals | Vitest project `evals` | `packages/ai/evals` | 7 |
| API integration | Vitest + `@cloudflare/vitest-plugin` (real `workerd`, isolated D1 per test file) | `apps/api/test/*.test.ts` | 6 |
| API contract | Same | `apps/api/test/contract/*.test.ts` | 6 |
| Web component | Vitest (jsdom) + Testing Library + `user-event` | `apps/web/src/**/*.test.tsx` | 6 |
| Web end-to-end | Playwright (Chromium; WebKit added in R2) | `apps/web/e2e/*.spec.ts` | 10 |
| Accessibility | `@axe-core/playwright`; `eslint-plugin-jsx-a11y` | `apps/web/e2e/a11y.spec.ts` | 3, 10 |
| Bundle size | `size-limit` | `apps/web/package.json` | 9 |
| Performance | Lighthouse CI against the preview URL (R3) | `.github/workflows/ci.yml` | R3 |
| Mobile smoke | Maestro on an Android emulator (R3) | `apps/mobile/.maestro` | nightly, R3 |
| Security | `pnpm audit --prod --audit-level=high`; gitleaks | CI | 11 |

**Mobile end-to-end approach.** The shells contain the same web app that Playwright already covers, so mobile automation covers only what is different: launch, the native sign-in bridge (through a debug-only test-session deep link against the preview API), offline open, and a push tap. Android runs in Maestro on CI (Linux runners support emulators; macOS minutes are ten times dearer). iOS uses a 15-minute manual checklist per release candidate (`docs/runbooks/mobile-release-checklist.md`, created by S-R2-055).

## 3. What is mocked and what never is

| Never mocked | Why |
|---|---|
| D1 and Drizzle in API tests | Query behaviour, constraints and batch atomicity are where bugs hide |
| `@slj/domain` | It is the specification of money and priority |
| Zod contracts | The contract is the test |
| Session resolution (Better Auth tables) in API tests | Authorisation bugs are the costliest |
| The Workers runtime | Node-only code must fail in tests, not in production |
| Guardrails in orchestrator tests | They are the safety net under test |

| Always faked | Fake |
|---|---|
| LLM vendors | `FakeProvider` (scripted), `HeuristicProvider` |
| Geoapify | `FakePlacesProvider`, `FakeGeocodingProvider` returning fixed fixtures; adapters themselves are tested against recorded JSON fixtures |
| PostHog | `RecordingAnalyticsSink` (asserts events and forbids unknown properties) |
| Resend, Web Push, FCM (R2) | `RecordingChannel` |
| Google / Apple sign-in | Test-only session endpoint (S-R0-015); provider callbacks are covered by Better Auth's own tests and by one manual check per release |
| Clock and IDs | Injected `Clock` and `IdGenerator` |

Rule: a test that needs the network is a bug in the test.

## 4. Coverage targets, with reasons

Coverage is a floor that protects specific risks, not a score.

| Layer | Target | Enforced | Why this number |
|---|---|---|---|
| `packages/domain` | 95% lines and branches | Vitest thresholds | Pure code that decides money and priority; cheap to test fully; a missed branch is a wrong verdict |
| `packages/ai/src/guardrails`, `…/workflows`, `…/schemas` | 100% branches | Vitest thresholds on those folders | A missed branch is a safety hole |
| Rest of `packages/ai` | 85% lines | Vitest thresholds | Decorators and router have many small paths; adapters are network-shaped |
| `packages/contracts`, `packages/api-client` | Every schema has a valid and an invalid example; every client method has a success and an error test | Review + test naming convention | Line coverage is meaningless for schemas |
| `apps/api` routes | **Route checklist, not a percentage:** for every route — happy path, unauthenticated (401), invalid input (422), cross-user access (404), and query-count assertion | `apps/api/test/contract/route-checklist.test.ts` fails if a registered route lacks the five named tests | Authorisation and validation gaps do not show up in line coverage |
| `apps/api` services and repositories | 85% lines through integration tests | Reported; enforced once the Workers coverage provider is confirmed (V-38) | Realistic paths over synthetic unit tests |
| `apps/web/src/ui` | 90% lines; every variant and state in section 6 of `07_UX_DESIGN_SYSTEM.md` | Vitest thresholds | Components are reused everywhere |
| `apps/web/src/screens` | **State checklist:** each screen has tests for loading, populated, empty, error (and offline from R2) | Naming convention checked by a small script in CI | Missing states are the most common UI defect |
| End-to-end | The 13 acceptance criteria of spec §25, each mapped to a named test | S-R1-089 | They define "MVP done" |

## 5. Test data and fixtures

- Builders, not shared seed files: `aUser()`, `aRelocationProfile({ arrivalInDays: 12 })`, `aTask({ priority: "CRITICAL" })`, `aHousingOption()` in `apps/api/test/helpers/db.ts`; `aUserContext()` in `packages/ai/src/test-support.ts`.
- Canonical personas as fixtures (from `02_PRODUCT_STRATEGY.md` §1): `alexSearching` (the design's demo: Chicago → Phoenix, 12 days, 15:40, $2,400 / $1,250), `lenaLateArrival` (secured, 23:40), `mayaNoBudget` (housing budget missing).
- Time is fixed: tests use `fixedClock("2026-11-04T16:00:00Z")` unless the test is about time.
- Money examples always include a non-USD currency (`EUR`, `INR`) and an amount that would break floats (`0.1 + 0.2` style).
- Adversarial strings are shared from `packages/ai/src/test-support.ts`: injection phrases, 6,001-character pastes, emails and card-like numbers, right-to-left text, emoji.
- Recorded provider responses (Geoapify, OpenAI-compatible streams) live in `__fixtures__` folders next to the adapter tests and contain no real personal data.
- No test depends on another test's rows; D1 storage is isolated per file and each test creates what it needs.

## 6. Accessibility, security and performance checks in CI

| Check | Tool | Threshold | Since |
|---|---|---|---|
| Accessible markup | `eslint-plugin-jsx-a11y` | No errors | S-R0-003 |
| Rendered accessibility | axe via Playwright on sign-in, onboarding, dashboard, plan, tasks, housing, places, concierge, settings | Zero `serious` or `critical` violations | S-R1-090 |
| Keyboard journey | Playwright test completing onboarding and one task with the keyboard only | Passes | S-R1-090 |
| Zoom and reflow | Playwright at 320 px width and 200% text size | No horizontal scroll, no clipped controls | S-R2-015 |
| Secrets | gitleaks | No findings | S-R0-031 |
| Dependencies | `pnpm audit --prod --audit-level=high` | No high or critical advisories without a dated waiver in the PR | S-R0-031 |
| Authorisation | Cross-user tests in the route checklist | All pass | S-R1-088 |
| Security headers | Integration test asserting the CSP and header set | Exact match | S-R0-035 |
| Production guard | Test asserting `/api/test/*` returns 404 when `ENVIRONMENT` is `production` | Passes | S-R0-015 |
| Bundle budget | `size-limit` | Initial JS ≤ 200 kB gzip; CSS ≤ 30 kB gzip | S-R1-091 |
| Web vitals | Lighthouse CI (mobile profile) | Performance ≥ 85, Accessibility ≥ 95, LCP ≤ 2.5 s | S-R3-037 |
| Worker CPU | Spike measurements; Cloudflare metrics reviewed weekly | p99 ≤ 8 ms on Free | S-R0-043 |
| Query budget | `countQueries()` | ≤ 8 database calls per request | S-R0-010 onward |
| AI safety | Golden safety set | 100% | S-R1-063 |

## 7. Observability

### 7.1 Structured logs

One JSON line per request and per job (`apps/api/src/shared/logger.ts`):

```json
{ "level": "info", "event": "request", "requestId": "b0c1…", "method": "PATCH", "route": "/api/v1/tasks/:id",
  "status": 200, "durationMs": 41, "dbCalls": 2, "userRef": "9f2a…", "clientVersion": "0.4.1", "platform": "pwa" }
```

Other events: `job` (outbox handler result), `ai` (one per provider attempt, mirroring `ai_call`), `limit` (a counter hit its limit), `ops_digest` (daily numbers). Bodies, emails, tokens and message text are never logged (`04` §6). Logs go to Workers Logs (3-day retention on Free).

### 7.2 Error tracking

Sentry per ADR-0021: unhandled exceptions, `AppError` ≥ 500, failed outbox events; `requestId` on every event; no personal data.

### 7.3 Metrics without a metrics product

At rungs 0–1 the numbers come from three places: Cloudflare's dashboards (requests, CPU, errors, D1 reads and writes), our own tables (`usage_counter`, `ai_call`, `outbox_event`), and PostHog (product funnels). The daily maintenance cron logs an `ops_digest` line; S-R3-025 turns threshold breaches into an email.

### 7.4 Product analytics

Typed events through the first-party pipeline (ADR-0020); taxonomy in `02_PRODUCT_STRATEGY.md` §10. Dashboards (built in S-R3-015, drafted for the beta in S-R1-095): Activation funnel; Retention (D1, D7, D30 by arrival cohort); Feature use (housing, places, concierge); AI quality (helpful rate, fallback rate, guardrail rate); Concierge topics (R4 triggers).

## 8. AI-call tracing, dashboards and alerts

Every provider attempt writes one `ai_call` row (`05_AI_ARCHITECTURE.md` §17): task, tier, provider, prompt ID and version, tokens, cost, latency, outcome, fallback reason, guardrails fired, budget level. No prompt or reply text.

**Weekly review queries** (run against production with `wrangler d1 execute slj-prod --remote --command "<sql>"`):

```sql
-- Cost and volume by task, last 7 days
SELECT task, COUNT(*) AS calls, SUM(cost_micro_usd) / 1e6 AS usd, AVG(latency_ms) AS avg_ms
FROM ai_call WHERE created_at > (unixepoch() - 7 * 86400) * 1000 GROUP BY task;

-- Fallback and block rates by provider
SELECT provider_id,
       SUM(outcome = 'ok') AS ok, SUM(outcome = 'fallback') AS fallback,
       SUM(outcome = 'blocked') AS blocked, SUM(outcome = 'error') AS error
FROM ai_call WHERE created_at > (unixepoch() - 7 * 86400) * 1000 GROUP BY provider_id;

-- Users who hit a limit today
SELECT key, COUNT(*) FROM usage_counter
WHERE period = date('now') AND subject != 'global'
  AND ((key = 'concierge_msgs' AND value >= 40) OR (key = 'ai_cost_micro_usd' AND value >= 30000))
GROUP BY key;

-- Outbox health
SELECT status, COUNT(*), MIN(created_at) FROM outbox_event GROUP BY status;
```

**Alerts and thresholds**

| Signal | Threshold | Channel | Action |
|---|---|---|---|
| `/api/v1/health` | 2 consecutive failures (1-minute checks) | Sentry uptime → email | Check Cloudflare status; roll back the last deploy if it coincides |
| New Sentry issue in production | Any | Email | Triage within a day |
| Error burst | One issue > 20 events/hour | Email | Roll back or flag off |
| Outbox | `FAILED` > 0, or oldest `PENDING` > 10 minutes | `ops_digest`; email from R3 | Inspect `last_error`; re-queue |
| AI fallback rate | > 15% of calls over 24 h | `ops_digest`; email from R3 | Check provider status and breaker; switch chain |
| Guardrail block rate | > 5% of replies over 24 h | Same | Suspect a model or prompt regression; run live evals |
| AI cost | Day > 2× the 7-day average, or month ≥ 80% of `AI_MONTHLY_BUDGET_USD` | Same | Review tiers; the budget level moves to ECONOMY automatically |
| Requests | > 50,000/day on rung 0 | Cloudflare notification | Rung 0 → 1 runbook |
| D1 rows written | > 50,000/day on rung 0 | `ops_digest` | Same |
| Database size | > 350 MB on rung 0; > 7 GB on rung 2 | Monthly check | Rung runbooks |
| Geo credits | > 2,000/day | `ops_digest` | Review cache hit rate |
| Onboarding completion | < 50% over 3 days with ≥ 30 sign-ins | Weekly review | Check the newest release; run X-01 |

## 9. Definition of release-ready

A release may go to its users when every line is true and recorded in the release's readiness story (S-R0-045, S-R1-095, S-R2-062, S-R3-016).

1. Every story in the release is `DONE`, or explicitly moved below the cutline with a note on the board.
2. CI is green on `main` at the release commit: static checks, all tests, evals, build, size, end-to-end, security.
3. The release's exit criteria in `10_RELEASE_PLAN.md` are met, with evidence (test names, screenshots, query output).
4. No open Sentry issue of level `error` or above first seen in the last 48 hours.
5. The safety golden set passes 100%; if prompts or models changed, the live eval run was reviewed.
6. Migrations in the release were applied to preview first and are backward compatible with the previous release.
7. A rollback was rehearsed at least once on preview for this release (code rollback; from R2 also a database restore drill within the last 90 days).
8. Flags for new, risky features default to off in production and have an owner.
9. Privacy: new data fields are in the inventory (`06_DATA_AND_AUTH.md` §15.1), new events in the taxonomy, new subprocessors in the notice.
10. Accessibility: zero serious or critical automated violations; manual checks done for new screens.
11. Costs: the projected monthly bill for the next rung trigger is written on the board.
12. Comms: the release note and, where relevant, the store "What's new" text are written.
