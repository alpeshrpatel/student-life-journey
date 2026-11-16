# ADR-0003 — Data model and database per environment

**TL;DR**
1. The data is relational and small; we keep a relational model.
2. SQLite is the engine in every environment at rungs 0–2: Cloudflare D1 in preview and production, a local D1 SQLite file in dev, an isolated D1 per test file in CI.
3. Postgres is adopted only when a numeric trigger fires; the runbook is in `06_DATA_AND_AUTH.md` §9.
4. The schema uses a portable subset (text enums, JSON text, integer money, integer timestamps) so the move is mechanical.
5. The on-device store is IndexedDB, not SQLite (ADR-0014). Reversal cost M.

| Field | Value |
|---|---|
| Status | Accepted (2026-11-14) |
| Deciders | Architect hat |
| Supersedes | Spec §5.2 and §14 ("PostgreSQL + Prisma"); vision §39 |
| Related | ADR-0004 (ORM), ADR-0009 (hosting), ADR-0014 (offline), ADR-0017 (outbox) |

## Context

The prototype declares PostgreSQL in `legacy/prototype/prisma/schema.prisma` with eight models and was only ever run with `prisma db push` (no migrations exist). Hard constraint 4 asks for SQLite where it genuinely fits and an explicit engine per environment. Hard constraint 2 asks for $0 at about 1,000 MAU.

Data shape: one user owns one relocation profile, 30–60 tasks, a handful of plan versions, up to 10 housing options, a few saved places and one conversation. Every query is scoped to one user. Joins are shallow (tasks by user and phase, plan with its tasks). There is no cross-user analytics in the product path. Estimated footprint is about 150 rows and 60 KB per active user, so 500 MB holds roughly 8,000 users and 10 GB roughly 160,000.

## Decision drivers

1. Same engine in dev, test and production (no "works on SQLite, breaks on Postgres") — weight 3.
2. $0 and no cold starts at rung 0 — weight 3.
3. Fit to the data shape — weight 2.
4. Managed durability and point-in-time recovery without ops — weight 3.
5. Weak-model implementability — weight 2.
6. Cost of the next migration — weight 2.

## Options

Scores 1–5; maximum weighted total 75.

| Option | Same engine | $0 / no cold start | Shape fit | Durability | Weak-model | Next migration | Total |
|---|---|---|---|---|---|---|---|
| A. Postgres everywhere, e.g. Neon Free (do nothing) | 4 | 3 | 5 | 4 | 4 | 5 | 61 |
| **B. SQLite everywhere on Cloudflare D1** | 5 | 5 | 5 | 4 | 4 | 3 | **66** |
| C. SQLite in dev and test, Postgres in production | 1 | 3 | 5 | 4 | 3 | 5 | 50 |
| D. SQLite on Turso (libSQL) | 5 | 4 | 5 | 4 | 4 | 3 | 63 |
| E. Document store (Firestore, DynamoDB, MongoDB Atlas) | 3 | 4 | 2 | 5 | 3 | 1 | 48 |
| F. Local-first sync engine (PowerSync, ElectricSQL, RxDB, Replicache) | 3 | 2 | 3 | 3 | 1 | 1 | 34 |

- **A** needs Docker or a cloud database for every test run, and the free Postgres hosts either suspend compute (Neon: after 5 minutes idle) or pause projects (Supabase: after one week of inactivity).
- **C** is the classic trap: the bugs appear only in production.
- **D** is the runner-up and the first fallback: same dialect, same Drizzle schema, driver swap only. It loses to D1 because D1 is bound to the Worker with no network hop or extra credential.
- **E** fits the per-user tree but makes "tasks across phases ordered by score" and data export awkward, and locks us to one vendor's query model.
- **F** solves a problem we do not have. Users edit their own data from one or two devices; conflicts are rare and last-write-wins on a task toggle is acceptable. Sync engines also need Postgres or a paid tier and are hard for weak models.

## Decision

**Relational schema on SQLite everywhere.**

| Environment | Engine | How it is created |
|---|---|---|
| Local dev | D1 local (SQLite file under `apps/api/.wrangler/`) | `pnpm --filter @slj/api db:migrate:local` |
| Unit tests (`packages/*`) | none (pure functions) | — |
| API integration tests | Isolated D1 per test file inside `workerd` | `@cloudflare/vitest-plugin`; migrations applied in `apps/api/test/setup.ts` |
| CI | Same as integration tests | GitHub Actions |
| Preview | D1 database `slj-preview` | `wrangler d1 migrations apply slj-preview --remote --env preview` |
| Production (rungs 0–2) | D1 database `slj-prod` | `wrangler d1 migrations apply slj-prod --remote --env production` |
| Production (rung 3+) | Postgres through Cloudflare Hyperdrive | Only after a trigger below; runbook in `06_DATA_AND_AUTH.md` §9 |
| On device | IndexedDB (query cache + outbox) | ADR-0014 |

### Portable-subset rules (binding for every migration)

| Concern | Rule | Postgres mapping later |
|---|---|---|
| IDs | `TEXT` primary keys generated in application code with `crypto.randomUUID()` | `text` (or `uuid`) |
| Enums | `TEXT` with a `CHECK (col IN (...))` constraint; values validated by Zod at the boundary | `text` + `CHECK` (no native enum) |
| Lists and small objects | `TEXT` holding JSON, validated by Zod; never filtered in SQL | `jsonb` |
| Money | `INTEGER` minor units + ISO 4217 code on the profile | `bigint` |
| Calendar dates | `TEXT` `YYYY-MM-DD` | `date` |
| Instants | `INTEGER` Unix epoch milliseconds | `timestamptz` |
| Booleans | `INTEGER` 0/1 | `boolean` |
| Ordering by priority or phase | Rank computed in code or stored as an integer column; never `ORDER BY` an enum-like text | same |
| Text search | Not used; no `LIKE` on user text | — |
| Transactions | Only atomic statement batches (ADR-0004); no read-then-write inside a transaction | Real transaction wrapping the same statements |
| Bulk inserts | Chunk so that rows × columns ≤ 100 bound parameters per statement (D1 limit) | Larger chunks allowed |

### Incompatibilities in the prototype schema and their fixes

| # | Prototype construct (`legacy/prototype/prisma/schema.prisma`) | Problem on SQLite | Fix |
|---|---|---|---|
| 1 | Five native `enum` types (`HousingStatus`, `Priority`, `PlanPhase`, `TaskStatus`, `MessageRole`) | No native enum | `TEXT` + `CHECK`; one Zod enum per type in `@slj/domain` |
| 2 | `String[]` on `transportation` and `interests` | No array type | `transport_prefs` as JSON text; `interests` dropped (not collected) |
| 3 | `Json` on four `LifePlan` columns | Stored as text; shape unvalidated | Plan steps become `task` rows; `plan` keeps `summary` only |
| 4 | `Float` for `monthlyBudget` and `HousingProfile.budget` | Rounding errors; no currency | `INTEGER` minor units + `profile.currency` |
| 5 | `DateTime arrivalDate` | Server time zone decides "days until arrival" | `arrival_date TEXT` + `destination_tz` |
| 6 | `orderBy: { priority: "desc" }` in `src/agents/shared/user-context.ts` | Postgres sorts by enum declaration order, SQLite alphabetically; both give the wrong order | Ranking in `@slj/domain` |
| 7 | `createMany` in `prisma/seed.ts` and `task-service.ts` | 100 bound parameters per D1 statement | Chunked inserts inside one batch |
| 8 | `@default(cuid())` | Generated by Prisma client | `crypto.randomUUID()` in repositories |
| 9 | `@updatedAt` | Prisma-side magic | Set explicitly in repositories |
| 10 | `prisma db push` with no migrations | No history, no rollback | SQL migration files (ADR-0004) |
| 11 | `User.passwordHash` | Passwords are no longer stored | Column removed; auth tables come from Better Auth (ADR-0005) |
| 12 | `SavedPlace` rows written on every search | Unbounded writes against a 100,000 rows/day cap | Shared `place_cache` + explicit user saves only |

## Fitness questions

| Question | Answer |
|---|---|
| (a) All platforms? | Yes; clients talk to the API only. |
| (b) Offline and safe sync? | Server data is authoritative; the client keeps an IndexedDB cache and an idempotent outbox (ADR-0014). |
| (c) Relational fit? | Yes. Tasks, plan versions, housing options and places are per-user tables with shallow joins. |
| (d) Switch cost in 12 months? | M: port the Drizzle schema to `pg-core`, copy data, cut over (15–30 minutes of read-only time). |
| (e) Weak-model reliability? | Yes. SQLite semantics are simple; tests run on the real engine. |
| (f) Free through ~1,000 MAU? | Yes. About 60 MB of data and well under 100,000 row writes per day. |

## Consequences

**Good:** no dev/prod drift; tests need no Docker; 7-day point-in-time recovery on Free (30 days on Paid); zero connection management.

**Bad:** single-writer database; hard 10 GB cap per database on the paid plan; no interactive transactions; 50 queries per invocation on Free shapes how services are written.

**Neutral:** analytics queries do not run on the production database; product analytics goes to PostHog (ADR-0020).

## Reversal cost

**M.** Schema port, data copy script (S-R3-026), rehearsal (S-R3-027), cutover.

## Flip triggers (move production to Postgres when any one is true)

1. `slj-prod` exceeds 7 GB, or its 90-day growth projection crosses 9 GB.
2. Rows written exceed 40 million in a month for two consecutive months.
3. p95 of a single D1 query stays above 150 ms for seven days after index review.
4. A shipped feature needs vector search, geospatial indexes or multi-row interactive transactions.
5. We leave Cloudflare for hosting (ADR-0009 flip).

Flip to Turso (option D) instead if only the hosting changes and none of triggers 1–4 is true.

## References

- Spec §14, §23; vision §39.
- `00_PROGRESS_LOG.md` §3.1 (D1 limits, pricing, batch semantics, Time Travel).
- `legacy/prototype/prisma/schema.prisma`, `legacy/prototype/prisma/seed.ts`.
