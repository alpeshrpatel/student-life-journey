# S-R0-010 — Add D1 database with Drizzle

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R0 |
| Epic | Platform Runtime |
| Type | infra |
| Size | M (≤half day) |
| Priority | P0 |
| Depends on | S-R0-006 |
| Blocks | S-R0-012, S-R0-037, S-R1-013 |
| Executor tier | Tier-2 — bindings, migrations tooling and test database setup |
| Platforms | backend |
| Parallel-safe with | S-R0-009, S-R0-016 |

## 1. Why
Every later feature stores data. This story adds the SQLite database binding, the migration workflow, the per-request composition root and a test setup that runs on real D1.

## 2. Context pack
- Relevant docs: `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md`; `docs/plan/adr/ADR-0004-orm-and-migrations.md`; `docs/plan/06_DATA_AND_AUTH.md` §4, §6.
- **Files to read first:** `apps/api/wrangler.jsonc`, `apps/api/vitest.config.ts`, `apps/api/src/app.ts`.
- **Files to create:** `apps/api/drizzle.config.ts`, `apps/api/src/infra/db/client.ts`, `apps/api/src/infra/db/schema/index.ts`, `apps/api/src/infra/db/counting-d1.ts`, `apps/api/src/composition/container.ts`, `apps/api/src/shared/clock.ts`, `apps/api/src/shared/ids.ts`, `apps/api/test/setup.ts`, `apps/api/test/helpers/db.ts`, `apps/api/test/db.test.ts`, `apps/api/migrations/.gitkeep`.
- **Files to modify:** `apps/api/wrangler.jsonc` (D1 binding), `apps/api/package.json` (dependencies and scripts), `apps/api/vitest.config.ts` (`test.setupFiles`), `apps/api/src/app.ts` (container middleware; `Variables` gains `container`).
- **Files you must NOT touch:** `packages/**`, `legacy/**`.
- Env vars / config: binding `DB`.

## 3. Design notes
- Patterns: Factory (composition root `buildContainer`), Decorator (counting wrapper around the D1 binding).
- Dependencies: `drizzle-orm@^0.45.4`; dev `drizzle-kit@^0.31.11`. Scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate:local": "wrangler d1 migrations apply slj-local --local"`.
- `wrangler.jsonc` addition: `"d1_databases": [{ "binding": "DB", "database_name": "slj-local", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }]`.
- `drizzle.config.ts`: `defineConfig({ dialect: "sqlite", schema: "./src/infra/db/schema/index.ts", out: "./migrations" })`.
- Public interface (exact):

```ts
// infra/db/client.ts
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
export type Db = DrizzleD1Database<typeof schema>;
export function createDb(d1: D1Database): Db;
// infra/db/counting-d1.ts
export function countingD1(d1: D1Database): { d1: D1Database; calls(): number };
// counts 1 per batch() and 1 per statement first()/run()/all()/raw() executed outside a batch
// shared/clock.ts, shared/ids.ts
export const systemClock: Clock;            // now() → Date.now()
export const uuidGenerator: IdGenerator;    // next() → crypto.randomUUID()
// composition/container.ts
export interface Container { env: AppEnv; db: Db; clock: Clock; ids: IdGenerator; dbCalls(): number }
export function buildContainer(rawEnv: Env, ctx: ExecutionContext): Container;
// test/helpers/db.ts
export async function applyMigrations(d1: D1Database): Promise<void>;
export function expectDbCalls(res: Response, max: number): void;   // reads header x-db-calls
```

- Container middleware in `app.ts`: build the container once per request, set `c.var.container`, and after the handler, when `ENVIRONMENT` is `dev` or `test`, set response header `x-db-calls` to `container.dbCalls()`.
- `test/setup.ts`: `beforeAll(() => applyMigrations(env.DB))`. `applyMigrations` loads SQL with `import.meta.glob("../../migrations/*.sql", { query: "?raw", import: "default", eager: true })`, sorts by file name, splits each file on `--> statement-breakpoint`, and executes all non-empty statements with one `d1.batch(statements.map((s) => d1.prepare(s)))`. With zero files it does nothing.
- Edge cases: no migration files yet; a migration file with a trailing breakpoint; `x-db-calls` must not appear in `preview` or `production`.

## 4. Steps
1. Add dependencies and scripts; `pnpm install`.
2. Add the D1 binding; `pnpm --filter @slj/api types` → `Env` now has `DB: D1Database`.
3. Implement `client.ts`, `counting-d1.ts`, `clock.ts`, `ids.ts`, `container.ts`; wire the middleware.
4. Implement `test/setup.ts` and `test/helpers/db.ts`; register `setupFiles`.
5. Write `db.test.ts` → `pnpm --filter @slj/api test` passes.
6. Run `pnpm --filter @slj/api db:generate` with the empty schema → reports nothing to generate (no error). Note the folder layout it would use (see §9).
7. Commit: `feat(api): add D1 database with Drizzle (S-R0-010)`.

## 5. Acceptance criteria
- AC1: Given the test runtime, when a test runs `env.DB.prepare("SELECT 1 AS one").first()`, then it returns `{ one: 1 }`.
- AC2: Given a route that performs one batch of three statements, when called in `test`, then `x-db-calls` is `1`.
- AC3: Given two test files, when each inserts into a temporary table, then neither sees the other's rows (storage is isolated per file).
- AC4 (negative): Given `ENVIRONMENT=production`, when any route is called, then no `x-db-calls` header is present.

## 6. Tests to write
`apps/api/test/db.test.ts`: AC1; counting wrapper counts a batch as one and two single statements as two; `applyMigrations` with an inline two-statement SQL string; header absent in production (build the container with a production env).

## 7. Verification commands
```bash
pnpm --filter @slj/api test && pnpm typecheck && pnpm lint        # expected: pass
pnpm --filter @slj/api db:migrate:local                          # expected: "No migrations to apply" (exit 0)
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- `import.meta.glob` with `?raw` does not work inside the Workers test runtime: stop and use the official example at https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-plugin-examples/d1 only after reporting (V-20).
- `drizzle-kit generate` writes one folder per migration instead of flat `NNNN_name.sql` files: stop and report; the fix is `"migrations_pattern": "migrations/*/migration.sql"` in `wrangler.jsonc` and the same glob in `applyMigrations` (V-07).

## 10. Rollback / undo note
`git revert`; delete `apps/api/.wrangler/` to drop the local database.

## 11. Out of scope
Any table (first tables arrive in S-R0-012 and S-R0-024); repositories; unit of work (`S-R1-013`); remote databases (`S-R0-037`).
