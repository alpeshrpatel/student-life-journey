# ADR-0004 — ORM and migrations

**TL;DR**
1. Drizzle ORM (`drizzle-orm` 0.45.x, SQLite dialect) replaces Prisma.
2. `drizzle-kit generate` writes plain SQL migration files into `apps/api/migrations`; `wrangler d1 migrations apply` runs them.
3. All database access goes through repository classes in `apps/api/src/infra/db/repositories`.
4. The only transaction primitive is an atomic statement batch, wrapped by `UnitOfWork` (S-R1-013).
5. Reversal cost M; runner-up is Prisma, adopted only if we move to Postgres before 2,000 MAU.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect, Tech Lead hats |
| Supersedes | Spec §5.2 ("Prisma ORM") |
| Related | ADR-0003, ADR-0017, ADR-0022 |

## Context

ADR-0003 puts production on Cloudflare D1. D1 exposes prepared statements and an atomic `batch()`; it does not document interactive transactions. The free plan allows 50 queries per Worker invocation (a batch counts as one) and 100 bound parameters per statement. The prototype uses Prisma 6 with `prisma db push` and no migration files, and one of its queries is invalid (`include` and `select` together in `legacy/prototype/src/modules/users/profile-service.ts`).

## Decision drivers

1. First-class fit with Workers and D1, including atomic batches (weight 3).
2. Type safety end to end (weight 3).
3. Weak-model implementability: docs, familiarity, small API surface (weight 3).
4. Migrations as reviewable SQL files (weight 2).
5. Bundle and CPU footprint under the 10 ms CPU limit (weight 2).
6. Portability to Postgres (weight 2).
7. Maturity (weight 1).

## Options

Scores 1–5; maximum weighted total 80.

| Option | D1 fit | Types | Weak-model | SQL migrations | Footprint | Postgres port | Maturity | Total |
|---|---|---|---|---|---|---|---|---|
| A. Prisma 6/7 with the D1 adapter (do nothing) | 2 | 5 | 5 | 3 | 2 | 5 | 5 | 61 |
| **B. Drizzle ORM + drizzle-kit** | 5 | 4 | 4 | 5 | 5 | 3 | 3 | **68** |
| C. Kysely query builder | 4 | 4 | 3 | 3 | 5 | 4 | 4 | 61 |
| D. Raw D1 statements with hand-written types | 5 | 2 | 3 | 4 | 5 | 2 | 5 | 57 |
| E. TypeORM | 1 | 3 | 3 | 3 | 1 | 4 | 4 | 41 |

- **A** is the best-known ORM and makes an engine switch a one-line provider change. On D1 it needs driver adapters, a separate SQL-diff step for migrations, and it cannot give atomic multi-statement writes through its transaction API. It also ships a query engine that costs CPU and bundle weight.
- **C** is solid but leaves migrations and schema typing to us.
- **D** is the escape hatch that always works; it is used for the few statements Drizzle cannot express.

## Decision

Use **Drizzle ORM** with these rules.

1. **Schema** lives in `apps/api/src/infra/db/schema/*.ts`, one file per aggregate, using `sqliteTable` from `drizzle-orm/sqlite-core` and the portable-subset rules of ADR-0003. Column builders: `text({ enum: [...] })`, `text({ mode: "json" }).$type<T>()`, `integer({ mode: "timestamp_ms" })`, `integer({ mode: "boolean" })`.
2. **Client**: `drizzle(env.DB)` from `drizzle-orm/d1`, created once per request in the composition root (`apps/api/src/composition/container.ts`). One Drizzle instance per request; never two wrappers around the same binding.
3. **Migrations**: `pnpm --filter @slj/api db:generate` runs `drizzle-kit generate` with `out: "./migrations"`. Files are committed. Apply with `wrangler d1 migrations apply <DB> --local|--remote`. Drizzle Kit's own `migrate` and `push` commands are not used against D1. Migrations are forward-only; a bad migration is fixed by a new migration, and data is restored with D1 Time Travel.
4. **Repositories** (Repository pattern): one class per aggregate, implementing an interface declared in the owning module's `ports.ts`. Services never import `drizzle-orm`. Repositories return domain types, not row types.
5. **Transactions**: writes that must be atomic are collected into a `UnitOfWork` and executed with one `db.batch([...])`. Rules: no read-then-write inside a unit of work; use optimistic checks in `WHERE` clauses (for example `WHERE id = ? AND user_id = ? AND status = 'OPEN'`) and inspect affected rows.
6. **Query budget**: an endpoint may issue at most 8 database calls (batches count as one). The integration-test helper `countQueries()` asserts this for every route.
7. **Bulk inserts** are chunked so rows × columns ≤ 100 parameters, all chunks inside one batch.

Version policy: stay on the stable `latest` line (0.45.x ORM, 0.31.x Kit). Drizzle 1.0 is at release-candidate stage; upgrade in one dedicated story after it is tagged `latest`.

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Server-only layer; clients never see it. |
| (b) Offline? | Not applicable; see ADR-0014. |
| (c) Relational fit? | Yes; typed joins and relations are available but most reads are single-table by `user_id`. |
| (d) Switch cost in 12 months? | M. Rewrite `schema/*.ts` for `pg-core`, regenerate migrations, re-test repositories (about 10 classes). |
| (e) Weak-model reliability? | Good with pasted signatures. Risk: models reach for `db.transaction()`; a lint rule bans it (S-R1-013). |
| (f) Free through ~1,000 MAU? | Yes; it is a library. |

## Consequences

**Good:** SQL migrations a human can read; tiny runtime; batches map exactly to D1's atomic primitive; tests run on real D1.

**Bad:** pre-1.0 library, so minor releases can break; the documentation site already describes the 1.0 RC, which can mislead executors (stories pin versions and paste signatures); moving to Postgres means re-authoring the schema files.

**Neutral:** no generated client step; types come from the schema source.

## Reversal cost

**M.** Repository interfaces isolate the change to `apps/api/src/infra/db`.

## Flip trigger

- Move to **Prisma** if we adopt Postgres (ADR-0003 triggers) before 2,000 MAU and the repository layer is still under 12 classes: the port is then cheap and Prisma's migration tooling is stronger on Postgres.
- Move to **raw D1 statements** for a repository if a Drizzle upgrade breaks it twice in one quarter.

## Open verification

`drizzle-kit` 0.31.x is expected to write flat files (`migrations/0000_name.sql` plus a `meta/` folder), which Wrangler reads by default. This layout was not confirmed from the documentation on 2026-11-14 because the site documents the 1.0 RC layout (one folder per migration). S-R0-010 checks it; if the output is nested, set `migrations_pattern: "migrations/*/migration.sql"` in `wrangler.jsonc` (documented Wrangler key). Tracked as V-07 in `13_ASSUMPTIONS_RISKS.md`.

## References

- `00_PROGRESS_LOG.md` §3.1 (D1 limits and batch semantics), §3.5 (versions).
- https://orm.drizzle.team/docs/connect-cloudflare-d1 ; https://orm.drizzle.team/docs/column-types/sqlite ; https://developers.cloudflare.com/d1/reference/migrations/
