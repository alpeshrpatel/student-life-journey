# S-R0-006 — Scaffold API Worker with health route

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | infra |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-004, S-R0-005 |
| Blocks | S-R0-007, S-R0-008, S-R0-010, S-R0-031 |
| Executor tier | Tier-2 — first use of Wrangler, Hono and the Cloudflare Vitest plugin |
| Platforms | backend |
| Parallel-safe with | S-R0-003 |

## 1. Why
This is the first runnable piece of the new stack: a Hono app on the Workers runtime with one contract-checked route and a test that runs inside `workerd`.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0002-backend-runtime-and-framework.md`; `docs/plan/adr/ADR-0022-testing-stack.md`; `docs/plan/04_REPO_STRUCTURE_AND_CONVENTIONS.md` §1 (tree), §5 (layering).
- **Files to read first:** `packages/contracts/src/health.ts` (response schema).
- **Files to create:** `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/wrangler.jsonc`, `apps/api/vitest.config.ts`, `apps/api/src/index.ts`, `apps/api/src/app.ts`, `apps/api/src/http/routes/health.ts`, `apps/api/test/health.test.ts`, `apps/api/worker-configuration.d.ts` (generated).
- **Files to modify:** none.
- **Files you must NOT touch:** `packages/**`, `legacy/**`, root config.
- Env vars / config: `ENVIRONMENT`, `APP_BASE_URL`, `FLAGS` as plain `vars`.

## 3. Design notes
- Pattern: composition by function — `buildApp()` returns the Hono app; `index.ts` exports `{ fetch: app.fetch }`.
- `package.json`: name `@slj/api`; dependencies `hono@^4.13.18`, `@hono/zod-openapi@^1.6.3`, `zod@^4.6.7`, `@slj/contracts`, `@slj/domain` (`workspace:*`); devDependencies `wrangler@^4.162.0`, `@cloudflare/vitest-plugin@^1.8.2`, `vitest@^4.1.12`; scripts `dev: "wrangler dev"`, `build: "wrangler deploy --dry-run --outdir dist"`, `typecheck: "tsc --noEmit"`, `test: "vitest run"`, `types: "wrangler types"`.
- `wrangler.jsonc` (exact):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "slj",
  "main": "src/index.ts",
  "compatibility_date": "2026-11-01",
  "vars": { "ENVIRONMENT": "dev", "APP_BASE_URL": "http://localhost:5173", "FLAGS": "{}" }
}
```

- `vitest.config.ts` (shape verified 2026-11-14):

```ts
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
});
```

- Route (exact signatures):

```ts
// src/app.ts
import { OpenAPIHono } from "@hono/zod-openapi";
export type AppBindings = { Bindings: Env; Variables: Record<string, never> };
export function buildApp(): OpenAPIHono<AppBindings>;
// src/http/routes/health.ts
export function registerHealthRoutes(app: OpenAPIHono<AppBindings>): void;   // GET /api/v1/health
```

  Use `createRoute({ method: "get", path: "/api/v1/health", responses: { 200: { content: { "application/json": { schema: HealthResponseSchema } }, description: "ok" } } })` and `app.openapi(route, handler)`. `version` comes from `package.json` (`import pkg from "../../../package.json"`), `time` from `new Date().toISOString()`.
- Test shape: `import { exports } from "cloudflare:workers"; const res = await exports.default.fetch("http://example.com/api/v1/health");`.
- Edge cases: unknown path returns 404 (default Hono behaviour for now); `HEAD` is not required.

## 4. Steps
1. Create the package files; `pnpm install` → exit 0.
2. `pnpm --filter @slj/api types` → writes `worker-configuration.d.ts` containing `interface Env`.
3. Implement `app.ts`, `index.ts`, `health.ts` → `pnpm --filter @slj/api typecheck` 0 errors.
4. Write the test → `pnpm --filter @slj/api test` passes.
5. `pnpm --filter @slj/api dev` in one terminal, then `curl -s localhost:8787/api/v1/health` → JSON with `"status":"ok"`.
6. `pnpm --filter @slj/api build` → exit 0.
7. Commit: `feat(api): scaffold API Worker with health route (S-R0-006)`.

## 5. Acceptance criteria
- AC1: Given the Worker, when `GET /api/v1/health` is called, then the status is 200 and the body parses with `HealthResponseSchema`.
- AC2: Given the test suite, when run, then it executes inside the Workers runtime (the test imports from `cloudflare:workers`).
- AC3 (negative): Given `GET /api/v1/nope`, when called, then the status is 404.

## 6. Tests to write
`apps/api/test/health.test.ts`: "returns ok and matches the contract"; "unknown route is 404".

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm --filter @slj/api typecheck && pnpm --filter @slj/api build   # expected: pass
pnpm lint                                                                                          # expected: 0 errors
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `@cloudflare/vitest-plugin` does not export `cloudflareTest`, or tests cannot import `exports` from `cloudflare:workers`: stop, read https://developers.cloudflare.com/workers/testing/vitest-integration/ and report the current shape. Do not switch test runners.
- Wrangler requires a newer Node than 24: stop and report.

## 10. Rollback / undo note
Delete `apps/api`; `git revert`.

## 11. Out of scope
Environment validation (`S-R0-007`), error envelope (`S-R0-008`), database (`S-R0-010`), static assets (`S-R0-016`), deployment (`S-R0-037`, `S-R0-038`).
