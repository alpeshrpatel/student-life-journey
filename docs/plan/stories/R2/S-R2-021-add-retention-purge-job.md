# S-R2-021 — Add retention purge job

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Privacy and Trust |
| Type | feature |
| Size | S (≤2 h) |
| Priority | P1 |
| Depends on | S-R1-015, S-R1-095 |
| Blocks | S-R2-027 |
| Executor tier | Tier-2 — scheduled deletes with limits per run |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-020, S-R2-022 to S-R2-062 |

## 1. Why
The privacy notice promises retention periods. A daily job makes them true (`06_DATA_AND_AUTH.md` §8 retention table).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §8 (retention table — binding values).
- **Files to read first:** `apps/api/src/cron/scheduled.ts` (`runDailyMaintenance` and its existing steps), `apps/api/src/infra/db/schema/*.ts`.
- **Files to create:** `apps/api/src/cron/retention.ts`, `apps/api/test/retention.test.ts`, `docs/runbooks/retention.md`.
- **Files to modify:** `apps/api/src/cron/scheduled.ts` (call `runRetention`), `docs/runbooks/README.md`.
- **Files you must NOT touch:** table definitions.
- Env vars: none.

## 3. Design notes
```ts
export interface RetentionRule { name: string; table: string; sql: (now: number) => { text: string; params: unknown[] } }
export const RETENTION_RULES: readonly RetentionRule[];
export async function runRetention(container: Container, now: number): Promise<{ name: string; deleted: number }[]>;
```

- Rules (one `DELETE … WHERE rowid IN (SELECT rowid FROM … WHERE <condition> LIMIT 500)` each, so that a run stays small; the next day continues):

| Rule | Condition |
|---|---|
| `messages_90d` | `message.created_at < now − 90 days` |
| `ai_call_30d` | `ai_call.created_at < now − 30 days` (moves here from the step added in S-R1-041) |
| `outbox_done_7d` | `outbox_event.status = 'DONE' AND processed_at < now − 7 days` (moves here from S-R1-015) |
| `outbox_failed_30d` | `status = 'FAILED' AND created_at < now − 30 days` |
| `idempotency_24h` | `idempotency_key.created_at < now − 24 hours` (moves here from S-R1-016) |
| `usage_counter_35d` | daily periods older than 35 days; monthly periods older than 13 months (moves here from S-R1-023) |
| `cache_expired` | `place_cache.expires_at < now`, `geocode_cache.expires_at < now` |
| `sessions_expired` | `session.expires_at < now` (Better Auth table; column name as generated) |
| `notifications_90d` | `notification.created_at < now − 90 days` (rule is registered only if the table exists — add it in S-R2-033 if that story lands later) |
| `audit_12m` | `audit_log.created_at < now − 12 months` (same note, S-R2-022) |

- All rules run in **one** `db.batch` (≤ 12 statements) → one database call; the result's `meta.changes` per statement is logged as `{ msg: "retention", rule, deleted }`.
- Empty conversations (no messages left) keep their row and summary; the summary is cleared when its newest message is older than 90 days (`UPDATE conversation SET summary = NULL … WHERE NOT EXISTS (SELECT 1 FROM message …)`).
- **Inactive accounts (24 months):** not implemented in this story. The product is younger than 24 months; record in `docs/runbooks/retention.md` that the rule must be built before the first account reaches 23 months of inactivity (date = production launch + 23 months) and add that date to the board's "Later" list. (An email warning needs S-R2-031 and a careful design; building it now is premature.)
- `docs/runbooks/retention.md`: the table above, how to check the last run (log query), how to run it by hand (`curl` the local `__scheduled` endpoint; in production wait for 03:00 UTC), and the inactive-account note.
- Edge cases: a table that does not exist yet → the rule is skipped by a feature check at registration, never by catching SQL errors; more than 500 rows due → the rest waits for the next run.

## 4. Steps
1. Move existing cleanup steps into `RETENTION_RULES`; add the new ones.
2. Tests with a fixed clock: one row inside and one outside each window.
3. Runbook.
4. Commit: `feat(api): add retention purge job (S-R2-021)`.

## 5. Acceptance criteria
- AC1: Given a message 91 days old and one 89 days old, when the daily cron runs, then only the first is deleted.
- AC2: Given each rule, then a row just outside its window is deleted and a row just inside is kept (table-driven test).
- AC3: Given 1,200 expired cache rows, then one run deletes 500 and the next run 500 more.
- AC4: Given the run, then it makes one database call for all rules and logs one line per rule.
- AC5 (negative): Given user-owned core data (tasks, housing options, saved places, profile), then no rule ever deletes it.

## 6. Tests to write
`apps/api/test/retention.test.ts`: AC1–AC5.

## 7. Verification commands
```bash
pnpm --filter @slj/api test    # expected: pass
pnpm typecheck && pnpm lint    # expected: exit 0
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID
- [ ] Docs/ADR/.env.example updated if relevant (runbook)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- A rule's `DELETE` would scan a table without an index on its date column and the table is large: add the index in a migration within this story (`message(created_at)` already has a composite index; check `EXPLAIN QUERY PLAN` locally).

## 10. Rollback / undo note
`git revert`; deleted rows are gone (by design).

## 11. Out of scope
Inactive-account deletion (recorded as a dated follow-up); PostHog and Sentry retention (project settings).
