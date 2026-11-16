# S-R0-034 — Add Playwright smoke journey

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Quality |
| Type | test |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-015, S-R0-029, S-R0-030 |
| Blocks | S-R0-045, S-R1-089 |
| Executor tier | Tier-3 — orchestrating build, Worker, database and browser in CI |
| Platforms | web, backend |
| Parallel-safe with | S-R0-035 to S-R0-042 |

## 1. Why
One browser test of the whole slice proves that the client, the Worker, auth and the database work together, on every pull request.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0022-testing-stack.md` (web end-to-end row, rule 4); `docs/plan/09_TEST_QA_OBSERVABILITY.md` §2.
- **Files to read first:** `apps/api/src/http/routes/test-support.ts`, `apps/api/wrangler.jsonc`, `apps/api/package.json`, `apps/web/package.json`, `.github/workflows/ci.yml`.
- **Files to create:** `apps/web/playwright.config.ts`, `apps/web/e2e/smoke.spec.ts`, `apps/web/e2e/helpers/session.ts`.
- **Files to modify:** `apps/web/package.json` (devDependency `@playwright/test@^1.65.1`; script `"e2e": "playwright test"`), root `package.json` (`"e2e": "pnpm --filter @slj/web e2e"`), `.github/workflows/ci.yml` (install Chromium and run `pnpm e2e` after build; upload `playwright-report` on failure), `apps/api/package.json` (script `"dev:e2e": "wrangler d1 migrations apply slj-local --local && wrangler dev --port 8787 --var ENVIRONMENT:test"`).
- **Files you must NOT touch:** application source.
- Env vars: `TEST_SUPPORT_TOKEN` (dev value `local-test-token`).

## 3. Design notes
- `playwright.config.ts`: `testDir: "./e2e"`, `use: { baseURL: "http://localhost:8787", trace: "retain-on-failure" }`, one project `chromium` at viewport 390 × 844, `webServer: { command: "pnpm --filter @slj/web build && pnpm --filter @slj/api dev:e2e", url: "http://localhost:8787/api/v1/health", reuseExistingServer: !process.env.CI, timeout: 120_000 }`. The browser talks to the Worker directly, which serves the built SPA (same origin, real cookies).
- `helpers/session.ts`: `export async function signIn(page: Page, email: string)` → `page.request.post("/api/test/session", { headers: { "x-test-support-token": process.env.TEST_SUPPORT_TOKEN ?? "local-test-token" }, data: { email, name: "Alex Rivera" } })`; cookies land in the page's context automatically.
- Each test uses a unique email (`e2e+${Date.now()}@example.com`) so runs do not collide in the local database.
- Journey: sign in through the helper → `goto("/")` → redirected to `/onboarding` → fill step 1 (Chicago, Phoenix, a date 12 days ahead computed in the test, time 15:40) → Continue → fill step 2 (2400, Still searching, 1250) → Show my plan → URL is `/dashboard` → heading matches `/1[12] days until you land in Phoenix/` → the text "Find housing" and "Critical" are visible → reload → still on the dashboard.
- Second test: unauthenticated visit to `/dashboard` lands on `/signin` and shows "Continue with Google".
- Edge cases: the day count may be 11 or 12 depending on UTC time of the run (regex above allows both); first run needs migrations applied (done by `dev:e2e`).

## 4. Steps
1. Add Playwright; `pnpm --filter @slj/web exec playwright install chromium`.
2. Write config, helper and the two tests → `pnpm e2e` passes locally.
3. Add the CI steps → pull request shows the job passing.
4. Commit: `test(web): add Playwright smoke journey (S-R0-034)`.

## 5. Acceptance criteria
- AC1: Given a clean checkout, when running `pnpm e2e`, then both tests pass without any manually started server.
- AC2: Given CI, when a pull request runs, then the end-to-end step passes and takes under 5 minutes.
- AC3 (negative): Given the dashboard endpoint is made to return 500 (temporary local change), when the journey runs, then it fails at the heading assertion. Revert the change.

## 6. Tests to write
`apps/web/e2e/smoke.spec.ts`: "new mover reaches a personalised dashboard"; "signed-out visitor is sent to sign-in".

## 7. Verification commands
```bash
pnpm e2e                    # expected: 2 passed
gh pr checks                # expected: verify ✓ including the e2e step
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `wrangler dev --var` does not override `ENVIRONMENT` in the installed version: stop and report; an alternative is a `.dev.vars.e2e` file selected by Wrangler's environment mechanism — do not enable test routes in other environments.
- The test needs `waitForTimeout` to pass: stop; find the missing awaited condition instead.

## 10. Rollback / undo note
Remove the CI step and the `e2e` folder; `git revert`.

## 11. Out of scope
Accessibility checks (`S-R1-090`); the full journey (`S-R1-089`); WebKit and offline tests (R2).
