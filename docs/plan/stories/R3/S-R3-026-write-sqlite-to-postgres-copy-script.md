# S-R3-026 — Write SQLite to Postgres copy script

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R3 |
| Epic | Operations |
| Type | infra |
| Size | M (≤half day) |
| Priority | P2 |
| Depends on | S-R2-025 |
| Blocks | S-R3-027 |
| Executor tier | Tier-3 — type mapping between two engines and a verification that must be trustworthy |
| Platforms | backend |
| Parallel-safe with | every R3 story |

## 1. Why
ADR-0003 chose SQLite (D1) with numeric triggers for moving to Postgres. The exit is only real if the data can be copied and verified. This story writes the copy and verification tooling so that S-R3-027 can rehearse it (R3 exit criterion 6). It does **not** switch the application to Postgres.

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §3 (type mapping table) and §9 (migration runbook — the outline this script implements, including the table order and the skip list); `docs/plan/adr/ADR-0003-data-model-and-database-per-environment.md` (triggers; "Postgres mapping later" column); `docs/plan/stories/R2/S-R2-025-*.md` (the encrypted export this script can read after decryption).
- **Files to read first:** `apps/api/src/infra/db/schema/*.ts` (every table), `apps/api/migrations/` (latest state), `apps/api/drizzle.config.ts`.
- **Files to create:** `apps/api/scripts/pg/table-map.ts` (the per-table column mapping), `apps/api/scripts/pg/transform.ts` (+ test), `apps/api/scripts/pg/copy-sqlite-to-pg.ts`, `apps/api/scripts/pg/verify-copy.ts` (+ test), `apps/api/scripts/pg/schema.sql` (generated Postgres DDL, committed), `apps/api/scripts/pg/README.md`.
- **Files to modify:** `apps/api/package.json` (dev dependencies `postgres` (the `postgres.js` client) and `better-sqlite3`; scripts `pg:copy`, `pg:verify`), `apps/api/test/schema-coverage.test.ts` (new meta-test, below).
- **Files you must NOT touch:** runtime code under `apps/api/src/` — nothing here changes what the Worker does.
- Env vars (local shell only): `PG_URL` (target), `SQLITE_FILE` (a local SQLite file restored from the export).

## 3. Design notes
- Input: a local SQLite file. The operator creates it from the production export (`wrangler d1 export slj-prod --remote --output export.sql`, then `sqlite3 copy.db < export.sql`) or from the decrypted weekly backup. The script never connects to D1 itself — it is a plain Node script, runnable offline.
- `table-map.ts` is the single source of truth:

```ts
export type ColumnKind = "text" | "integer" | "bigint" | "real" | "boolean01" | "epoch_ms" | "json_text" | "date_text";
export interface TableMap { name: string; primaryKey: string[]; columns: Record<string, ColumnKind>; dependsOn: string[]; }
export const COPY_TABLES: readonly TableMap[];      // in dependency order, per 06 §9
export const SKIP_TABLES: readonly string[];        // place_cache, geocode_cache, ai_cache, kv_cache, idempotency_key, outbox_event, ai_call
```

  Every table in `infra/db/schema/` must appear in exactly one of the two lists; the meta-test `schema-coverage.test.ts` reads the Drizzle schema and fails when a table or column is missing from the map — so a later story that adds a table cannot forget it. Tables added in R2 and R3 (`feedback`, `waitlist_entry`, `lifecycle_email`, `experiment_exposure`, `referral_code`, `referral_attribution`, `push_subscription`, `notification`, `audit_log`) are in `COPY_TABLES`.
- Transform (pure, `transform.ts`): `epoch_ms` → ISO timestamp string for `timestamptz`; `boolean01` → boolean (anything other than 0, 1 or null → error naming table, column and primary key); `json_text` → parsed and re-serialised for `jsonb` (invalid JSON → error); `date_text` (`YYYY-MM-DD`) → `date`; money columns stay `bigint` minor units — never floats; text is copied byte for byte.
- `schema.sql`: Postgres DDL written by hand from `table-map.ts` and the Drizzle schema — same table and column names, primary keys, unique constraints and foreign keys with the same cascade rules; foreign keys are created **after** the copy (`ALTER TABLE … ADD CONSTRAINT`) so that order problems surface as verification failures, not half-loaded tables. (Porting the Drizzle schema to `pg-core` for the application is runbook step 2 in `06` §9 and is **not** part of this story.)
- Copy: for each table in order — read 500 rows at a time by primary-key order, transform, insert with one multi-row `INSERT` inside a transaction per table; `outbox_event` must be empty of `PENDING` rows or the script refuses to start (the application must be quiesced first). Idempotent restart: `--truncate` empties the target tables first; without it the script refuses to write into non-empty tables.
- Verify (`verify-copy.ts`), per copied table — all three must match:
  1. row count;
  2. a content checksum: for each row, a canonical string of its values in column order (after the same normalisation on both sides: timestamps as epoch ms, booleans as 0/1, JSON re-serialised with sorted keys), hashed with SHA-256; the table checksum is the SHA-256 of the sorted row hashes;
  3. foreign-key integrity on the Postgres side (no orphans — guaranteed by the constraints having been added successfully).
  Plus spot queries from `06` §9: users count, tasks per status, the newest `created_at` per table. Output: a table printed to the terminal and `pg-verify-report.json`; exit code 1 on any mismatch.
- Personal data: the SQLite file and the Postgres target contain production data — the README states: work on an encrypted disk, delete `copy.db` and drop the rehearsal database afterwards, never commit either, never use a shared database.
- Performance target for planning: 100,000 task rows copy in under two minutes on a laptop.

## 4. Steps
1. `table-map.ts` and the coverage meta-test.
2. `transform.ts` with tests (every kind, every error).
3. `schema.sql`; copy script; verify script with tests against two local databases (SQLite in a temp file; Postgres through a Docker container in a **local-only** test marked `skip` in CI, plus a pure unit test of the checksum logic that runs everywhere).
4. README with the exact command sequence.
5. Commit: `chore(api): write sqlite to postgres copy script (S-R3-026)`.

## 5. Acceptance criteria
- AC1: Given the seeded demo database exported to a local SQLite file, when `pnpm --filter @slj/api pg:copy` and `pg:verify` run against an empty Postgres, then every table matches on count and checksum and the exit code is 0.
- AC2: Given one value changed by hand in Postgres after the copy, then `pg:verify` exits 1 and names the table.
- AC3: Given a new table added to the Drizzle schema without a map entry, then the coverage meta-test fails naming it.
- AC4 (negative): Given a boolean column containing 2, or a JSON column with invalid JSON, then the copy stops with an error naming table, column and key — nothing is silently coerced.
- AC5 (negative): Given a non-empty target without `--truncate`, then the script refuses to run.
- AC6 (negative): Given `PENDING` rows in `outbox_event`, then the script refuses to start.
- AC7 (negative): Given the repository after the story, then `apps/api/src/` is unchanged and the Worker bundle does not include `postgres` or `better-sqlite3`.

## 6. Tests to write
`transform.test.ts`; checksum unit test; `schema-coverage.test.ts`; the local-only end-to-end test for AC1 and AC2.

## 7. Verification commands
```bash
pnpm --filter @slj/api test                          # expected: pass (including schema coverage)
pnpm typecheck && pnpm lint                          # expected: exit 0
pnpm --filter @slj/api build && pnpm size            # expected: API bundle unchanged
git diff --stat main -- apps/api/src | tail -1       # expected: no changes
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated (terminal output of a local run in the PR)
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (script README; `06` §9 points at the script path via the board if it differs)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- You are about to make the application talk to Postgres, add Hyperdrive bindings, or port repositories: stop — that work happens only when an ADR-0003 trigger fires.
- A column's kind is unclear (is this integer a timestamp or a count?): stop and read the schema comment or ask; a wrong guess corrupts data silently.

## 10. Rollback / undo note
`git revert`; nothing in production is affected.

## 11. Out of scope
The rehearsal (`S-R3-027`); dual writes; zero-downtime cut-over design.
