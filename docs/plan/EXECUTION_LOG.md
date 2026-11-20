# Execution log

**TL;DR**
1. This is the record of what the executor agent actually did, story by story: commit hashes, verification, acceptance-criteria evidence, deviations, PR links.
2. Status marks live in the tracker (`00_PROGRESS_LOG.md` §5); this file holds the detail.
3. The agent appends here after every story and edits nothing else in `docs/plan/` besides the tracker.
4. "Human actions queue" is your to-do list; "Plan issues found" is feedback for the planner.
5. Format and rules: `docs/plan/EXECUTOR_PROMPT.md` sections E8 and G.

---

## Human actions queue

<!-- The agent adds one line per human story or human step:
- [ ] S-R0-036 — Create Cloudflare account and databases — read docs/plan/stories/R0/S-R0-036-….md — unblocks: S-R0-037, …
When you finish one: tick the box, and for a HUMAN-tier story run `python3 docs/plan/tools/tracker.py set <id> DONE`. -->

- [ ] S-R0-011 — Create Google OAuth web client — read docs/plan/stories/R0/S-R0-011-create-google-oauth-web-client.md — unblocks: S-R0-013
- [ ] S-R0-036 — Create Cloudflare account and databases — read docs/plan/stories/R0/S-R0-036-create-cloudflare-account-and-databases.md — unblocks: S-R0-037
- [ ] S-R0-039 — Create Sentry project — read docs/plan/stories/R0/S-R0-039-create-sentry-project.md — unblocks: S-R0-040
- [ ] S-R0-031 (step 3) — In GitHub: protect `main`, require the `verify` check; replace `FOUNDER_GITHUB_HANDLE` in `.github/CODEOWNERS` with your GitHub username — unblocks: nothing (safety gate for merges)

## Plan issues found

<!-- One line each: story id — what is wrong — suggested fix. The agent never edits the plan; the planner reads this list. -->

- S-R0-002 — pnpm 12 ignores `engine-strict` in `.npmrc`, so the Node 20/22 install does not fail (AC3) — add `engineStrict: true` to the `pnpm-workspace.yaml` content in the story (applied by the executor)
- S-R0-003 — `pnpm format:check` fails on `docs/**` (288 markdown files) but the story forbids touching `docs/**` and its `.prettierignore` list omits it — add `docs/`, `.claude/` to the story's `.prettierignore` list (applied by the executor)
- S-R0-004 — `tsconfig.json` with `"include": ["src"]` leaves `vitest.config.ts` outside the TypeScript project, so `pnpm lint` fails with a parsing error — use `"include": ["src", "vitest.config.ts"]` here and in later package stories (applied by the executor)
- S-R0-006 — pnpm 12 blocks build scripts (`ERR_PNPM_IGNORED_BUILDS` for `esbuild`, `workerd`) and ESLint scans `.wrangler/` output — add `allowBuilds` to the workspace config and `**/.wrangler/**` to the ESLint ignores (applied by the executor); `AppBindings` must be an `interface` to pass `consistent-type-definitions`

---

## Batches

<!-- Newest batch last. Each batch starts with a heading of this exact shape, written when its first story starts:
## Batch 01 — R0 — branch `exec/batch-01-r0` — base `main` — PR: pending
The "PR: pending" part is replaced by the pull request link when the PR is opened. -->

## Batch 01 — R0 — branch `exec/batch-01-r0` — base `Architecture` — PR: https://github.com/alpeshrpatel/student-life-journey/pull/2

### S-R0-001 — Archive prototype under legacy
- **Result:** DONE
- **When:** 2026-11-20T20:56Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `1eadc09ea9` — `refactor(repo): archive prototype under legacy (S-R0-001)`
- **Size of change:** 104 files changed, 24 insertions(+), 3169 deletions(-); main areas: `legacy/prototype/`, `.gitignore`, `package-lock.json` (deleted)
- **What changed:**
  - Moved `src/`, `prisma/` and the Next.js config files (`package.json`, `next-env.d.ts`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`) to `legacy/prototype/` with `git mv` (99 renames, all R100, contents unchanged).
  - Deleted the tracked `.DS_Store`, `docs/.DS_Store` and `package-lock.json`.
  - Added `.gitignore` (exact content from the story) and `legacy/README.md`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `git ls-files src prisma next.config.mjs package-lock.json .DS_Store` | no output |
  | `test -f legacy/prototype/src/tools/calculator/housing-calculator.ts && echo ok` | ok |
  | `touch .DS_Store && git status --short .DS_Store` (before deleting the files from the index it showed the deletion only) | file ignored (`git check-ignore` matches `.gitignore:13`) |
  | secret scan on staged diff | `exit=1` (clean) |
  | `pnpm typecheck/lint/test` | not run: no workspace exists yet (S-R0-002/003) |
- **Acceptance criteria:** AC1 PASS — `git ls-files` for root `src`, `prisma`, `next.config.mjs`, `package-lock.json` prints nothing; root contains only `docs`, `legacy`, `.claude` and the two untracked founder files · AC2 PASS — `git diff --cached -M` reports `R100` for the calculator file at its new path · AC3 PASS — a freshly created `.DS_Store` is ignored (`git check-ignore -v` shows `.gitignore:13`)
- **Deviations:** (1) Worked on the batch branch `exec/batch-01-r0` instead of the story's `refactor/S-R0-001-archive-prototype` (the executor prompt wins on process). (2) Batch base is `Architecture` (the branch checked out at start; `main` does not yet contain the plan). (3) `docs/TechnicalArchitecture.docx` was already absent from the index, so nothing to stage for it. (4) Start-of-run check found two untracked founder files (`CLAUDE.md`, `PROGRESS_LOG.md`); the run continued because the founder's ARGS ask for `PROGRESS_LOG.md` to be maintained; they were never staged in story commits.
- **Follow-ups for the founder:** none

### S-R0-002 — Initialise pnpm workspace root
- **Result:** DONE
- **When:** 2026-11-20T21:00Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `bd5e8e5974` — `build(repo): initialise pnpm workspace root (S-R0-002)`
- **Size of change:** 10 files changed, 997 insertions(+); main areas: repo root config, `pnpm-lock.yaml`
- **What changed:**
  - Created `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.npmrc`, `mise.toml`, `.editorconfig`, `tsconfig.base.json`, `LICENSE`, `renovate.json` with the content given in the story.
  - Installed Node 24.22.3 and pnpm 12.18.0 locally through mise (the machine had Node 22) and ran `pnpm install`, which resolved TypeScript 6.0.3 and Vitest 4.1.12 and wrote `pnpm-lock.yaml`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `node -v` / `pnpm -v` (mise, Node 24) | v24.22.3 / 12.18.0 |
  | `pnpm install --frozen-lockfile` | exit 0 |
  | `pnpm exec tsc --version` | Version 6.0.3 |
  | `pnpm typecheck` / `pnpm test` | exit 0 ("No projects matched the filters", as expected) |
  | `pnpm install` under Node 22 in a clean copy | fails with `ERR_PNPM_UNSUPPORTED_ENGINE` |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — frozen-lockfile install exit 0 on Node 24.22.3 · AC2 PASS — typecheck and test exit 0 · AC3 PASS — Node 22 install fails with the engine error (after the deviation below)
- **Deviations:** pnpm 12 ignores `engine-strict` in `.npmrc`, so AC3 failed with only the specified files (Node 22 installed without error). Added `engineStrict: true` to `pnpm-workspace.yaml` (the tool's current option location). `.npmrc` still has the two specified lines.
- **Follow-ups for the founder:** your machine's default Node is 22.2.0; use `mise` (`mise install`) or `mise exec --` so Node 24.22.3 and pnpm 12.18.0 are active. Planner: story S-R0-002 should list `engineStrict: true` in `pnpm-workspace.yaml` (added under Plan issues).

### S-R0-003 — Add lint and format toolchain
- **Result:** DONE
- **When:** 2026-11-20T21:01Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `ab87151cd2` — `build(repo): add lint and format toolchain (S-R0-003)`
- **Size of change:** 5 files changed, 2398 insertions(+), 12 deletions(-); main areas: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `package.json`, `pnpm-lock.yaml`
- **What changed:**
  - Added ESLint 9.39.5 (flat config with the seven scoped blocks from the story), typescript-eslint 8.73.0, react / react-hooks / jsx-a11y plugins, Prettier 3.10.1 and `globals`.
  - Added scripts `lint`, `format`, `format:check`; added `.prettierrc.json` and `.prettierignore`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm lint` | exit 0 |
  | `pnpm format:check` | exit 0 |
  | `pnpm typecheck` / `pnpm test` | exit 0 |
  | `pnpm exec eslint --print-config apps/web/src/screens/x.tsx \| grep -c jsx-no-literals` | 1 |
  | temp `packages/tmp/src/x.ts` with `any` + `console.log` | `no-explicit-any` and `no-console` errors reported (plus 2 unsafe-* errors); file removed |
  | `eslint legacy/prototype/src/tools/calculator/housing-calculator.ts` | "File ignored because of a matching ignore pattern" |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — lint and format:check exit 0 · AC2 PASS — both `any` and `console.log` reported as errors · AC3 PASS — legacy file ignored
- **Deviations:** (1) `.prettierignore` also lists `docs/`, `.claude/`, `CLAUDE.md`, `PROGRESS_LOG.md`: otherwise `format:check` fails on 288 markdown files and the story forbids touching `docs/**`. (2) The temp file for the negative check needed a temporary `packages/tmp/tsconfig.json` because the type-aware parser requires the file to be in a tsconfig project (removed afterwards). (3) `@eslint/js` is not installed (not in the story's dependency list), so the ESLint core recommended set is not enabled; the typescript-eslint sets are. (4) React Hooks rules are taken from `reactHooks.configs.recommended.rules` (plugin v5 has no flat preset in this setup). (5) Installed `eslint@9.39.5` is flagged deprecated by npm (10.x exists) but is within the story's `^9` range.
- **Follow-ups for the founder:** none. Planner: S-R0-003 should add `docs/` and the root markdown files to `.prettierignore` (added under Plan issues).

### S-R0-004 — Create domain package with date math
- **Result:** DONE
- **When:** 2026-11-20T21:02Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `3371d9acdb` — `feat(domain): create domain package with date math (S-R0-004)`
- **Size of change:** 10 files changed, 211 insertions(+); main areas: `packages/domain/`, `pnpm-lock.yaml`
- **What changed:**
  - New package `@slj/domain` with the `Clock` and `IdGenerator` interfaces and the Zod schemas `IsoDateSchema`, `TimeOfDaySchema`, `HousingStatusSchema`, `TransportPrefSchema`.
  - `todayInTimeZone`, `daysBetween` and `daysUntilArrival` as specified (unknown or null zone falls back to UTC).
  - 18 unit tests in `src/time/dates.test.ts`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm --filter @slj/domain test` | 18 passed |
  | `pnpm typecheck` | exit 0 |
  | `pnpm lint` | exit 0 (domain purity rules active) |
  | `pnpm format:check` | exit 0 |
  | mutation: remove the `RangeError` catch | the invalid-zone test fails (restored afterwards) |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — test "uses the destination zone" returns 12 for Phoenix · AC2 PASS — test "returns the previous day in America/Phoenix" · AC3 PASS — test "falls back to UTC for an invalid zone and does not throw" (fails when the catch is removed)
- **Deviations:** `packages/domain/tsconfig.json` includes `vitest.config.ts` in addition to `src` (the story says `["src"]`); without it ESLint's type-aware parser fails on `vitest.config.ts` and `pnpm lint` exits 1.
- **Follow-ups for the founder:** none. Planner: the same tsconfig `include` fix applies to every later package story that adds a `vitest.config.ts` (added under Plan issues).

### S-R0-005 — Create contracts package with error codes
- **Result:** DONE
- **When:** 2026-11-20T21:03Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `f13f9afde0` — `feat(contracts): create contracts package with error codes (S-R0-005)`
- **Size of change:** 9 files changed, 158 insertions(+); main areas: `packages/contracts/`, `pnpm-lock.yaml`
- **What changed:**
  - New package `@slj/contracts` (depends on `@slj/domain` via `workspace:*` and `zod`).
  - `ErrorCodeSchema`, `ERROR_STATUS`, `ErrorEnvelopeSchema`, `MoneySchema`, `IsoInstantSchema`, `HealthResponseSchema` exactly as specified, re-exported from `src/index.ts`.
  - 7 unit tests in `src/contracts.test.ts`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm --filter @slj/contracts test` | 7 passed |
  | `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` | exit 0 (domain 18 + contracts 7 tests) |
  | mutation: money `.int()` removed and error `code` loosened to `z.string()` | both AC3 tests fail (restored afterwards) |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — two tests parse the health and envelope examples · AC2 PASS — test iterates `ErrorCodeSchema.options` and checks `ERROR_STATUS` · AC3 PASS — tests reject code `NOPE` and `amountMinor: 1.5`, and fail when the protection is removed
- **Deviations:** `packages/contracts/tsconfig.json` includes `vitest.config.ts` besides `src` (same reason as S-R0-004). `z.string().datetime()` exists in Zod 4 (marked deprecated in favour of `z.iso.datetime()`), used as the story says.
- **Follow-ups for the founder:** none

### S-R0-006 — Scaffold API Worker with health route
- **Result:** DONE
- **When:** 2026-11-20T21:05Z · **Tier / size:** 2 / M · **Branch:** `exec/batch-01-r0`
- **Code commit:** `b6461e98c6` — `feat(api): scaffold API Worker with health route (S-R0-006)`
- **Size of change:** 12 files changed, 17694 insertions(+), 10 deletions(-); main areas: `apps/api/`, `pnpm-workspace.yaml`, `eslint.config.js`, `pnpm-lock.yaml`
- **What changed:**
  - New package `@slj/api`: Hono + `@hono/zod-openapi` app (`buildApp()`), `GET /api/v1/health` validated against `HealthResponseSchema`, `wrangler.jsonc` as specified, generated `worker-configuration.d.ts`.
  - Tests run inside `workerd` through `@cloudflare/vitest-plugin` (`cloudflareTest`, `exports` from `cloudflare:workers`).
  - Allowed install scripts for `esbuild` and `workerd` in `pnpm-workspace.yaml` (`allowBuilds`); added `**/.wrangler/**` to the ESLint ignores.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm --filter @slj/api test` | 2 passed (in workerd) |
  | `pnpm typecheck` | exit 0 (3 packages) |
  | `pnpm lint` / `pnpm format:check` | exit 0 |
  | `pnpm test` | domain 18, contracts 7, api 2 passed |
  | `pnpm --filter @slj/api build` (`wrangler deploy --dry-run`, nothing deployed) | exit 0 |
  | `pnpm --filter @slj/api dev` + `curl localhost:8787/api/v1/health` | `{"status":"ok","version":"0.1.0","time":"..."}`; `/api/v1/nope` returns 404 |
  | secret scan on staged diff | `exit=1` (clean) |
- **Acceptance criteria:** AC1 PASS — test "returns ok and matches the contract" and the curl above · AC2 PASS — the test imports `exports` from `cloudflare:workers` and runs in workerd · AC3 PASS — test "unknown route is 404" and curl
- **Deviations:** (1) pnpm 12 blocks dependency build scripts, so `allowBuilds: {esbuild: true, workerd: true}` was added to the root `pnpm-workspace.yaml` (required for Wrangler's binaries; no other package allowed). (2) `**/.wrangler/**` added to the ESLint ignores in the root `eslint.config.js` (Wrangler writes generated files there; otherwise `pnpm lint` fails). (3) `AppBindings` is an `interface` instead of the story's `type` alias (the `consistent-type-definitions` rule from S-R0-003 rejects the alias; shape is identical). (4) `tsconfig.json` uses `"types": []` and includes `worker-configuration.d.ts`, `test` and `vitest.config.ts`. (5) Prettier formatted `wrangler.jsonc` (adds a trailing comma; Wrangler accepts it).
- **Follow-ups for the founder:** none. Planner: later stories that add dependencies with install scripts will need the same `allowBuilds` entries (added under Plan issues).

### S-R0-007 — Add configuration module with flags
- **Result:** DONE
- **When:** 2026-11-20T21:39Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `262da8479b` — `feat(api): add configuration module with flags (S-R0-007)`
- **Size of change:** 8 files changed, 325 insertions(+)
- **What changed:**
  - `apps/api/src/config/flags.ts`: `FLAG_DEFAULTS`, `parseFlags` (strict keys, defaults for missing).
  - `apps/api/src/config/env.ts`: `parseEnv` with the preview/production rules (secret length, Google credentials required, no `TEST_SUPPORT_TOKEN`) and the dev fallback secret.
  - `GET /api/v1/config` route and `ConfigResponseSchema` in `@slj/contracts`; `apps/api/.dev.vars.example` listing every secret from ADR-0024.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api 14 passed |
  | `pnpm typecheck / lint / format:check` | exit 0 |
  | `mise run dev + curl localhost:8787/api/v1/config` | seven flags with defaults, minClientVersion 0.0.0, legal 2026-11-beta |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — config route test + curl · AC2 PASS — `parseFlags` override test · AC3 PASS — production short secret and `TEST_SUPPORT_TOKEN` tests (error names the variable) · AC4 PASS — unknown flag key throws
- **Deviations:** `.dev.vars.example` lists every secret-kind name from ADR-0024 (not the plain vars), grouped with the story that first needs it. The route passes `{ ...c.env }` to `parseEnv` so the generated `Env` interface fits `Record<string, unknown>`.
- **Follow-ups for the founder:** none

### S-R0-008 — Add error envelope and request IDs
- **Result:** DONE
- **When:** 2026-11-20T21:41Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `d5791fe532` — `feat(api): add error envelope and request IDs (S-R0-008)`
- **Size of change:** 6 files changed, 266 insertions(+), 2 deletions(-)
- **What changed:**
  - `AppError` and eight subclasses in `apps/api/src/shared/errors.ts`, mapped to `ERROR_STATUS`.
  - `requestId` middleware (`cf-ray` or UUID, echoed as `x-request-id`), `toErrorResponse`, `onError` and `notFound` returning the contract envelope; unexpected errors become a generic 500 `INTERNAL`.
  - `validationHook` as `defaultHook` so Zod failures and malformed JSON return 422 `VALIDATION_FAILED` with `details.issues` as `{ path, message }`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api 22 passed |
  | `pnpm typecheck / lint / format:check` | exit 0 |
  | `curl -si localhost:8787/api/v1/nope (wrangler dev)` | `x-request-id` header and NOT_FOUND envelope with the same requestId |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — NotFoundError test (404, `Task not found`, requestId equals header) · AC2 PASS — generic 500, body lacks `secret detail` · AC3 PASS — unknown path parses with `ErrorEnvelopeSchema` · AC4 PASS — invalid body gives 422 with `issues[0].path = arrivalDate`
- **Deviations:** Hono hands only `Error` instances to `onError`, so the `requestId` middleware also catches thrown non-Error values and answers with the same generic 500 (the story lists this edge case). The malformed-JSON `HTTPException` (400) from the validator is mapped to `VALIDATION_FAILED` 422.
- **Follow-ups for the founder:** none

### S-R0-009 — Add structured request logging
- **Result:** DONE
- **When:** 2026-11-20T21:42Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `1519f77ad4` — `feat(api): add structured request logging (S-R0-009)`
- **Size of change:** 4 files changed, 193 insertions(+), 1 deletion(-)
- **What changed:**
  - `apps/api/src/shared/logger.ts`: `createLogger` with level threshold and the forbidden-field deny-list (adds `redacted: true`), `consoleLogger`, `createConsoleLogger`; the only file that uses `console`.
  - `apps/api/src/http/middleware/request-logger.ts`: one JSON line per request with `route` as the matched pattern, `status`, `durationMs`; level `error` for 5xx, `warn` for 429, else `info`; query strings never logged.
  - `buildApp(logger?)` installs the logger after `requestId`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api 29 passed |
  | `pnpm typecheck / lint / format:check` | exit 0 (no-console only allowed in logger.ts) |
  | `wrangler dev + GET /api/v1/health?token=abc` | one JSON line per request, route `/api/v1/health`, no query string |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — test and dev log show one `event: request` line with status 200 and numeric `durationMs` · AC2 PASS — `email` dropped, `redacted: true` · AC3 PASS — 500 logged at level `error`
- **Deviations:** `buildApp` takes an optional `logger` argument (default `consoleLogger`) so tests can capture lines; `requestLogger` is also exported as the default-wired middleware per the story. `durationMs` is 0 in the Workers runtime for fast requests (its clock only advances on I/O).
- **Follow-ups for the founder:** none

### S-R0-010 — Add D1 database with Drizzle
- **Result:** DONE
- **When:** 2026-11-20T21:44Z · **Tier / size:** 2 / M · **Branch:** `exec/batch-01-r0`
- **Code commit:** `7bf7320a06` — `feat(api): add D1 database with Drizzle (S-R0-010)`
- **Size of change:** 25 files changed, 1043 insertions(+), 32 deletions(-)
- **What changed:**
  - D1 binding `DB` (`slj-local`) in `wrangler.jsonc`; Drizzle (`drizzle-orm`, `drizzle-kit`), `drizzle.config.ts`, empty schema, `createDb`, scripts `db:generate` and `db:migrate:local`.
  - `countingD1` decorator (1 per `batch()`, 1 per statement executed outside a batch), `buildContainer` composition root, `systemClock`, `uuidGenerator`; the container is built per request in a middleware that adds `x-db-calls` only in `dev` and `test`.
  - Test setup: `applyMigrations` (glob of `migrations/*.sql`, split on `--> statement-breakpoint`, one `batch()`), `setupFiles`, `expectDbCalls`, a `req()` helper that passes real bindings; two isolation test files.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api 42 passed (real D1 in workerd) |
  | `pnpm typecheck / lint / format:check` | exit 0 |
  | `pnpm --filter @slj/api db:generate (empty schema)` | No schema changes, nothing to migrate |
  | `pnpm --filter @slj/api db:migrate:local` | No migrations to apply! (exit 0) |
  | `pnpm --filter @slj/api build` | exit 0 |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `SELECT 1 AS one` returns `{ one: 1 }` · AC2 PASS — a route with `db.batch` of three statements returns `x-db-calls: 1` · AC3 PASS — `isolation-a` and `isolation-b` each insert into the same table name and see only their own row · AC4 PASS — header absent for `production` and `preview` (valid hosted configs)
- **Deviations:** (1) `buildContainer` takes Hono's `ExecutionContext` type (the generated global type is generic and did not accept it) and does not use it yet. (2) Existing tests now call the app through `req()` in `test/helpers/request.ts`, because the new container middleware needs the real `Env`. (3) `$client` is not exposed on the typed `Db`, so the batch test uses `db.batch([db.run(sql...)])`. (4) `import.meta.glob` typing declared in `test/helpers/import-meta.d.ts`. (5) `drizzle.config.ts` added to the tsconfig `include`.
- **Follow-ups for the founder:** V-07 (flat `NNNN_name.sql` versus one folder per migration) cannot be observed with an empty schema; check it when S-R0-012 generates the first migration.

### S-R0-012 — Generate Better Auth schema migration
- **Result:** DONE
- **When:** 2026-11-20T21:46Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `3bcd997dab` — `feat(api): generate Better Auth schema migration (S-R0-012)`
- **Size of change:** 10 files changed, 950 insertions(+), 6 deletions(-)
- **What changed:**
  - Added `better-auth@^1.7.23`; generated `src/infra/db/schema/auth.ts` with the Better Auth CLI (`user`, `session`, `account`, `verification`) and exported it from the schema index.
  - Generated `migrations/0000_auth.sql` (4 `CREATE TABLE`, FK `ON DELETE cascade`, unique indexes on `user.email` and `session.token`) plus drizzle `meta/` snapshot.
  - `test/auth-schema.test.ts` runs against the migrated test database.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api 48 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `grep -c "CREATE TABLE" apps/api/migrations/0000_auth.sql` | 4 |
  | `pnpm --filter @slj/api db:migrate:local` | `0000_auth.sql` applied, 10 commands executed |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — four tables exist in `sqlite_master` · AC2 PASS — duplicate email fails with UNIQUE · AC3 PASS — session with a missing user fails with FOREIGN KEY · AC4 PASS — deleting a user leaves no sessions
- **Deviations:** (1) `better-auth.cli.ts` passes `{}` instead of `{} as never` (the lint rule `no-unnecessary-type-assertion` rejects the cast; the generator output is unchanged). (2) `better-auth.cli.ts` and `drizzle.config.ts` are in the tsconfig `include`. (3) `pnpm --filter @slj/api db:generate --name auth` (pnpm 12 forwards `--` to the script, so no `--` separator). (4) The generator was run with `pnpm dlx auth@latest` (Better Auth CLI 1.7.26, downloaded from npm, executed locally) and `auth.ts` was then formatted with Prettier. (5) Test rows use unique ids because storage is isolated per test file, not per test.
- **Follow-ups for the founder:** V-07 resolved: drizzle-kit writes flat `NNNN_name.sql` files (plus a `meta/` folder), so no `migrations_pattern` change is needed.

### S-R0-016 — Scaffold web app with Vite
- **Result:** DONE
- **When:** 2026-11-20T21:48Z · **Tier / size:** 2 / M · **Branch:** `exec/batch-01-r0`
- **Code commit:** `6444d9ff1f` — `feat(web): scaffold web app with Vite (S-R0-016)`
- **Size of change:** 17 files changed, 1170 insertions(+), 54 deletions(-)
- **What changed:**
  - New package `@slj/web`: Vite 8 + React 19, React Router 8 (`routes`, `router`), TanStack Query provider, Tailwind 4 plugin, jsdom + Testing Library test setup, placeholder screens (`home`, `notFound`).
  - `apps/api/wrangler.jsonc` serves `../web/dist` as an SPA (`not_found_handling: single-page-application`, `run_worker_first: ["/api/*"]`, binding `ASSETS`).
  - `apps/api/scripts/ensure-assets-dir.mjs` plus `predev`, `pretest`, `prebuild` hooks create a stub `index.html` when the web app is not built.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, web 2, api 48 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 (root build runs web build then API dry-run) |
  | `pnpm --filter @slj/api test with no apps/web/dist` | 48 passed; stub dist created |
  | `wrangler dev: curl /some/deep/link` | 1 match of `<div id="root">` |
  | `wrangler dev: curl /api/v1/health and /api/v1/nope` | JSON health; 404 envelope |
  | `vite dev: curl localhost:5173/ and /api/v1/health` | page served; health reached through the proxy |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — Vite serves the placeholder on 5173 and the proxy reaches `/api/v1/health` (curl; no browser opened) · AC2 PASS — Worker returns `index.html` for `/some/deep/link`, JSON for `/api/v1/health` · AC3 PASS — router test renders the not-found placeholder · AC4 PASS — API tests pass with `apps/web/dist` absent
- **Deviations:** Versions for packages the story gives only as a name were resolved to the current majors (`jsdom` ^27, `@testing-library/jest-dom` ^6, `@testing-library/user-event` ^14, `@types/react` and `@types/react-dom` ^19). `router.tsx` also exports `routes` so the test can use `createMemoryRouter`. The placeholder maps `titleKey` to temporary English text; no eslint-disable was needed. The placeholder was checked by HTTP and tests only; no real browser was opened.
- **Follow-ups for the founder:** The `mise run dev` task starts only the API; run `pnpm --filter @slj/web dev` in a second terminal for the web app (or use root `pnpm dev`).

### S-R0-017 — Add Tide design tokens
- **Result:** DONE
- **When:** 2026-11-20T21:51Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `131b4eac71` — `feat(web): add Tide design tokens (S-R0-017)`
- **Size of change:** 9 files changed, 210 insertions(+), 2 deletions(-)
- **What changed:**
  - `apps/web/src/styles/tokens.css` and `app.css` copied exactly from `07_UX_DESIGN_SYSTEM.md` §5 (Tide semantic colours, type scale, radii, shadows, dark overrides); Tailwind defaults for colour, radius and shadow are removed.
  - `main.tsx` imports `@fontsource-variable/archivo` (self-hosted) and `app.css`; the placeholder screen uses `bg-ground text-ink`, `text-screen font-extrabold` and a 2 px `border-rule`.
  - ESLint rule that rejects hex colour literals in `apps/web/src/**/*.{ts,tsx}` (string literals and template parts); test files are exempt.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, web 47, api 48 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `built CSS search` | `--color-ground`, `--color-accent`, `data-theme="dark"` present; `--color-red-500` count 0; `fonts.googleapis` count 0 |
  | `temporary `.tsx` with `"#ff0000"` and a template `#abc`` | lint exit 1, two `Use a design token utility instead of a hex colour` errors (file removed) |
  | `Chrome on `pnpm --filter @slj/web dev`` | html background `rgb(242, 245, 244)`, font family starts with "Archivo Variable", font loaded, h1 30px / 800 |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — built CSS check above · AC2 PASS — computed style read in a real browser · AC3 PASS — hex literal fails `pnpm lint`
- **Deviations:** (1) `tokens.css` and `app.css` are listed in `.prettierignore` so they stay byte-for-byte as pasted. (2) `tokens.test.ts` runs in the node environment (`// @vitest-environment node`) and reads the file with `fs`, because under jsdom `import.meta.url` is not a `file:` URL and `?raw` imports return an empty string. (3) The hex rule block is placed before the test-file block, which turns it off for tests (the token test legitimately contains hex strings).
- **Follow-ups for the founder:** none

### S-R0-018 — Build Button and Tag primitives
- **Result:** DONE
- **When:** 2026-11-20T21:52Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `93ce326ec1` — `feat(web): build Button and Tag primitives (S-R0-018)`
- **Size of change:** 8 files changed, 358 insertions(+), 1 deletion(-)
- **What changed:**
  - `lib/cn.ts` (`clsx` + `tailwind-merge`), extended so Tide `text-*` font-size tokens are not mistaken for colours.
  - `ui/button.tsx`: variants primary/secondary/ghost/icon, sizes md (44 px) and lg (48 px), `block`, `loading` + `loadingLabel` (keeps width, spinner), icon slots (`aria-hidden`), `type="button"` default; `variant="icon"` requires `aria-label` at type level.
  - `ui/tag.tsx`: tones accent, urgent, neutral, outline with token classes. Tests for both.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, web 71, api 48 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `block` test (type=button, `w-full justify-start text-start`) · AC2 PASS — loading test (disabled, `aria-disabled`, name equals `loadingLabel`) · AC3 PASS — disabled click test, `onClick` not called · AC4 PASS — tone class tests and a source scan that finds no hex colour
- **Deviations:** `cn` uses `extendTailwindMerge` (not plain `twMerge`) because plain `twMerge` dropped `text-eyebrow` and `text-control` when combined with a text colour; covered by `lib/cn.test.ts`. While loading, the label is hidden with `invisible` and `aria-hidden` so the accessible name is `loadingLabel`. `Loader2` is called `LoaderCircle` in the installed `lucide-react`.
- **Follow-ups for the founder:** none

### S-R0-019 — Build Field and Input primitives
- **Result:** DONE
- **When:** 2026-11-20T21:53Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `abc7775bd3` — `feat(web): build Field and Input primitives (S-R0-019)`
- **Size of change:** 4 files changed, 212 insertions(+)
- **What changed:**
  - `ui/field.tsx`: `Field` (label, hint, error with `role="alert"` and an icon, required marker as a visually hidden word) and `fieldDescribedBy`.
  - `ui/input.tsx`: 44 px `Input` with surface fill, control border, accent focus border, `invalid` state, non-interactive `prefix` (logical `ps-8` padding, `aria-hidden`) and hidden number spinners.
  - Tests for both (13 new).
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm --filter @slj/web test` | 84 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 (jsx-a11y satisfied, no disables) |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `getByLabelText("Moving to")` finds the input · AC2 PASS — alert contains the text and `aria-describedby` contains its id · AC3 PASS — no `aria-describedby` and no alert without hint or error · AC4 PASS — `$` rendered, input value is `1200`
- **Deviations:** The `required` word is a module constant (`REQUIRED_WORD`) so `react/jsx-no-literals` passes without a disable; it moves to i18n in S-R0-020. Number-spinner hiding uses Tailwind arbitrary variants in the component because `styles/**` must not be touched. `fieldDescribedBy` options accept `undefined` explicitly (needed with `exactOptionalPropertyTypes`).
- **Follow-ups for the founder:** none

### S-R0-020 — Add i18n scaffolding
- **Result:** DONE
- **When:** 2026-11-20T21:55Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `e68c439b6d` — `feat(web): add i18n scaffolding (S-R0-020)`
- **Size of change:** 13 files changed, 312 insertions(+), 13 deletions(-)
- **What changed:**
  - i18next + react-i18next set up in `src/i18n/index.ts` with English `common.json` and `errors.json` (one sentence per `ErrorCode`); imported in `main.tsx` and the test setup.
  - `lib/format.ts`: `formatMoney`, `formatDate`, `formatDistance`, `greetingKey`, `firstName`.
  - Placeholder screen and `Field` now take their text from `t()`; `@slj/contracts` added as a dependency of `@slj/web`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, web 107, api 48 passed |
  | `format tests under TZ=UTC, America/Los_Angeles, Pacific/Kiritimati, Asia/Kolkata` | 19 passed each |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — placeholder text comes from `common.json`, and `react/jsx-no-literals` passes for all of `apps/web/src` · AC2 PASS — `$1,250`, `$949.50`, `￥1,200` · AC3 PASS — `Mon, Nov 16` in four time zones · AC4 PASS — test iterates `ErrorCodeSchema.options`
- **Deviations:** (1) `lng` is `"en"` (the story's `navigator.language.startsWith("en") ? "en" : "en"` always gives `en`). (2) Added key `a11y.required` and switched `Field`'s hidden "required" word to it (replacing the S-R0-019 constant). (3) Greeting boundaries 5, 12 and 18 follow the prototype's `greetingForHour`. (4) `placeholder.home` is "Student Life Journey" and the not-found text changed to "We can't find that page.", so `router.test.tsx` was updated. (5) The error sentences and nav labels are the executor's wording in the tone-of-voice style (the story gives only two examples); the planner or founder may want to review the copy in `errors.json`.
- **Follow-ups for the founder:** Review the wording of `apps/web/src/i18n/locales/en/errors.json` (nine of the eleven sentences were written by the executor).

### S-R0-021 — Create typed API client package
- **Result:** BLOCKED (partial: `health()` and `config()` delivered; `me()` waits for S-R0-014)
- **When:** 2026-11-20T21:56Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `c72763466e` — `feat(client): create typed API client package (S-R0-021)`
- **Size of change:** 11 files changed, 345 insertions(+)
- **What changed:**
  - New package `@slj/api-client`: `createApiClient` with the generic `request()` (credentials, `Accept`, `X-Client-Version`, auth headers, `Idempotency-Key`, JSON body, abort signal), `ApiClientError` (`NETWORK`, `INVALID_RESPONSE` and every `ErrorCode`), and the typed methods `health()` and `config()`.
  - `apps/web/src/lib/api.ts` creates the shared `api` client; `VITE_API_BASE_URL` typed in `vite-env.d.ts`; `@slj/api-client` added to `@slj/web`.
  - 12 tests with a fake `fetch`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api-client 12, web 107, api 48 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `health()` returns the parsed body and sends `X-Client-Version` · AC2 PASS — 404 envelope gives `NOT_FOUND` with `requestId` · AC3 PASS — thrown `TypeError` gives `NETWORK`, status 0 · AC4 PASS — mismatching 200 body gives `INVALID_RESPONSE`
- **Deviations:** `me()` is not implemented because `packages/contracts/src/me.ts` does not exist yet (created by S-R0-014, which waits on S-R0-013 and the human story S-R0-011). Story section 9 says to deliver `health()` only and mark the story BLOCKED for the missing methods; `config()` was also delivered because `config.ts` exists since S-R0-007. No schema was redefined locally.
- **Follow-ups for the founder:** none for the founder; the executor must add `me()` to `packages/api-client/src/client.ts` once S-R0-014 is done, then run `python3 docs/plan/tools/tracker.py set S-R0-021 DONE --commit <hash>`.
- **Why blocked:** `MeResponse` contract (`packages/contracts/src/me.ts`) is missing.
- **Needed to unblock:** finish S-R0-011 (human), then S-R0-013 and S-R0-014; then add `me(): Promise<MeResponse>` using `MeResponseSchema` on `GET /api/v1/me` and a test, and mark S-R0-021 DONE. S-R0-022 depends on this story.

### S-R0-024 — Add relocation profile table and repository
- **Result:** DONE
- **When:** 2026-11-20T21:58Z · **Tier / size:** 2 / M · **Branch:** `exec/batch-01-r0`
- **Code commit:** `318bc24327` — `feat(api): add relocation profile table and repository (S-R0-024)`
- **Size of change:** 10 files changed, 849 insertions(+), 2 deletions(-)
- **What changed:**
  - `relocation_profile` table (`schema/relocation.ts`, pasted from `06_DATA_AND_AUTH.md` §2) and generated migration `0001_relocation_profile.sql` (one `CREATE TABLE`, FK cascade to `user`); auth schema and `0000_auth.sql` untouched.
  - `modules/relocation/ports.ts` (`RelocationProfile`, `RelocationProfileInput`, `RelocationRepository`) and `DrizzleRelocationRepository` (`findByUser`, single-statement `upsert` with `onConflictDoUpdate ... returning`, `createdAt` kept on update; epoch-ms numbers at the boundary).
  - `relocationRepo` added to the container; test builders `aUser()` and `aRelocationProfile()`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm test` | domain 18, contracts 7, api-client 12, web 107, api 56 passed |
  | `pnpm typecheck / lint / format:check / build` | exit 0 |
  | `grep -c "CREATE TABLE" apps/api/migrations/0001_relocation_profile.sql` | 1 |
  | `pnpm --filter @slj/api db:migrate:local` | `0001_relocation_profile.sql` applied |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `findByUser` returns null · AC2 PASS — one row, new destination, `createdAt` 1000 unchanged, `updatedAt` 5000 · AC3 PASS — prefs round-trip · AC4 PASS — upsert for a missing user rejects (FK) · AC5 PASS — null after deleting the user
- **Deviations:** `pnpm depcruise` does not exist yet (S-R0-032), so it was not run. The repository test also asserts that `upsert` costs exactly one database call. drizzle-kit did not touch the auth tables (stop condition not triggered).
- **Follow-ups for the founder:** none

### S-R0-026 — Compute first priority in domain
- **Result:** DONE
- **When:** 2026-11-20T21:59Z · **Tier / size:** 1 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `2158cf0b72` — `feat(domain): compute first priority (S-R0-026)`
- **Size of change:** 4 files changed, 176 insertions(+)
- **What changed:**
  - `packages/domain/src/tasks/types.ts`: `PrioritySchema` and `TaskCategorySchema`.
  - `packages/domain/src/priority/first-priority.ts`: `computeFirstPriority` implementing the five-row rule table (first match wins), with singular "1 day" and the arrive-today wording.
  - 8 tests (one per rule row, boundaries 0, 1, 14, 15, −1, singular case, destination with spaces); exports added to `index.ts`.
- **Verification:**
  | Command | Result |
  |---|---|
  | `pnpm --filter @slj/domain test` | 26 passed |
  | `pnpm typecheck / lint / format:check` | exit 0 (domain purity rules active) |
  | `pnpm test` | all packages pass |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — `SEARCHING`, 12, "Phoenix" gives `housing.find`, CRITICAL, reason contains "Phoenix" and "12 days" · AC2 PASS — 14 days gives `arrival.airport_transport`, 15 gives `housing.confirm_move_in` · AC3 PASS — −3 gives `places.find_essentials` · AC4 PASS — 1 day reads "1 day", not "1 days"
- **Deviations:** none
- **Follow-ups for the founder:** none

### S-R0-031 — Add CI workflow
- **Result:** DONE*
- **When:** 2026-11-20T22:01Z · **Tier / size:** 2 / S · **Branch:** `exec/batch-01-r0`
- **Code commit:** `dbc97ceb18` — `ci(repo): add CI workflow (S-R0-031)`
- **Size of change:** 3 files changed, 72 insertions(+)
- **What changed:**
  - `.github/workflows/ci.yml`: job `verify` on `ubuntu-latest` (checkout with full history, pnpm from `packageManager`, Node from `.node-version`): install (frozen), format, lint, typecheck, test (with `TEST_SUPPORT_TOKEN=ci-test-token`), build, `pnpm audit --prod --audit-level=high`, gitleaks; one comment line per stage added later (S-R0-032, S-R1-062, S-R1-091, S-R0-034 and S-R1-090).
  - `.github/pull_request_template.md` (Story, What changed, How verified, the five Definition-of-Done lines) and `.github/CODEOWNERS` with a placeholder handle.
- **Verification:**
  | Command | Result |
  |---|---|
  | `gh pr checks 2 (PR #2, after pushing the branch)` | `verify` pass in 1m5s |
  | `pnpm audit --prod --audit-level=high (local)` | No known vulnerabilities found |
  | `prettier --check .github` | pass |
  | `secret scan on staged diff` | clean |
- **Acceptance criteria:** AC1 PASS — the `verify` job ran every step on PR #2 and passed (workflow also contains the audit and gitleaks steps) · AC2 NOT RUNNABLE LOCALLY — needs a throwaway branch with a failing commit that is then deleted, and branch deletion is not allowed for the executor (the same failure is shown locally by `pnpm lint` on `any`, see S-R0-003) · AC3 NOT RUNNABLE LOCALLY — same reason (a fake `sk-` fixture on a throwaway branch); `gitleaks` is not installed locally
- **Deviations:** `CODEOWNERS` contains the placeholder `@FOUNDER_GITHUB_HANDLE` because the founder's GitHub handle is not known (story section 9). The repository owner is not necessarily the founder, so no handle was guessed.
- **Follow-ups for the founder:** HUMAN: replace the placeholder in `.github/CODEOWNERS`; protect `main` and require the `verify` check (executor has no admin rights); optionally run AC2 and AC3 on a throwaway branch.

