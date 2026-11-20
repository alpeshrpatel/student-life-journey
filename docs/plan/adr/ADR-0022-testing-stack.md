# ADR-0022 — Testing stack

**TL;DR**
1. Vitest 4.1 is the single test runner for every package and app.
2. API integration tests run inside `workerd` against a real, isolated D1 database using `@cloudflare/vitest-plugin`.
3. UI component tests use Testing Library; end-to-end tests use Playwright with axe accessibility checks.
4. AI behaviour is tested by the eval harness of ADR-0018; mobile gets Maestro smoke flows in R3.
5. Reversal cost S; the database, the domain and the contracts are never mocked.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | QA, Tech Lead hats |
| Supersedes | Nothing: the prototype has no tests (spec-level intent in vision §55) |
| Related | ADR-0004, ADR-0018, `09_TEST_QA_OBSERVABILITY.md` |

## Decision drivers

1. Catches regressions before deploy (weight 3).
2. Fidelity to the production runtime and database (weight 3).
3. Weak-model familiarity (weight 2).
4. Speed (weight 1).
5. One runner across the repo (weight 1).

## Options

Scores 1–5; maximum weighted total 50.

| Option | Regressions | Fidelity | Weak-model | Speed | One runner | Total |
|---|---|---|---|---|---|---|
| A. No automated tests (do nothing) | 1 | 1 | 5 | 5 | 5 | 26 |
| **B. Vitest + Cloudflare Vitest plugin + Testing Library + Playwright** | 5 | 5 | 4 | 4 | 5 | **47** |
| C. Jest + Miniflare API + Cypress | 4 | 3 | 4 | 2 | 3 | 34 |
| D. Node test runner + API on the Node adapter + Playwright | 4 | 2 | 3 | 4 | 3 | 31 |

## Decision

| Layer | Tool | Where | What is real, what is fake |
|---|---|---|---|
| Domain unit | Vitest (node environment) | `packages/domain/src/**/*.test.ts` | Everything real; clock and ID generator injected |
| Contracts | Vitest | `packages/contracts/src/**/*.test.ts` | Schema round-trips with example payloads |
| AI unit | Vitest | `packages/ai/src/**/*.test.ts` | `FakeProvider`; tools backed by in-memory ports |
| AI evals | Vitest project `evals` | `packages/ai/evals` | Fake and heuristic providers on PRs (ADR-0018) |
| API integration | Vitest + `@cloudflare/vitest-plugin` (`cloudflareTest({ wrangler: { configPath } })`) | `apps/api/test/**/*.test.ts` | Real Worker code, real D1 (isolated per test file), real Better Auth tables; fakes for LLM, Geoapify, PostHog, email, push |
| API contract | Same | `apps/api/test/contract/*.test.ts` | Every route's responses parsed with `@slj/contracts`; OpenAPI document snapshot |
| Web component | Vitest (jsdom) + `@testing-library/react` | `apps/web/src/**/*.test.tsx` | `@slj/api-client` replaced by a typed fake; real components and tokens |
| Web end-to-end | `@playwright/test` + `@axe-core/playwright` | `apps/web/e2e/*.spec.ts` | Built SPA + `wrangler dev` + local D1; sign-in through the test-only session endpoint (S-R0-015); external services faked by environment configuration |
| Mobile smoke (R3) | Maestro | `apps/mobile/.maestro/*.yaml` | Android emulator against the preview API |
| Performance | `size-limit` (R1), Lighthouse CI (R3) | CI | — |
| Static | TypeScript strict, ESLint, dependency-cruiser, Prettier check | CI | — |

Rules:

1. **Never mocked:** D1, Drizzle, `@slj/domain`, Zod contracts, Better Auth session checks in integration tests.
2. **Always faked:** paid or rate-limited third parties (LLM vendors, Geoapify, PostHog, Resend, FCM). Fakes implement the same ports and live in `apps/api/test/helpers/fakes.ts`.
3. **Database setup in tests:** `apps/api/test/setup.ts` applies every file in `apps/api/migrations` to the test D1 by splitting on `--> statement-breakpoint` and running one `batch()`. This avoids depending on a helper API we could not confirm (V-20).
4. **Test auth:** `POST /api/test/session` exists only when `ENVIRONMENT` is `dev` or `test` and requires `TEST_SUPPORT_TOKEN`; the route module is not registered in `preview` or `production`.
5. **Determinism:** tests inject `Clock` and `IdGenerator`; no test reads the real time.
6. **Coverage targets** are per layer and justified in `09_TEST_QA_OBSERVABILITY.md` §4.

## Consequences

**Good:** the same engine and runtime in tests and production; one command (`pnpm test`); weak executors get fast, specific failures.

**Bad:** the Workers test plugin pins Vitest to 4.1 for the whole repo; Playwright adds a few minutes to CI.

**Neutral:** iOS has no automated UI test in this plan; it uses a manual checklist per release.

## Reversal cost

**S.**

## Flip trigger

Move to Vitest 5 when the Cloudflare plugin documents it as the recommended pairing. Add a device farm only if more than two escaped mobile bugs per release are device-specific.

## References

- `00_PROGRESS_LOG.md` §3.1 (Vitest integration), §3.5.
- Vision §55.
