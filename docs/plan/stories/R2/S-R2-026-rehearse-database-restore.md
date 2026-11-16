# S-R2-026 — Rehearse database restore

**Status:** TODO   <!-- TODO / IN PROGRESS / DONE / BLOCKED. The executor updates this line and docs/BOARD.md. -->

| Field | Value |
|---|---|
| Release | R2 |
| Epic | Operations |
| Type | chore |
| Size | S (≤2 h) |
| Priority | P0 |
| Depends on | S-R2-025 |
| Blocks | S-R2-062 |
| Executor tier | HUMAN — needs the private backup key and production read access |
| Platforms | backend |
| Parallel-safe with | S-R2-001 to S-R2-024, S-R2-027 to S-R2-061 |

## 1. Why
A backup that has never been restored is a hope, not a backup. The rehearsal also measures how long recovery takes (target: under two hours).

## 2. Context pack
- Relevant docs: `docs/plan/06_DATA_AND_AUTH.md` §8 (restore procedure), §9 (verification queries); `docs/runbooks/restore.md` (skeleton from S-R2-025); `docs/runbooks/deploy-and-rollback.md`.
- **Files to create:** `docs/runbooks/release-checks/restore-rehearsal-<date>.md`.
- **Files to modify:** `docs/runbooks/restore.md` (replace the skeleton with the commands that worked, their real output and timings), `docs/BOARD.md`.
- **Files you must NOT touch:** the production database (read-only in this rehearsal).

## 3. Design notes
- Rehearse **both** layers against a scratch database, never against `slj-prod`:
  - **Layer 3 (export file):** (1) download the latest artifact and decrypt it; (2) `wrangler d1 create slj-restore-test`; (3) `wrangler d1 execute slj-restore-test --remote --file=slj-prod.sql`; (4) run the verification queries below on both `slj-prod` and `slj-restore-test` and compare; (5) point a **local** `wrangler dev --remote` (or a temporary preview environment binding) at `slj-restore-test`, sign in is not needed — call `GET /api/v1/health` and inspect a few tables with `wrangler d1 execute`; (6) `wrangler d1 delete slj-restore-test`; (7) delete the local plaintext dump securely.
  - **Layer 2 (Time Travel):** on `slj-preview` only — repeat the marker-row exercise from S-R0-042 and confirm the documented command still works with the current Wrangler version.
- Verification queries (record results): row counts for `user`, `relocation_profile`, `task`, `plan`, `housing_option`, `saved_place`, `message`; `max(created_at)` of `task` (how old is the backup?); `PRAGMA foreign_key_check` returns no rows; the list of applied migrations (`select name from d1_migrations order by id`) equals production's.
- Record: start and end time of each step, total time, Wrangler version, anything surprising (import errors, statement size limits, ordering problems with foreign keys).
- If the import fails because of statement order or size, document the fix (for example splitting the file) in `restore.md` — that is the value of the rehearsal.
- Write the "repoint production" step in the runbook as text only (change `database_id` for the production binding in `wrangler.jsonc`, deploy); do not perform it.
- Schedule: repeat the rehearsal every six months; put the next date on the board.

## 4. Steps
1. Layer 3 rehearsal with timing.
2. Layer 2 rehearsal on preview.
3. Rewrite `restore.md` from what actually worked; write the dated evidence file.
4. Clean up (scratch database deleted, plaintext removed); board updated with the next rehearsal date.
5. Commit: `docs(repo): rehearse database restore (S-R2-026)`.

## 5. Acceptance criteria
- AC1: Given the evidence file, then it shows matching row counts between production and the restored copy (differences explained by the backup's age) and the total time.
- AC2: Given `restore.md`, then every command in it was run during the rehearsal and its output is shown (IDs redacted).
- AC3 (negative): Given `wrangler d1 list` after the rehearsal, then `slj-restore-test` no longer exists.
- AC4 (negative): Given the rehearsal, then no write was made to `slj-prod` (the evidence file states the commands run against it — all `SELECT`).
- AC5: Given the board, then the next rehearsal date is recorded.

## 6. Tests to write
N/A — manual rehearsal.

## 7. Verification commands
```bash
pnpm --filter @slj/api exec wrangler d1 list | grep -c slj-restore-test   # expected: 0
test -f docs/runbooks/restore.md && grep -c "time-travel" docs/runbooks/restore.md   # expected: 1 or more
```

## 8. Definition of Done checklist
- [ ] Typecheck, lint, tests pass (N/A)
- [ ] Acceptance criteria demonstrated
- [ ] No new `any`, no TODO without a linked story ID (N/A)
- [ ] Docs/ADR/.env.example updated if relevant (runbook, evidence, board)
- [ ] Safety rules (spec §23) not violated

## 9. Stop conditions
- The dump cannot be imported at all: R2 is not done; record a blocker and decide (table-by-table export, or move to rung 1 with a paid plan's longer Time Travel as the main protection).
- The total time exceeds two hours: record it and adjust the target in `06` §8 through a note on the board.

## 10. Rollback / undo note
Delete the scratch database.

## 11. Out of scope
The Postgres migration rehearsal (`S-R3-027`).
